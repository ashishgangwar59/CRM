import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/lib/models/Attendance";
import { SystemSettings } from "@/lib/models/SystemSettings";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in metres
}
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";
import { LeaveBalance } from "@/lib/models/LeaveBalance";

// Helper to parse "HH:MM" into minutes since midnight
function timeToMinutes(timeStr: string) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

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

export async function POST(req: Request) {
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

    let employee = await Employee.findOne({ email: { $regex: `^${user.email}$`, $options: "i" } });
    if (!employee) {
      const nameParts = (user.email || "Employee").split("@")[0].split(".");
      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : "Employee";
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : "";

      const roleUpper = (user.role || "").toUpperCase().replace("_", "");
      const isAdmin = roleUpper === "ADMIN" || roleUpper === "KEYADMIN" || roleUpper === "MANAGER";
      const prefix = isAdmin ? "Admin" : "EMP";

      const count = await Employee.countDocuments();
      const employeeCode = `${prefix}-${(count + 1).toString().padStart(4, "0")}`;

      employee = await Employee.create({
        email: user.email,
        firstName,
        lastName,
        employeeCode,
        status: "Active",
        employeeType: "Full-Time",
        department: "Management"
      });
    }

    const { action, latitude, longitude } = await req.json(); // action = "IN" or "OUT"
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";

    // Get today's date in YYYY-MM-DD
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Get settings
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }
    const attPolicy = settings.attendancePolicy || {};
    const officeStartTime = attPolicy.officeStartTime || "10:00";
    const lateThresholdMinutes = attPolicy.lateThresholdMins || 15;

    // Geofencing Check
    if (attPolicy.latitude && attPolicy.longitude && attPolicy.latitude !== 0 && attPolicy.longitude !== 0) {
      if (!latitude || !longitude) {
        return NextResponse.json({ error: "Location coordinates are required to mark attendance." }, { status: 400 });
      }
      const dist = getDistance(latitude, longitude, attPolicy.latitude, attPolicy.longitude);
      const maxRadius = attPolicy.radiusMeters || 100;
      if (dist > maxRadius) {
        return NextResponse.json({ error: `You are too far from the office. Distance: ${Math.round(dist)}m (Max allowed: ${maxRadius}m)` }, { status: 400 });
      }
    }

    let attendance = await Attendance.findOne({ employeeId: employee._id, date: dateStr });

    if (action === "IN") {
      if (attendance?.punchIn) {
        return NextResponse.json({ error: "Already punched in today" }, { status: 400 });
      }

      // Check Late Coming
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const standardStartMinutes = timeToMinutes(officeStartTime);
      const isLate = currentMinutes > (standardStartMinutes + lateThresholdMinutes);

      if (!attendance) {
        attendance = new Attendance({
          employeeId: employee._id,
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
      // Allow updating punch-out time if already punched out

      // Calculate working hours
      const diffMs = now.getTime() - new Date(attendance.punchIn.time).getTime();
      const workingHours = diffMs / (1000 * 60 * 60);

      // Check Early Leave
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const standardEndMinutes = timeToMinutes(attPolicy.officeEndTime || "18:00");
      const earlyLeaveMins = attPolicy.earlyLeaveThresholdMins || 15;
      const isEarlyLeave = currentMinutes < (standardEndMinutes - earlyLeaveMins);

      attendance.punchOut = { time: now, ipAddress, latitude, longitude };
      attendance.metrics.workingHours = Number(workingHours.toFixed(2));
      attendance.metrics.isEarlyLeave = isEarlyLeave;

      // Calculate Overtime (e.g., if standard shift is 9 hours)
      const standardStartMins = timeToMinutes(officeStartTime);
      const standardShiftHours = (standardEndMinutes - standardStartMins) / 60;
      if (workingHours > standardShiftHours) {
        attendance.metrics.overtimeHours = Number((workingHours - standardShiftHours).toFixed(2));
      }

      // If working hours are less than 7 hours, set status to Half-Day and deduct 0.5 Casual leave
      if (workingHours < 7) {
        attendance.status = "Half-Day";
        const balanceDoc = await LeaveBalance.findOne({ employeeId: employee._id });
        if (balanceDoc) {
          balanceDoc.balances.Casual = Math.max(0, (balanceDoc.balances.Casual || 0) - 0.5);
          await balanceDoc.save();
        }
      } else {
        attendance.status = "Present";
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
