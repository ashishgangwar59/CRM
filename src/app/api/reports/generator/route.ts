import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Attendance } from "@/lib/models/Attendance";
import { Leave } from "@/lib/models/Leave";
import { Payroll } from "@/lib/models/Payroll";
import { WalletTransaction } from "@/lib/models/WalletTransaction";
import { Employee } from "@/lib/models/Employee";
import { Lead } from "@/lib/models/Lead";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (payload.role !== "Super Admin" && payload.role !== "ADMIN" && payload.role !== "Employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // Attendance, Leave, Salary, Wallet, Employee, Department, Lead
    const month = searchParams.get("month"); // Optional: YYYY-MM
    const year = searchParams.get("year"); // Optional: YYYY

    let dateQuery: any = {};
    if (month) {
      // month is YYYY-MM
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      dateQuery = { $gte: start, $lt: end };
    } else if (year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      dateQuery = { $gte: start, $lt: end };
    }

    let summary: any[] = [];
    let rows: any[] = [];

    switch (type) {
      case "Attendance":
        const attendanceFilter: any = Object.keys(dateQuery).length ? { createdAt: dateQuery } : {};
        if (payload.role === "Employee") attendanceFilter.employeeId = payload.userId;
        const attRecords = await Attendance.find(attendanceFilter).populate("employeeId", "firstName lastName employeeCode").lean();
        
        let statusCounts: any = { Present: 0, Absent: 0, Late: 0, HalfDay: 0 };
        attRecords.forEach(a => {
          if (a.status) {
            statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
          }
          rows.push({
            Date: a.date,
            Employee: `${(a.employeeId as any)?.firstName || ""} ${(a.employeeId as any)?.lastName || ""}`,
            Code: (a.employeeId as any)?.employeeCode || "",
            Status: a.status,
            WorkingHours: a.metrics?.workingHours || 0
          });
        });
        
        summary = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));
        break;

      case "Leave":
        const leaveFilter: any = Object.keys(dateQuery).length ? { startDate: dateQuery } : {};
        if (payload.role === "Employee") leaveFilter.employeeId = payload.userId;
        const leaveRecords = await Leave.find(leaveFilter).populate("employeeId", "firstName lastName employeeCode").lean();
        
        let leaveCounts: any = { Approved: 0, Pending: 0, Rejected: 0 };
        leaveRecords.forEach(l => {
          leaveCounts[l.status] = (leaveCounts[l.status] || 0) + 1;
          let days = 0;
          if (l.isHalfDay) {
            days = 0.5;
          } else {
            const diff = Math.abs(new Date(l.endDate).getTime() - new Date(l.startDate).getTime());
            days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
          }
          rows.push({
            Employee: `${(l.employeeId as any)?.firstName || ""} ${(l.employeeId as any)?.lastName || ""}`,
            LeaveType: l.leaveType,
            StartDate: new Date(l.startDate).toLocaleDateString(),
            EndDate: new Date(l.endDate).toLocaleDateString(),
            Days: days,
            Status: l.status
          });
        });

        summary = Object.keys(leaveCounts).map(k => ({ name: k, value: leaveCounts[k] }));
        break;

      case "Salary":
        const payrollFilter: any = Object.keys(dateQuery).length ? { createdAt: dateQuery } : {};
        if (payload.role === "Employee") payrollFilter.employeeId = payload.userId;
        const payrollRecords = await Payroll.find(payrollFilter).populate("employeeId", "firstName lastName employeeCode").lean();
        
        let salaryCounts: any = { Paid: 0, Approved: 0, Locked: 0, Draft: 0 };
        payrollRecords.forEach(p => {
          salaryCounts[p.status] = (salaryCounts[p.status] || 0) + 1;
          rows.push({
            Month: p.monthYear,
            Employee: `${(p.employeeId as any)?.firstName || ""} ${(p.employeeId as any)?.lastName || ""}`,
            Gross: p.grossSalary,
            Deductions: p.totalDeductions,
            Net: p.netSalary,
            Status: p.status
          });
        });
        summary = Object.keys(salaryCounts).map(k => ({ name: k, value: salaryCounts[k] }));
        break;

      case "Wallet":
        if (payload.role === "Employee") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const walletFilter = Object.keys(dateQuery).length ? { createdAt: dateQuery } : {};
        const walletRecords = await WalletTransaction.find(walletFilter).populate("createdBy", "firstName lastName").lean();
        
        let txCounts: any = { Credit: 0, Debit: 0 };
        walletRecords.forEach(w => {
          txCounts[w.type] = (txCounts[w.type] || 0) + 1;
          rows.push({
            Date: new Date(w.createdAt).toLocaleString(),
            Type: w.type,
            Amount: w.amount,
            Description: w.description,
            CreatedBy: `${(w.createdBy as any)?.firstName || ""} ${(w.createdBy as any)?.lastName || ""}`
          });
        });
        summary = Object.keys(txCounts).map(k => ({ name: k, value: txCounts[k] }));
        break;

      case "Employee":
      case "Department":
        if (payload.role === "Employee") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        // Date range doesn't make as much sense here unless we filter by join date, 
        // but let's just return all active employees grouped by department.
        const employees = await Employee.find({ status: "Active" }).lean();
        
        let deptCounts: any = {};
        employees.forEach(e => {
          const dept = e.department || "Unassigned";
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
          rows.push({
            Code: e.employeeCode,
            Name: `${e.firstName} ${e.lastName}`,
            Email: e.email,
            Department: e.department,
            Designation: e.designation,
            JoinDate: e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : "-"
          });
        });
        summary = Object.keys(deptCounts).map(k => ({ name: k, value: deptCounts[k] }));
        break;

      case "Lead":
        const leadFilter: any = Object.keys(dateQuery).length ? { createdAt: dateQuery } : {};
        if (payload.role === "Employee") leadFilter.ownerId = payload.userId;
        const leadRecords = await Lead.find(leadFilter).populate("ownerId", "firstName lastName").lean();
        
        let leadCounts: any = { Open: 0, "Closed Won": 0, "Closed Lost": 0 };
        leadRecords.forEach(l => {
          leadCounts[l.status] = (leadCounts[l.status] || 0) + 1;
          rows.push({
            Name: `${l.firstName} ${l.lastName}`,
            Company: l.company || "-",
            Source: l.source,
            Stage: l.stage,
            Status: l.status,
            Owner: `${(l.ownerId as any)?.firstName || ""} ${(l.ownerId as any)?.lastName || ""}`
          });
        });
        summary = Object.keys(leadCounts).map(k => ({ name: k, value: leadCounts[k] }));
        break;

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { summary, rows } });
  } catch (error) {
    console.error("Report Generator Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
