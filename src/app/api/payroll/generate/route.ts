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

    const { employeeId, monthYear, paidDays: customPaidDays } = await req.json(); // e.g., "2026-07", paidDays: 15 / 20 / 30

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
    const standardDaysInMonth = 30; // Standard days in a month
    const targetPaidDays = typeof customPaidDays === "number" && customPaidDays > 0 ? customPaidDays : Math.max(0, standardDaysInMonth - lopDays);
    const ratio = targetPaidDays / standardDaysInMonth;

    const baseTravelAllowance = structure.travelAllowance || structure.metroAllowance || structure.specialAllowance || 0;
    const baseIncentive = structure.incentive || 0;
    
    // Pro-rate earnings based on paid days
    const basic = Number((structure.basic * ratio).toFixed(2));
    const hra = Number((structure.hra * ratio).toFixed(2));
    const specialAllowance = Number(((structure.specialAllowance || 0) * ratio).toFixed(2));
    const metroAllowance = Number(((structure.metroAllowance || 0) * ratio).toFixed(2));
    const travelAllowance = Number((baseTravelAllowance * ratio).toFixed(2));
    const incentive = Number((baseIncentive * ratio).toFixed(2));

    const perDaySalary = (structure.basic + structure.hra + baseTravelAllowance + baseIncentive) / standardDaysInMonth;
    const unpaidLeaveDeduction = customPaidDays ? 0 : Number((lopDays * perDaySalary).toFixed(2));
    
    // Overtime rate
    const hourlyRate = (structure.basic / 160) * 1.5;
    const overtimeAmount = Number((totalOvertimeHours * hourlyRate).toFixed(2));

    const bonus = 0;
    const loan = 0;
    const advance = 0;

    // Pro-rate statutory deductions
    const pf = Number(((structure.pf || 0) * ratio).toFixed(2));
    const esi = Number(((structure.esi || 0) * ratio).toFixed(2));
    const professionalTax = Number(((structure.professionalTax || 0) * ratio).toFixed(2));
    const incomeTax = Number(((structure.incomeTax || 0) * ratio).toFixed(2));

    const earningsTotal = Number((basic + hra + travelAllowance + bonus + incentive + overtimeAmount).toFixed(2));
    const deductionsTotal = Number((pf + esi + professionalTax + incomeTax + loan + advance + unpaidLeaveDeduction).toFixed(2));
    
    const grossSalary = earningsTotal;
    const netSalary = Number((grossSalary - deductionsTotal).toFixed(2));

    // 5. Save Payroll Draft
    const payroll = await Payroll.findOneAndUpdate(
      { employeeId, monthYear },
      {
        paidDays: targetPaidDays,
        totalDays: standardDaysInMonth,
        earnings: {
          basic,
          hra,
          specialAllowance,
          metroAllowance,
          travelAllowance,
          bonus,
          incentive,
          overtimeAmount
        },
        deductions: {
          pf,
          esi,
          professionalTax,
          incomeTax,
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
