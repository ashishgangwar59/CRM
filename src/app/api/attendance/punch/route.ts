import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/lib/models/Attendance";
import { AttendanceSettings } from "@/lib/models/AttendanceSettings";
import { verifyAccessToken } from "@/lib/auth";

// Helper to parse "HH:MM" into minutes since midnight
function timeToMinutes(timeStr: string) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function POST(req: Request) {
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

    const { action, latitude, longitude } = await req.json(); // action = "IN" or "OUT"
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    
    // Get today's date in YYYY-MM-DD
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Get settings
    let settings = await AttendanceSettings.findOne();
    if (!settings) {
      settings = await AttendanceSettings.create({}); // Use defaults
    }

    let attendance = await Attendance.findOne({ employeeId: payload.userId, date: dateStr });

    if (action === "IN") {
      if (attendance?.punchIn) {
        return NextResponse.json({ error: "Already punched in today" }, { status: 400 });
      }

      // Check Late Coming
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const standardStartMinutes = timeToMinutes(settings.standardStartTime);
      const isLate = currentMinutes > (standardStartMinutes + settings.lateThresholdMinutes);

      if (!attendance) {
        attendance = new Attendance({
          employeeId: payload.userId,
          date: dateStr,
          status: "Present",
          metrics: { isLate, isEarlyLeave: false, workingHours: 0, overtimeHours: 0 }
        });
      }

      attendance.punchIn = { time: now, ipAddress, latitude, longitude };
      attendance.metrics.isLate = isLate;
      await attendance.save();

      return NextResponse.json({ success: true, message: "Punched in successfully", data: attendance });
    } 
    
    if (action === "OUT") {
      if (!attendance || !attendance.punchIn) {
        return NextResponse.json({ error: "Cannot punch out without punching in" }, { status: 400 });
      }
      if (attendance.punchOut) {
        return NextResponse.json({ error: "Already punched out today" }, { status: 400 });
      }

      // Calculate working hours
      const diffMs = now.getTime() - attendance.punchIn.time.getTime();
      const workingHours = diffMs / (1000 * 60 * 60);

      // Check Early Leave
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const standardEndMinutes = timeToMinutes(settings.standardEndTime);
      const isEarlyLeave = currentMinutes < (standardEndMinutes - settings.earlyLeaveThresholdMinutes);

      attendance.punchOut = { time: now, ipAddress, latitude, longitude };
      attendance.metrics.workingHours = Number(workingHours.toFixed(2));
      attendance.metrics.isEarlyLeave = isEarlyLeave;
      
      // Calculate Overtime (e.g., if standard shift is 9 hours)
      const standardShiftHours = (standardEndMinutes - timeToMinutes(settings.standardStartTime)) / 60;
      if (workingHours > standardShiftHours) {
        attendance.metrics.overtimeHours = Number((workingHours - standardShiftHours).toFixed(2));
      }

      await attendance.save();

      return NextResponse.json({ success: true, message: "Punched out successfully", data: attendance });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Punch Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
