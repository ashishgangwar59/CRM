import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/lib/models/Attendance";
import { Employee } from "@/lib/models/Employee";
import { User } from "@/lib/models/User";
import { verifyAccessToken } from "@/lib/auth";
import { LeaveBalance } from "@/lib/models/LeaveBalance";

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
    
    // Auth
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // 1. Fetch all employees
    let employees: any[] = await Employee.find()
      .select("firstName lastName employeeCode department email phone designation")
      .lean();

    // Fallback to Users if Employee collection is empty
    if (employees.length === 0) {
      const users = await User.find().select("email role").lean();
      employees = users.map((u: any) => ({
        _id: u._id,
        firstName: u.email ? u.email.split("@")[0] : "User",
        lastName: "",
        employeeCode: u.role || "EMP",
        department: "General",
        email: u.email,
      }));
    }

    // 2. Fetch all attendance records for this date
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const records = await Attendance.find({
      $or: [
        { date: dateStr },
        { createdAt: { $gte: startOfDay } }
      ]
    }).lean();

    const attendanceMap = new Map();
    records.forEach((rec) => {
      if (rec.employeeId) {
        attendanceMap.set(rec.employeeId.toString(), rec);
      }
    });

    // 3. Merge every employee with their attendance record for the date
    const mergedList = employees.map((emp: any) => {
      const att = attendanceMap.get(emp._id.toString());
      if (att) {
        return {
          ...att,
          employeeId: emp,
        };
      }
      return {
        _id: `absent_${emp._id}`,
        employeeId: emp,
        date: dateStr,
        status: "Absent",
        punchIn: null,
        punchOut: null,
        metrics: { workingHours: 0, isLate: false, isEarlyLeave: false },
        isNotPunched: true,
      };
    });

    // Sort: Punched-in/Present/Late first, then Absents
    mergedList.sort((a: any, b: any) => {
      if (a.status !== "Absent" && b.status === "Absent") return -1;
      if (a.status === "Absent" && b.status !== "Absent") return 1;
      return (a.employeeId?.firstName || "").localeCompare(b.employeeId?.firstName || "");
    });

    return NextResponse.json({ success: true, data: mergedList });

  } catch (error) {
    console.error("Manager Attendance Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();

    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { attendanceId, status, date } = await req.json();
    if (!attendanceId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let attendance = await Attendance.findById(attendanceId);

    if (!attendance && String(attendanceId).startsWith("absent_")) {
      const empId = String(attendanceId).replace("absent_", "");
      const dateStr = date || new Date().toISOString().split("T")[0];
      attendance = await Attendance.create({
        employeeId: empId,
        date: dateStr,
        status,
        punchIn: undefined,
        punchOut: undefined,
        metrics: { workingHours: 0, isLate: false, isEarlyLeave: false },
      });
    }

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const oldStatus = attendance.status;

    // Refund/deduct balance depending on status transitions
    if (oldStatus === "Half-Day" && status === "Present") {
      const balanceDoc = await LeaveBalance.findOne({ employeeId: attendance.employeeId });
      if (balanceDoc) {
        balanceDoc.balances.Casual = (balanceDoc.balances.Casual || 0) + 0.5;
        await balanceDoc.save();
      }
    } else if (oldStatus !== "Half-Day" && status === "Half-Day") {
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
