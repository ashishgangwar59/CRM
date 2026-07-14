import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { logAudit } from "@/lib/audit";
import jwt from "jsonwebtoken";

const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || "super-secret-reset-key";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ success: true, message: "If an account exists, a reset link has been sent." });
    }

    const resetToken = jwt.sign({ userId: user._id.toString() }, JWT_RESET_SECRET, { expiresIn: "1h" });

    console.log(`\n\n[MOCK EMAIL SEND]`);
    console.log(`To: ${email}`);
    console.log(`Subject: Password Reset Request`);
    console.log(`Body: Please reset your password using the following link: http://localhost:3000/reset-password?token=${resetToken}\n\n`);

    await logAudit(
      req,
      user._id.toString(),
      "PASSWORD_RESET_REQUEST",
      "Auth",
      `Password reset requested for email: ${email}`,
      null,
      { email }
    );

    return NextResponse.json({ success: true, message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
