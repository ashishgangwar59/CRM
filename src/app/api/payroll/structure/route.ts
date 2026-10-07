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
    const monthYear = searchParams.get("monthYear");

    let query: any = {};
    if (employeeId) query.employeeId = employeeId;

    const allStructures = await SalaryStructure.find(query).populate("employeeId", "firstName lastName employeeCode department").lean();
    
    // Group by employee and select the correct structure
    const employeeMap = new Map();
    
    allStructures.forEach(struct => {
      const empIdStr = struct.employeeId?._id?.toString() || struct.employeeId?.toString();
      if (!empIdStr) return;
      
      if (!employeeMap.has(empIdStr)) {
        employeeMap.set(empIdStr, []);
      }
      employeeMap.get(empIdStr).push(struct);
    });

    const finalStructures = [];
    employeeMap.forEach((structs, empIdStr) => {
      // Sort by latest createdAt
      structs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      let targetStruct = structs.find(s => s.monthYear === monthYear);
      if (!targetStruct) {
        targetStruct = structs[0]; // fallback to latest
      }
      finalStructures.push(targetStruct);
    });

    return NextResponse.json({ success: true, data: finalStructures });
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
      { employeeId: data.employeeId, monthYear: data.monthYear },
      { ...data },
      { new: true, upsert: true } // Create if doesn't exist, update if it does
    );

    // Automatically regenerate the Draft payroll slip for the current month
    // so it immediately reflects the new Salary Structure or Incentive configurations.
    try {
      const { Payroll } = await import("@/lib/models/Payroll");
      const { calculatePayrollForEmployee } = await import("@/lib/payrollEngine");

      const targetMonthYear = data.monthYear || new Date().toISOString().slice(0, 7);

      // We only update if the payroll is still in Draft state (not Locked/Approved/Paid)
      const existingPayroll = await Payroll.findOne({ employeeId: data.employeeId, monthYear: targetMonthYear });
      if (!existingPayroll || existingPayroll.status === "Draft") {
        const result = await calculatePayrollForEmployee(
          data.employeeId,
          targetMonthYear,
          0, 0, 30, 0, true,
          payload.userId
        );

        await Payroll.findOneAndUpdate(
          { employeeId: data.employeeId, monthYear: targetMonthYear },
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
