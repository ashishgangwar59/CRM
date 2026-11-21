import { NextResponse } from "next/server";
import { joinedAfterMonth } from "@/lib/joiningMonth";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { verifyAccessToken } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { calculatePayrollForEmployee } from "@/lib/payrollEngine";
import { Employee } from "@/lib/models/Employee";
import { getDaysInMonth } from "@/lib/dateUtils";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    const { employeeId, monthYear, paidDays: customPaidDays, manualIncentive = 0, eligibleRevenue = 0, salaryPeriodStart, salaryPeriodEnd } = await req.json();

    const employee = await Employee.findById(employeeId).select("dateOfJoining designation");
    if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    if (joinedAfterMonth(employee.dateOfJoining, monthYear)) {
      return NextResponse.json({ error: "Salary slip cannot be generated before the employee's joining month." }, { status: 400 });
    }

    // Approved leave is paid leave and must not reduce the employee's salary.
    // Only an explicitly selected paid-days value can create a manual
    // salary proration/adjustment.
    let lopDays = 0;

    const standardDaysInMonth = getDaysInMonth(monthYear); // 28/29/30/31
    if (typeof customPaidDays === "number" && customPaidDays > 0) {
       // Paid days above the month length (e.g. "30" in February) mean a full month.
       lopDays = Math.max(0, standardDaysInMonth - Math.min(customPaidDays, standardDaysInMonth));
    }

    // 2. Call the Automated Payroll Engine with month's eligible revenue
    const result = await calculatePayrollForEmployee(
      employeeId, 
      monthYear, 
      Number(eligibleRevenue) || 0, // eligibleRevenue (monthly sales volume)
      0, // teamGeneratedRevenue
      standardDaysInMonth, 
      lopDays, 
      true, 
      payload.userId,
      Number(manualIncentive) || 0
    );

    // 3. Save Payroll Draft
    const payroll = await Payroll.findOneAndUpdate(
      { employeeId, monthYear },
      {
        paidDays: result.paidDays,
        totalDays: result.totalDays,
        earnings: result.earnings,
        deductions: result.deductions,
        grossSalary: result.grossSalary,
        totalDeductions: result.totalDeductions,
        netSalary: result.netSalary,
        ...(salaryPeriodStart ? { salaryPeriodStart: new Date(salaryPeriodStart) } : {}),
        ...(salaryPeriodEnd ? { salaryPeriodEnd: new Date(salaryPeriodEnd) } : {}),
        designation: employee.designation || "",
        status: "Draft"
      },
      { new: true, upsert: true }
    );

    // 4. Notify the employee
    notificationService.notifySalaryGenerated(employeeId, monthYear, result.netSalary);

    return NextResponse.json({ success: true, message: "Payroll generated successfully via automated engine", data: payroll });
  } catch (error: any) {
    console.error("Generate Payroll Engine Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
