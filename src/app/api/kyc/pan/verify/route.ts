import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  KYC_LIMITS, plainPath, addLog, evaluateSession, findSession, getKycConfig, getProvider, isValidPan, kycErrorResponse, publicView,
} from "@/lib/kyc/service";
import { KycUserError } from "@/lib/kyc/types";

export const dynamic = "force-dynamic";

/** Body: { token?, panNumber } – checks the PAN against the Income Tax database. */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const config = await getKycConfig();
    if (!config.enabled) throw new KycUserError("KYC verification is not enabled.", 400);

    const body = await req.json().catch(() => ({}));
    const panNumber = String(body.panNumber || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const session = await findSession(req, body.token);

    if (session.aadhaar?.status !== "Verified") {
      throw new KycUserError("Please verify your Aadhaar first.");
    }
    if (!isValidPan(panNumber)) throw new KycUserError("Please enter a valid 10-character PAN (e.g. ABCDE1234F).");
    if (session.pan?.status === "Verified" && session.pan.number === panNumber) {
      return NextResponse.json({ success: true, data: publicView(session, config) });
    }
    if ((session.pan?.attempts || 0) >= KYC_LIMITS.panAttempts) {
      throw new KycUserError("PAN verification limit reached for this session. Please contact support.", 429);
    }

    const attempts = (session.pan?.attempts || 0) + 1;
    const provider = getProvider(config);

    let message = "PAN verified successfully.";
    try {
      const result = await provider.verifyPan(panNumber, { expectedName: session.aadhaar.name });
      if (!result.valid) {
        session.pan = { status: "Failed", number: panNumber, attempts, error: "This PAN is not valid as per Income Tax records." } as any;
        addLog(session, "pan.verify", "invalid", panNumber);
      } else {
        session.pan = {
          status: "Verified",
          number: panNumber,
          name: (result.name || "").trim(),
          dob: result.dob,
          aadhaarLinked: result.aadhaarLinked ?? null,
          attempts,
          verifiedAt: new Date(),
          error: "",
        } as any;
        addLog(session, "pan.verify", "verified", panNumber);
      }
    } catch (e: any) {
      session.pan = { ...plainPath(session, "pan"), attempts, error: e.message };
      addLog(session, "pan.verify", "failed", e.message);
      session.markModified("pan");
      await session.save();
      throw e;
    }

    // A changed PAN invalidates a previously matched PAN document.
    if (session.documents?.pan?.status === "Matched") {
      session.documents.pan = { ...plainPath(session, "documents.pan"), status: "Pending" };
    }

    evaluateSession(session, config);
    if (session.pan.status === "Verified" && (session.nameMatchScore ?? 0) < config.nameMatchThreshold) {
      session.pan.error = `Name on PAN (${session.pan.name}) does not match name on Aadhaar (${session.aadhaar.name}).`;
      message = session.pan.error;
    }
    session.markModified("pan");
    session.markModified("documents");
    await session.save();

    if (session.pan.status !== "Verified") {
      return NextResponse.json({ success: false, error: session.pan.error, data: publicView(session, config) }, { status: 400 });
    }
    if (session.overallStatus === "Failed") {
      return NextResponse.json({ success: false, error: message, data: publicView(session, config) }, { status: 400 });
    }
    return NextResponse.json({ success: true, message, data: publicView(session, config) });
  } catch (e) {
    const { body, status } = kycErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
