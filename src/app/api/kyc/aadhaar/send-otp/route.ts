import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  KYC_LIMITS, plainPath, addLog, evaluateSession, findSession, getKycConfig, getProvider,
  hashAadhaar, isValidAadhaar, kycErrorResponse, publicView,
} from "@/lib/kyc/service";
import { KycUserError } from "@/lib/kyc/types";

export const dynamic = "force-dynamic";

/** Body: { token?, aadhaarNumber, consent: true } – sends an OTP to the Aadhaar-linked mobile. */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const config = await getKycConfig();
    if (!config.enabled) throw new KycUserError("KYC verification is not enabled.", 400);

    const body = await req.json().catch(() => ({}));
    const aadhaarNumber = String(body.aadhaarNumber || "").replace(/\D/g, "");
    const session = await findSession(req, body.token);

    if (body.consent !== true && !session.consentAt) {
      throw new KycUserError("Please give consent for Aadhaar based verification.");
    }
    if (!session.consentAt) session.consentAt = new Date();

    if (!isValidAadhaar(aadhaarNumber)) {
      throw new KycUserError("Please enter a valid 12-digit Aadhaar number.");
    }
    if (session.aadhaar?.status === "Verified") {
      throw new KycUserError("Aadhaar is already verified. Use 'Start over' to verify a different Aadhaar.");
    }
    if ((session.aadhaar?.otpSends || 0) >= KYC_LIMITS.otpSends) {
      throw new KycUserError("OTP limit reached for this session. Please contact support.", 429);
    }

    const provider = getProvider(config);
    try {
      const { providerRef } = await provider.generateAadhaarOtp(aadhaarNumber);
      session.aadhaar = {
        ...plainPath(session, "aadhaar"),
        status: "OtpSent",
        last4: aadhaarNumber.slice(-4),
        numberHash: hashAadhaar(aadhaarNumber),
        providerRef,
        otpSends: (session.aadhaar?.otpSends || 0) + 1,
        otpAttempts: 0,
        error: "",
      };
      addLog(session, "aadhaar.send-otp", "ok", `****${aadhaarNumber.slice(-4)}`);
    } catch (e: any) {
      session.aadhaar = { ...plainPath(session, "aadhaar"), otpSends: (session.aadhaar?.otpSends || 0) + 1, error: e.message };
      addLog(session, "aadhaar.send-otp", "failed", e.message);
      await session.save();
      throw e;
    }

    evaluateSession(session, config);
    await session.save();
    return NextResponse.json({
      success: true,
      message: "OTP sent to the mobile number linked with this Aadhaar.",
      data: publicView(session, config),
    });
  } catch (e) {
    const { body, status } = kycErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
