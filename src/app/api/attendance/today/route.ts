import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/lib/models/Attendance";
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Get user from cookie
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const employee = await Employee.findOne({ email: user.email });
    if (!employee) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });

    // Get today's date in YYYY-MM-DD
    const dateStr = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({ employeeId: employee._id, date: dateStr }).lean();

    return NextResponse.json({ success: true, data: attendance });

  } catch (error) {
    console.error("Today Attendance Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
