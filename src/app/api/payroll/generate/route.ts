import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SalaryStructure } from "@/lib/models/SalaryStructure";
import { Payroll } from "@/lib/models/Payroll";
import { Leave } from "@/lib/models/Leave";
import { Attendance } from "@/lib/models/Attendance";
import { verifyAccessToken } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { employeeId, monthYear } = await req.json(); // e.g., "2026-07"

    // 1. Get Base Salary Structure
    const structure = await SalaryStructure.findOne({ employeeId });
    if (!structure) {
      return NextResponse.json({ error: "No Salary Structure defined for this employee" }, { status: 400 });
    }

    // 2. Fetch LOP (Loss of Pay) Leaves for this month
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
        lopDays += Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
      }
    });

    // 3. Fetch Overtime Hours from Attendance
    const attendances = await Attendance.find({
      employeeId,
      date: { $regex: `^${monthYear}` }
    });

    let totalOvertimeHours = 0;
    attendances.forEach(att => {
      totalOvertimeHours += (att.metrics?.overtimeHours || 0);
    });

    // 4. Calculations
    const standardDaysInMonth = 30; // Simplify for MVP. Real app would calculate exact days.
    const perDaySalary = (structure.basic + structure.hra + structure.specialAllowance) / standardDaysInMonth;
    
    const unpaidLeaveDeduction = Number((lopDays * perDaySalary).toFixed(2));
    
    // Assume overtime is paid at basic/160 * 1.5 per hour
    const hourlyRate = (structure.basic / 160) * 1.5;
    const overtimeAmount = Number((totalOvertimeHours * hourlyRate).toFixed(2));

    const bonus = 0;
    const incentive = 0;
    const loan = 0;
    const advance = 0;

    const earningsTotal = structure.basic + structure.hra + structure.specialAllowance + bonus + incentive + overtimeAmount;
    const deductionsTotal = structure.pf + structure.esi + structure.professionalTax + structure.incomeTax + loan + advance + unpaidLeaveDeduction;
    
    const grossSalary = earningsTotal;
    const netSalary = grossSalary - deductionsTotal;

    // 5. Save Payroll Draft
    const payroll = await Payroll.findOneAndUpdate(
      { employeeId, monthYear },
      {
        earnings: {
          basic: structure.basic,
          hra: structure.hra,
          specialAllowance: structure.specialAllowance,
          bonus,
          incentive,
          overtimeAmount
        },
        deductions: {
          pf: structure.pf,
          esi: structure.esi,
          professionalTax: structure.professionalTax,
          incomeTax: structure.incomeTax,
          loan,
          advance,
          unpaidLeaveDeduction
        },
        grossSalary,
        totalDeductions: deductionsTotal,
        netSalary,
        status: "Draft"
      },
      { new: true, upsert: true }
    );

    // Notify the employee
    notificationService.notifySalaryGenerated(employeeId, monthYear, netSalary);

    return NextResponse.json({ success: true, message: "Payroll generated successfully", data: payroll });
  } catch (error) {
    console.error("Generate Payroll Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
