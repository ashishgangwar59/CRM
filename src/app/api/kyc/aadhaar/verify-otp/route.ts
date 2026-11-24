import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  KYC_LIMITS, plainPath, addLog, evaluateSession, findSession, getKycConfig, getProvider, kycErrorResponse, publicView,
} from "@/lib/kyc/service";
import { KycUserError } from "@/lib/kyc/types";

export const dynamic = "force-dynamic";

/** Body: { token?, otp, applicantName? } – verifies the Aadhaar OTP and stores the official details. */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const config = await getKycConfig();
    if (!config.enabled) throw new KycUserError("KYC verification is not enabled.", 400);

    const body = await req.json().catch(() => ({}));
    const otp = String(body.otp || "").replace(/\D/g, "");
    const session = await findSession(req, body.token);

    if (session.aadhaar?.status !== "OtpSent" || !session.aadhaar.providerRef) {
      throw new KycUserError("Please request an OTP first.");
    }
    if (!/^\d{6}$/.test(otp)) throw new KycUserError("Enter the 6-digit OTP.");
    if ((session.aadhaar.otpAttempts || 0) >= KYC_LIMITS.otpAttempts) {
      throw new KycUserError("Too many wrong OTP attempts. Please request a new OTP.", 429);
    }

    session.aadhaar.otpAttempts = (session.aadhaar.otpAttempts || 0) + 1;
    const provider = getProvider(config);

    try {
      const details = await provider.verifyAadhaarOtp(session.aadhaar.providerRef, otp, {
        expectedName: body.applicantName,
      });
      if (!details.name) throw new KycUserError("Aadhaar details could not be fetched. Please try again.");
      if (details.last4 && details.last4 !== session.aadhaar.last4) {
        throw new KycUserError("Aadhaar response did not match the number entered. Please start again.");
      }

      session.aadhaar = {
        ...plainPath(session, "aadhaar"),
        status: "Verified",
        providerRef: undefined, // one-time reference, no longer needed
        name: details.name.trim(),
        dob: details.dob,
        gender: details.gender,
        address: details.address,
        city: details.city,
        state: details.state,
        pinCode: details.pinCode,
        careOf: details.careOf,
        verifiedAt: new Date(),
        error: "",
      };
      addLog(session, "aadhaar.verify-otp", "verified");
    } catch (e: any) {
      session.aadhaar.error = e.message;
      addLog(session, "aadhaar.verify-otp", "failed", e.message);
      session.markModified("aadhaar");
      await session.save();
      throw e;
    }

    evaluateSession(session, config);
    session.markModified("aadhaar");
    await session.save();
    return NextResponse.json({ success: true, message: "Aadhaar verified successfully.", data: publicView(session, config) });
  } catch (e) {
    const { body, status } = kycErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
