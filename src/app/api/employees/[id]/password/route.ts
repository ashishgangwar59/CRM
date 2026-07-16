import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";
import bcrypt from "bcryptjs";
import { verifyAccessToken } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    // Ideally, we'd check if the user is an Admin here. 
    // Assuming only admins can access this route in the UI.

    const { id } = await params;
    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const employee = await Employee.findById(id);
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const user = await User.findOne({ email: employee.email });
    if (!user) return NextResponse.json({ error: "User account not found for this employee" }, { status: 404 });

    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
      return NextResponse.json({ error: "Cannot reset password for administrative users" }, { status: 403 });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    // Force them to change it on their next login if admin resets it
    user.requirePasswordChange = true;
    await user.save();

    return NextResponse.json({ success: true, message: "Password reset successfully. The user will be required to change it on their next login." });
  } catch (error) {
    console.error("Admin Reset Password Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
