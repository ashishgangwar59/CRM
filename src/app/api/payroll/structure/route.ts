import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SalaryStructure } from "@/lib/models/SalaryStructure";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    // Auth
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    let query = {};
    if (employeeId) query = { employeeId };

    const structures = await SalaryStructure.find(query).populate("employeeId", "firstName lastName employeeCode department").lean();

    return NextResponse.json({ success: true, data: structures });
  } catch (error) {
    console.error("Fetch Salary Structure Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const data = await req.json();

    const structure = await SalaryStructure.findOneAndUpdate(
      { employeeId: data.employeeId },
      { ...data },
      { new: true, upsert: true } // Create if doesn't exist, update if it does
    );

    // Automatically regenerate the Draft payroll slip for the current month
    // so it immediately reflects the new Salary Structure or Incentive configurations.
    try {
      const { Payroll } = await import("@/lib/models/Payroll");
      const { calculatePayrollForEmployee } = await import("@/lib/payrollEngine");

      const currentMonthYear = new Date().toISOString().slice(0, 7);

      // We only update if the payroll is still in Draft state (not Locked/Approved/Paid)
      const existingPayroll = await Payroll.findOne({ employeeId: data.employeeId, monthYear: currentMonthYear });
      if (!existingPayroll || existingPayroll.status === "Draft") {
        const result = await calculatePayrollForEmployee(
          data.employeeId,
          currentMonthYear,
          0, 0, 30, 0, true,
          payload.userId
        );

        await Payroll.findOneAndUpdate(
          { employeeId: data.employeeId, monthYear: currentMonthYear },
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
      }
    } catch (e) {
      console.error("Failed to auto-generate payroll on structure update", e);
    }

    return NextResponse.json({ success: true, data: structure });
  } catch (error) {
    console.error("Save Salary Structure Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
