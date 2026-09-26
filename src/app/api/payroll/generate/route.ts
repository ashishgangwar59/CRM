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

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

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
        lopDays += Math.ceil(diff / (1000 * 60 * 60 * 24) + 1) + 1;
      }
    });

    // 4. Calculations
    const standardDaysInMonth = 30; // Standard days in a month
    const targetPaidDays = typeof customPaidDays === "number" && customPaidDays > 0 ? customPaidDays : Math.max(0, standardDaysInMonth - lopDays);
    const ratio = targetPaidDays / standardDaysInMonth;

    const baseTravelAllowance = structure.travelAllowance || structure.metroAllowance || structure.specialAllowance || 0;
    const baseIncentive = structure.incentive || 0;

    // Pro-rate earnings based on paid days
    const basic = Math.round(structure.basic * ratio);
    const hra = Math.round(structure.hra * ratio);
    const specialAllowance = Math.round((structure.specialAllowance || 0) * ratio);
    const metroAllowance = Math.round((structure.metroAllowance || 0) * ratio);
    const travelAllowance = Math.round(baseTravelAllowance * ratio);
    const incentive = Math.round(baseIncentive * ratio);

    const perDaySalary = (structure.basic + structure.hra + baseTravelAllowance + baseIncentive) / standardDaysInMonth;
    const unpaidLeaveDeduction = customPaidDays ? 0 : Math.round(lopDays * perDaySalary);

    const bonus = 0;
    const loan = 0;
    const advance = structure.advanceSalaryDrawn || 0;

    // Pro-rate statutory deductions
    const pf = Math.round((structure.pf || 0) * ratio);
    const esi = Math.round((structure.esi || 0) * ratio);
    const professionalTax = Math.round((structure.professionalTax || 0) * ratio);
    const incomeTax = Math.round((structure.incomeTax || 0) * ratio);

    const earningsTotal = Math.round(basic + hra + travelAllowance + bonus + incentive);
    const deductionsTotal = Math.round(pf + esi + professionalTax + incomeTax + loan + advance + unpaidLeaveDeduction);

    const grossSalary = earningsTotal;
    const netSalary = Math.round(grossSalary - deductionsTotal);

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
          incentive
        },
        deductions: {
          pf,
          esi,
          professionalTax,
          incomeTax,
          loan,
          advance,
          advanceSalaryDrawn: advance,
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
