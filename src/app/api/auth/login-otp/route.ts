import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Otp } from "@/lib/models/Otp";
import { Employee } from "@/lib/models/Employee";
import { Investor } from "@/lib/models/Investor";
import { User } from "@/lib/models/User";
import { Session } from "@/lib/models/Session";
import { LoginHistory } from "@/lib/models/LoginHistory";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { phone, otp, rememberMe, deviceInfo } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "Mobile number and OTP are required" }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Try verifying with Twilio Verify first
    let verified = false;
    let verifyUsed = false;

    const verifyCheck = await notificationService.checkVerificationOTP(cleanPhone, otp);
    if (verifyCheck.verifyServiceUsed) {
      verifyUsed = true;
      verified = verifyCheck.approved;
    }

    if (verifyUsed) {
      if (!verified) {
        return NextResponse.json({ error: "Incorrect OTP code. Please try again." }, { status: 401 });
      }
    } else {
      // 1. Verify OTP from DB (Local fallback)
      const otpRecord = await Otp.findOne({ phone: cleanPhone });
      if (!otpRecord) {
        return NextResponse.json({ error: "Invalid OTP or request expired" }, { status: 401 });
      }

      // In production, we enforce exact match. For development, we allow '123456' as a universal testing bypass code
      const isMockBypass = process.env.NODE_ENV !== "production" && otp === "123456";
      if (otpRecord.otp !== otp && !isMockBypass) {
        return NextResponse.json({ error: "Incorrect OTP code. Please try again." }, { status: 401 });
      }

      // Delete OTP once used
      await Otp.deleteOne({ _id: otpRecord._id });
    }

    // 2. Identify account
    let userEmail = "";
    let firstName = "";
    let lastName = "";

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
      firstName = employee.firstName;
      lastName = employee.lastName;
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
        // Split investor fullName to firstName & lastName
        const parts = (investor.fullName || "").trim().split(" ");
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      }
    }

    if (!userEmail) {
      return NextResponse.json({ error: "No user account linked to this mobile number" }, { status: 401 });
    }

    // Find user record
    const user = await User.findOne({ email: userEmail.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ error: "Linked user account not found" }, { status: 401 });
    }

    // 3. Complete authentication & create session
    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });

    const expiresInDays = rememberMe ? 7 : 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await Session.create({
      userId: user._id,
      refreshToken,
      deviceInfo: deviceInfo || "Unknown Device",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      expiresAt,
    });

    await LoginHistory.create({
      userId: user._id,
      status: "SUCCESS",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    await logAudit(req, user._id.toString(), "Login", "Auth", "User logged in successfully via OTP");

    const response = NextResponse.json({
      success: true,
      role: user.role,
      token: accessToken,
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: firstName || (user as any).firstName || "",
        lastName: lastName || (user as any).lastName || "",
      },
    });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresInDays * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login OTP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
