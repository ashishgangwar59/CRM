import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Employee } from "@/lib/models/Employee";
import { Attendance } from "@/lib/models/Attendance";
import { CompanyWallet } from "@/lib/models/CompanyWallet";
import { Payroll } from "@/lib/models/Payroll";
import { Lead } from "@/lib/models/Lead";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (payload.role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Employees & Attendance Today
    const totalEmployees = await Employee.countDocuments({ status: "Active" });
    const todaysAttendance = await Attendance.find({ date: today.toISOString().split('T')[0] }).lean();
    
    let attendanceStats = { present: 0, absent: 0, late: 0, leave: 0 };
    todaysAttendance.forEach(a => {
      if (a.status === "Present") {
        attendanceStats.present++;
        if (a.metrics?.isLate) {
          attendanceStats.late++;
        }
      } else if (a.status === "Absent") {
        attendanceStats.absent++;
      } else if (a.status === "Half-Day" || a.status === "Leave") {
        attendanceStats.leave++;
      }
    });
    // Add logic to query LeaveRequests for actual 'leave' count if needed, mocking based on absent for now if not strictly recorded today
    attendanceStats.absent = totalEmployees - attendanceStats.present - attendanceStats.leave;
    if (attendanceStats.absent < 0) attendanceStats.absent = 0;

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

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalEmployees,
          attendanceStats,
          walletBalance,
          salaryPaid,
          salaryPending,
          visitorsToday: 0, // Mocked
          openLeads,
          wonLeads,
          revenue
        },
        charts: {
          monthlyData,
          leadConversion
        }
      }
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
