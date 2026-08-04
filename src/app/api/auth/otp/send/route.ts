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

    // Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Save/Update OTP in DB
    await Otp.findOneAndUpdate(
      { phone: cleanPhone },
      { otp: otpCode, expiresAt },
      { upsert: true, new: true }
    );

    // Send SMS via service
    const smsMessage = `Your CRM login OTP is ${otpCode}. Valid for 5 minutes.`;
    await notificationService.sendSMS(cleanPhone, smsMessage, otpCode);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      // Include debugOtp in development/testing environments to ease verification
      debugOtp: process.env.NODE_ENV !== "production" ? otpCode : undefined
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
