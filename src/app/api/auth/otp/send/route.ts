import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Otp } from "@/lib/models/Otp";
import { Employee } from "@/lib/models/Employee";
import { Investor } from "@/lib/models/Investor";
import { notificationService } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Look up in Employee or Investor to see if a valid account exists
    let userEmail = "";
    const employee = await Employee.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: cleanPhone.replace(/^\+91/, "").trim() },
        { phone: "+91" + cleanPhone.replace(/^\+91/, "").trim() },
        { companyPhone: cleanPhone }
      ]
    });

    if (employee) {
      userEmail = employee.email;
    } else {
      const investor = await Investor.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: cleanPhone.replace(/^\+91/, "").trim() },
          { phone: "+91" + cleanPhone.replace(/^\+91/, "").trim() }
        ]
      });
      if (investor) {
        userEmail = investor.email;
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "No account found with this mobile number. Please register or use password login." },
        { status: 404 }
      );
    }

    // Try sending with Twilio Verify first
    const verifyResult = await notificationService.sendVerificationOTP(cleanPhone);
    if (verifyResult.verifyServiceUsed) {
      if (verifyResult.success) {
        return NextResponse.json({
          success: true,
          message: "Verification OTP sent successfully via Twilio Verify",
          debugOtp: "Sent via Twilio Verify API"
        });
      } else {
        return NextResponse.json({ error: "Failed to send OTP code via Twilio Verify. Please check configuration." }, { status: 500 });
      }
    }

    const isDev = process.env.NODE_ENV !== "production";

    // In development (without Twilio Verify), use a fixed OTP '123456' — no SMS needed
    let otpCode: string;
    if (isDev) {
      otpCode = "123456";
      console.log(`[DEV MODE] Fixed OTP for ${cleanPhone}: 123456`);
    } else {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 10 minutes expiration

    // Save/Update OTP in DB
    await Otp.findOneAndUpdate(
      { phone: cleanPhone },
      { otp: otpCode, expiresAt },
      { upsert: true, new: true }
    );

    // Send live SMS only in production (or if SMS keys are configured in dev)
    if (!isDev) {
      const smsMessage = `Your Niventra verification code is ${otpCode}. It is valid for 10 minutes. Do not share this code with anyone.`;
      await notificationService.sendSMS(cleanPhone, smsMessage, otpCode);
    }

    return NextResponse.json({
      success: true,
      message: isDev ? "[DEV] OTP is 123456 (fixed dev code)" : "OTP sent successfully",
      debugOtp: isDev ? otpCode : undefined
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
