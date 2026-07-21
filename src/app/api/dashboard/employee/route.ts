import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Employee } from "@/lib/models/Employee";
import { Attendance } from "@/lib/models/Attendance";
import { LeaveBalance } from "@/lib/models/LeaveBalance";
import { Payroll } from "@/lib/models/Payroll";
import { Announcement } from "@/lib/models/Announcement";
import { EmployeeTask } from "@/lib/models/EmployeeTask";
import { Holiday } from "@/lib/models/Holiday"; // Assuming we have this, or we can just mock upcoming if not

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
    
    // Auth Check
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const employeeId = payload.userId;

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Today's Attendance
    const todaysAttendance = await Attendance.findOne({ employeeId, date: todayStr }).lean();

    // 2. Attendance Graph (Last 7 Days working hours)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const attendanceRecords = await Attendance.find({
      employeeId,
      date: { $in: last7Days }
    }).lean();

    const attendanceGraph = last7Days.map(date => {
      const record = attendanceRecords.find(a => a.date === date);
      return {
        date: date.slice(5), // MM-DD
        hours: record?.metrics?.workingHours || 0
      };
    });

    // 3. Leave Balances
    const leaveBalance = await LeaveBalance.findOne({ employeeId }).lean();
    const balances = leaveBalance?.balances || {
      Paid: 0,
      Casual: 0,
      Sick: 0,
      Maternity: 0,
      Paternity: 0,
      CompOff: 0
    };
    const leaveGraph = Object.entries(balances).map(([name, value]) => ({
      name,
      value: value as number
    }));

    // 4. Salary Summary & History
    const salaries = await Payroll.find({ employeeId, status: "Paid" })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    
    const latestSalary = salaries[0] || null;
    const salaryHistory = salaries.map(s => ({
      month: s.monthYear,
      amount: s.netSalary,
      id: s._id
    }));

    // 5. Upcoming Birthdays (All employees in next 30 days)
    const allEmployees = await Employee.find({}, "firstName lastName dateOfBirth").lean();
    const upcomingBirthdays = allEmployees.filter(emp => {
      if (!emp.dateOfBirth) return false;
      const dob = new Date(emp.dateOfBirth);
      const today = new Date();
      dob.setFullYear(today.getFullYear());
      if (dob < today) dob.setFullYear(today.getFullYear() + 1);
      const diffTime = Math.abs(dob.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }).map(emp => ({ name: `${emp.firstName} ${emp.lastName}`, date: new Date(emp.dateOfBirth!).toLocaleDateString() }));

    // 6. Announcements
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 7. Tasks
    const tasks = await EmployeeTask.find({ assignedTo: employeeId, status: { $ne: "Completed" } })
      .sort({ dueDate: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        todaysAttendance: todaysAttendance ? todaysAttendance.status : "Not Punched In",
        attendanceGraph,
        leaveBalances: leaveGraph,
        latestSalary,
        salaryHistory,
        upcomingBirthdays,
        announcements,
        tasks
      }
    });
  } catch (error) {
    console.error("Fetch Employee Dashboard Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
