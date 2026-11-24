import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { evaluateSession, findSession, getKycConfig, kycErrorResponse, publicView, addLog } from "@/lib/kyc/service";

export const dynamic = "force-dynamic";

/**
 * Start / resume a KYC verification session.
 * Body: { token?: string, reset?: boolean, consent?: boolean }
 * Returns { enabled: false } when KYC is switched off in Settings.
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const config = await getKycConfig();
    if (!config.enabled) return NextResponse.json({ success: true, enabled: false });

    const body = await req.json().catch(() => ({}));
    const session = await findSession(req, body.token, { create: true });

    if (body.reset) {
      session.aadhaar = { status: "Pending", otpSends: 0, otpAttempts: 0 } as any;
      session.pan = { status: "Pending", attempts: 0 } as any;
      session.documents = { aadhaar: { status: "Pending", attempts: 0 }, pan: { status: "Pending", attempts: 0 } } as any;
      session.nameMatchScore = undefined;
      session.overallStatus = "In Progress";
      addLog(session, "reset", "ok");
    }

    if (body.consent === true && !session.consentAt) {
      session.consentAt = new Date();
      addLog(session, "consent", "given");
    }

    evaluateSession(session, config);
    await session.save();
    return NextResponse.json({ success: true, enabled: true, data: publicView(session, config) });
  } catch (e) {
    const { body, status } = kycErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
