import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/lib/models/Attendance";
import { verifyAccessToken } from "@/lib/auth";

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

    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get("month"); // e.g., "2026-07"
    
    if (!yearMonth) {
      return NextResponse.json({ error: "Month parameter is required (YYYY-MM)" }, { status: 400 });
    }

    // Find attendance records starting with this month for this user
    const records = await Attendance.find({
      employeeId: payload.userId,
      date: { $regex: `^${yearMonth}` }
    }).sort({ date: 1 }).lean();

    return NextResponse.json({ success: true, data: records });

  } catch (error) {
    console.error("Monthly Attendance Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
