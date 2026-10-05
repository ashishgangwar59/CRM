import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { verifyAccessToken } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { calculatePayrollForEmployee } from "@/lib/payrollEngine";
import { Leave } from "@/lib/models/Leave";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    const { employeeId, monthYear, paidDays: customPaidDays, manualIncentive = 0, eligibleRevenue = 0 } = await req.json();

    // 1. Fetch LOP (Loss of Pay) Leaves for this month
    const leaves = await Leave.find({
      employeeId,
      leaveType: "Loss of Pay",
      status: "Approved",
      startDate: { $gte: new Date(`${monthYear}-01`), $lt: new Date(`${monthYear}-31T23:59:59`) }
    });

    let lopDays = 0;
    leaves.forEach(leave => {
      if (leave.isHalfDay) lopDays += 0.5;
      else {
        const diff = Math.abs(leave.endDate.getTime() - leave.startDate.getTime());
        lopDays += Math.ceil(diff / (1000 * 60 * 60 * 24) + 1) + 1;
      }
    });

    const standardDaysInMonth = 30; // Could be dynamic based on monthYear
    if (typeof customPaidDays === "number" && customPaidDays > 0) {
       lopDays = standardDaysInMonth - customPaidDays;
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
