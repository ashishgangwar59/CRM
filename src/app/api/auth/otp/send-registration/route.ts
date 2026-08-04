import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Otp } from "@/lib/models/Otp";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";
import { Investor } from "@/lib/models/Investor";
import { notificationService } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { phone, email } = await req.json();

    if (!phone || !email) {
      return NextResponse.json({ error: "Email and Phone number are required" }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if Email already exists in User/Employee/Investor
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
    }

    // 2. Check if Phone already exists in Employee/Investor
    const existingEmployee = await Employee.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: cleanPhone.replace(/^\+91/, "").trim() },
        { phone: "+91" + cleanPhone.replace(/^\+91/, "").trim() }
      ]
    });
    if (existingEmployee) {
      return NextResponse.json({ error: "Phone number is already associated with an account" }, { status: 400 });
    }

    const existingInvestor = await Investor.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: cleanPhone.replace(/^\+91/, "").trim() },
        { phone: "+91" + cleanPhone.replace(/^\+91/, "").trim() }
      ]
    });
    if (existingInvestor) {
      return NextResponse.json({ error: "Phone number is already associated with an account" }, { status: 400 });
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
      console.log(`[DEV MODE] Fixed Registration OTP for ${cleanPhone}: 123456`);
    } else {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save/Update OTP
    await Otp.findOneAndUpdate(
      { phone: cleanPhone },
      { otp: otpCode, expiresAt },
      { upsert: true, new: true }
    );

    // Send live SMS only in production
    if (!isDev) {
      const smsMessage = `Your CRM verification code is ${otpCode}. Valid for 5 minutes.`;
      await notificationService.sendSMS(cleanPhone, smsMessage, otpCode);
    }

    return NextResponse.json({
      success: true,
      message: isDev ? "[DEV] OTP is 123456 (fixed dev code)" : "Verification OTP sent successfully",
      debugOtp: isDev ? otpCode : undefined
    });
  } catch (error) {
    console.error("Send Registration OTP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
