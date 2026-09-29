import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { Payroll } from "@/lib/models/Payroll";
import { Leave } from "@/lib/models/Leave";
import { verifyAccessToken } from "@/lib/auth";
import { calculatePayrollForEmployee } from "@/lib/payrollEngine";
import { notificationService } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    
    if (payload.role !== "ADMIN" && payload.role !== "KEY_ADMIN") {
      return NextResponse.json({ error: "Forbidden. Only Admins can run bulk payroll." }, { status: 403 });
    }

    const { monthYear } = await req.json();
    if (!monthYear) {
      return NextResponse.json({ error: "Month/Year is required (e.g. 2026-07)" }, { status: 400 });
    }

    // 1. Get all active employees
    const activeEmployees = await Employee.find({ status: "Active" }).select("_id");
    const standardDaysInMonth = 30; // Could be calculated dynamically
    
    let processedCount = 0;
    let failedCount = 0;

    // 2. Iterate and generate for everyone
    for (const emp of activeEmployees) {
      try {
        // Fetch LOP (Loss of Pay) Leaves for this month
        const leaves = await Leave.find({
          employeeId: emp._id,
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

        const result = await calculatePayrollForEmployee(
          emp._id.toString(), 
          monthYear, 
          0, // eligibleRevenue
          0, // teamGeneratedRevenue
          standardDaysInMonth, 
          lopDays, 
          false, // don't spam the audit log for massive bulk runs
          payload.userId
        );

        // Save Payroll Draft
        await Payroll.findOneAndUpdate(
          { employeeId: emp._id, monthYear },
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

        // Notify
        notificationService.notifySalaryGenerated(emp._id.toString(), monthYear, result.netSalary);
        
        processedCount++;
      } catch (err) {
        console.error(`Failed to process payroll for Employee ${emp._id}:`, err);
        failedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bulk payroll generated successfully for ${monthYear}.`,
      data: { processed: processedCount, failed: failedCount }
    });
    
  } catch (error: any) {
    console.error("Bulk Generate Payroll Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
