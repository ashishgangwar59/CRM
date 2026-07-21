import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/lib/models/Attendance";
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";

function getToken(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/accessToken=([^;]+)/);
    if (match) return match[1];
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) return authHeader.substring(7).trim();
    return authHeader.trim();
  }
  return null;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Get user from cookie or Authorization header
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const employee = await Employee.findOne({ email: { $regex: `^${user.email}$`, $options: "i" } });
    if (!employee) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get("month"); // e.g., "2026-07"
    
    if (!yearMonth) {
      return NextResponse.json({ error: "Month parameter is required (YYYY-MM)" }, { status: 400 });
    }

    // Find attendance records starting with this month for this user
    const records = await Attendance.find({
      employeeId: employee._id,
      date: { $regex: `^${yearMonth}` }
    }).sort({ date: 1 }).lean();

    return NextResponse.json({ success: true, data: records });

  } catch (error) {
    console.error("Monthly Attendance Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
