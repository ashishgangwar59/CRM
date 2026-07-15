import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/lib/models/Attendance";
import { verifyAccessToken } from "@/lib/auth";
import { LeaveBalance } from "@/lib/models/LeaveBalance";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    if (payload.role !== "Super Admin" && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Fetch all attendance records for this date, populating Employee details
    const records = await Attendance.find({ date: dateStr })
      .populate("employeeId", "firstName lastName employeeCode department")
      .sort({ "punchIn.time": -1 })
      .lean();

    return NextResponse.json({ success: true, data: records });

  } catch (error) {
    console.error("Manager Attendance Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();

    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (payload.role !== "Super Admin" && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { attendanceId, status } = await req.json();
    if (!attendanceId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const oldStatus = attendance.status;

    // Refund/deduct balance depending on status transitions
    if (oldStatus === "Half-Day" && status === "Present") {
      // Refund 0.5 Casual leave
      const balanceDoc = await LeaveBalance.findOne({ employeeId: attendance.employeeId });
      if (balanceDoc) {
        balanceDoc.balances.Casual = (balanceDoc.balances.Casual || 0) + 0.5;
        await balanceDoc.save();
      }
    } else if (oldStatus !== "Half-Day" && status === "Half-Day") {
      // Deduct 0.5 Casual leave
      const balanceDoc = await LeaveBalance.findOne({ employeeId: attendance.employeeId });
      if (balanceDoc) {
        balanceDoc.balances.Casual = Math.max(0, (balanceDoc.balances.Casual || 0) - 0.5);
        await balanceDoc.save();
      }
    }

    attendance.status = status;
    await attendance.save();

    return NextResponse.json({ success: true, message: "Attendance status updated successfully", data: attendance });
  } catch (error) {
    console.error("Manager Attendance PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
