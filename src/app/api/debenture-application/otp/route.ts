import { createHash, randomInt, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { sendDebentureVerificationEmail } from "@/lib/mail";
import { DebentureContactOtp } from "@/lib/models/DebentureContactOtp";
import { notificationService } from "@/lib/notifications";

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 10 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeTarget(channel: unknown, target: unknown) {
  if (channel === "email" && typeof target === "string") {
    const email = target.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }
  if (channel === "phone" && typeof target === "string") {
    const phone = target.replace(/\D/g, "");
    return phone.length === 10 ? phone : null;
  }
  return null;
}

function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, channel, target, code } = body;
    const normalizedTarget = normalizeTarget(channel, target);

    if (!normalizedTarget) {
      return NextResponse.json(
        { error: channel === "email" ? "Enter a valid email address." : "Enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const key = { channel, target: normalizedTarget };

    if (action === "send") {
      const existing = await DebentureContactOtp.findOne(key);
      if (existing && !existing.verifiedAt && Date.now() - existing.sentAt.getTime() < RESEND_WAIT_MS) {
        return NextResponse.json(
          { error: "Please wait 10 seconds before requesting another verification code." },
          { status: 429 }
        );
      }

      const isDevelopment = process.env.NODE_ENV === "development";
      const now = new Date();
      let otpCode: string | undefined;
      let deliveryMethod: "email" | "sms" | "twilio-verify";

      if (channel === "email") {
        deliveryMethod = "email";
        otpCode = randomInt(100000, 1000000).toString();
        const emailSent = await sendDebentureVerificationEmail(normalizedTarget, otpCode);
        if (!emailSent && !isDevelopment) {
          return NextResponse.json(
            { error: "Email verification is unavailable because SMTP is not configured." },
            { status: 503 }
          );
        }
        if (!emailSent) {
          console.info(`[DEV MODE] Debenture email OTP for ${normalizedTarget}: ${otpCode}`);
        }
      } else {
        const verifyResult = await notificationService.sendVerificationOTP(`+91${normalizedTarget}`);
        if (verifyResult.verifyServiceUsed) {
          if (!verifyResult.success) {
            return NextResponse.json({ error: "Failed to send the mobile verification code." }, { status: 502 });
          }
          deliveryMethod = "twilio-verify";
        } else {
          deliveryMethod = "sms";
          otpCode = randomInt(100000, 1000000).toString();
          if (!isDevelopment) {
            const sent = await notificationService.sendSMS(
              `+91${normalizedTarget}`,
              `Your Niventra verification code is ${otpCode}. It is valid for 10 minutes. Do not share this code.`,
              otpCode,
              true
            );
            if (!sent) {
              return NextResponse.json({ error: "Failed to send the mobile verification code." }, { status: 502 });
            }
          } else {
            console.info(`[DEV MODE] Debenture mobile OTP for ${normalizedTarget}: ${otpCode}`);
          }
        }
      }

      await DebentureContactOtp.findOneAndUpdate(
        key,
        {
          $set: {
            deliveryMethod,
            otpHash: otpCode ? hashOtp(otpCode) : null,
            expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
            sentAt: now,
            verifiedAt: null,
            attempts: 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({
        success: true,
        message: `Verification code sent to your ${channel}.`,
        debugOtp: isDevelopment && deliveryMethod !== "twilio-verify" ? otpCode : undefined,
      });
    }

    if (action === "verify") {
      if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
      }
      const otpRecord = await DebentureContactOtp.findOne({
        ...key,
        expiresAt: { $gt: new Date() },
      });
      if (!otpRecord) {
        return NextResponse.json({ error: "The verification code has expired. Request a new code." }, { status: 400 });
      }
      if (otpRecord.verifiedAt) {
        return NextResponse.json({ success: true, message: `${channel} is verified.` });
      }
      if (otpRecord.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
      }

      let isVerified = false;
      if (otpRecord.deliveryMethod === "twilio-verify") {
        const verifyResult = await notificationService.checkVerificationOTP(`+91${normalizedTarget}`, code);
        if (verifyResult.apiError || !verifyResult.verifyServiceUsed) {
          return NextResponse.json(
            { error: "Mobile verification is temporarily unavailable. Please try again." },
            { status: 502 }
          );
        }
        isVerified = verifyResult.approved;
      } else if (otpRecord.otpHash) {
        const expectedHash = Buffer.from(otpRecord.otpHash);
        const submittedHash = Buffer.from(hashOtp(code));
        isVerified =
          expectedHash.length === submittedHash.length &&
          timingSafeEqual(expectedHash, submittedHash);
      }

      if (!isVerified) {
        await DebentureContactOtp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
        return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
      }

      await DebentureContactOtp.updateOne(
        { _id: otpRecord._id, verifiedAt: null },
        { $set: { verifiedAt: new Date() } }
      );
      return NextResponse.json({ success: true, message: `${channel} verified successfully.` });
    }

    return NextResponse.json({ error: "Invalid verification action." }, { status: 400 });
  } catch (error) {
    console.error("Debenture contact verification error:", error);
    return NextResponse.json({ error: "Unable to process contact verification." }, { status: 500 });
  }
}
