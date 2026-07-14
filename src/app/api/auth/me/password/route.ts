import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken, comparePassword } from "@/lib/auth";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Both old and new passwords are required" }, { status: 400 });
    }

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isMatch = await comparePassword(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect old password" }, { status: 400 });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.requirePasswordChange = false;
    await user.save();

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change Password Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
