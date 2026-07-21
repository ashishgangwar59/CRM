import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Employee } from "@/lib/models/Employee";
import { Attendance } from "@/lib/models/Attendance";
import { CompanyWallet } from "@/lib/models/CompanyWallet";
import { Payroll } from "@/lib/models/Payroll";
import { Lead } from "@/lib/models/Lead";

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
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Employees & Attendance Today
    let activeEmployees = await Employee.find().lean();
    let totalEmployees = activeEmployees.length;
    
    // Fetch today's attendance records by date string or today's createdAt timestamp
    const todaysAttendance = await Attendance.find({
      $or: [
        { date: dateStr },
        { createdAt: { $gte: today } }
      ]
    }).lean();
    
    // Upcoming Birthdays
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const upcomingBirthdays = activeEmployees
      .filter(emp => emp.dateOfBirth)
      .map(emp => {
        const dob = new Date(emp.dateOfBirth!);
        const dobMonth = dob.getMonth();
        const dobDay = dob.getDate();
        
        let nextBirthdayYear = today.getFullYear();
        if (dobMonth < currentMonth || (dobMonth === currentMonth && dobDay < currentDay)) {
          nextBirthdayYear++;
        }
        
        const nextBirthdayDate = new Date(nextBirthdayYear, dobMonth, dobDay);
        const daysUntil = Math.ceil((nextBirthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
          date: dob.toISOString().split('T')[0],
          daysUntil,
          department: emp.department || 'N/A',
          profilePhotoUrl: emp.profilePhotoUrl
        };
      })
      .filter(emp => emp.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    
    let attendanceStats = { present: 0, absent: 0, late: 0, leave: 0 };
    todaysAttendance.forEach(a => {
      if (a.status === "Present" || a.status === "Half-Day" || a.status === "Late" || a.punchIn) {
        attendanceStats.present++;
        if (a.metrics?.isLate || a.status === "Late") {
          attendanceStats.late++;
        }
      } else if (a.status === "Leave") {
        attendanceStats.leave++;
      }
    });

    attendanceStats.absent = Math.max(0, totalEmployees - attendanceStats.present - attendanceStats.leave);

    // 2. Financials (Wallet & Payroll)
    const wallet = await CompanyWallet.findOne().lean();
    const walletBalance = wallet ? wallet.balance : 0;

    const payrollsThisMonth = await Payroll.find({ monthYear: today.toISOString().slice(0, 7) }).lean();
    let salaryPaid = 0;
    let salaryPending = 0;
    payrollsThisMonth.forEach(p => {
      if (p.status === "Paid") salaryPaid += p.netSalary;
      else if (p.status !== "Draft") salaryPending += p.netSalary;
    });

    // 3. Sales (Leads & Revenue)
    const allLeads = await Lead.find().lean();
    let openLeads = 0;
    let wonLeads = 0;
    let revenue = 0;
    allLeads.forEach(l => {
      if (l.status === "Open") openLeads++;
      else if (l.status === "Closed Won") {
        wonLeads++;
        revenue += (l.dealValue || 0);
      }
    });

    // 4. Charts (Monthly Trends - mocked historical for UI demonstration if real data is sparse)
    // In a real app, this would be an aggregation pipeline grouping by month over the last 6 months.
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = today.getMonth();
    
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonthIdx - i;
      let y = today.getFullYear();
      if (m < 0) { m += 12; y -= 1; }
      
      monthlyData.push({
        name: monthNames[m],
        present: Math.floor(Math.random() * (totalEmployees - 5) + 5), // Mock historical
        absent: Math.floor(Math.random() * 5),
        salary: m === currentMonthIdx ? salaryPaid : Math.floor(Math.random() * 500000 + 200000), // Mock historical salary
      });
    }

    const leadConversion = [
      { name: "Won", value: wonLeads },
      { name: "Lost", value: allLeads.length - wonLeads - openLeads },
      { name: "Open", value: openLeads }
    ];

    const attendanceMap = new Map();
    todaysAttendance.forEach((rec) => {
      if (rec.employeeId) {
        attendanceMap.set(rec.employeeId.toString(), rec);
      }
    });

    const todaysAttendanceList = activeEmployees.map((emp: any) => {
      const att = attendanceMap.get(emp._id.toString());
      if (att) {
        let location = '-';
        let geoUrl = null;
        if (att.punchIn?.latitude && att.punchIn?.longitude) {
          location = `${att.punchIn.latitude.toFixed(4)}, ${att.punchIn.longitude.toFixed(4)}`;
          geoUrl = `https://maps.google.com/?q=${att.punchIn.latitude},${att.punchIn.longitude}`;
        } else if (att.punchIn?.ipAddress) {
          location = att.punchIn.ipAddress;
        }

        return {
          id: emp._id,
          name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
          employeeCode: emp.employeeCode || '-',
          department: emp.department || 'General',
          status: att.punchIn ? 'Present' : (att.status || 'Absent'),
          punchIn: att.punchIn ? new Date(att.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          punchOut: att.punchOut ? new Date(att.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          workingHours: att.metrics?.workingHours ? `${att.metrics.workingHours}h` : '-',
          isLate: att.metrics?.isLate || false,
          location,
          geoUrl,
        };
      }
      return {
        id: emp._id,
        name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
        employeeCode: emp.employeeCode || '-',
        department: emp.department || 'General',
        status: 'Absent',
        punchIn: '-',
        punchOut: '-',
        workingHours: '-',
        isLate: false,
        location: '-',
        geoUrl: null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalEmployees,
          attendanceStats,
          walletBalance,
          salaryPaid,
          salaryPending,
          visitorsToday: 0,
          openLeads,
          wonLeads,
          revenue
        },
        todaysAttendanceList,
        charts: {
          monthlyData,
          leadConversion
        },
        upcomingBirthdays
      }
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
