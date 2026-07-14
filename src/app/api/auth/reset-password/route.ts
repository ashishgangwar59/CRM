import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Session } from "@/lib/models/Session";
import { AuditLog } from "@/lib/models/AuditLog";
import { hashPassword } from "@/lib/auth";
import jwt from "jsonwebtoken";

const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || "super-secret-reset-key";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_RESET_SECRET) as { userId: string };
    } catch (e) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const user = await User.findById(payload.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await hashPassword(newPassword);

    user.password = hashedPassword;
    user.lastPasswordChange = new Date();
    user.requirePasswordChange = false;
    await user.save();

    await Session.deleteMany({ userId: user._id });

    await AuditLog.create({
      action: "PASSWORD_CHANGED",
      userId: user._id,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      details: "Password was reset via token",
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
