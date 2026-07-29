import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { sendSalarySlipEmail } from "@/lib/mail";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    // In Next 15+, params must be awaited
    const { id } = await params;
    
    const payroll = await Payroll.findById(id).populate("employeeId");
    if (!payroll) return NextResponse.json({ error: "Payroll not found" }, { status: 404 });

    const emp = payroll.employeeId as any;
    if (!emp || !emp.email) {
      return NextResponse.json({ error: "Employee email not found" }, { status: 400 });
    }

    const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode || "Employee";

    let pdfBase64: string | undefined = undefined;
    try {
      const body = await req.json();
      if (body && body.pdfBase64) {
        pdfBase64 = body.pdfBase64;
      }
    } catch {
      // Body may be empty if simple post
    }

    await sendSalarySlipEmail({
      email: emp.email,
      employeeName: empName,
      monthYear: payroll.monthYear || "Current Month",
      grossSalary: payroll.grossSalary || 0,
      netSalary: payroll.netSalary || 0,
      pdfBase64,
    });

    return NextResponse.json({ success: true, message: `Salary slip emailed successfully to ${emp.email}` });
  } catch (error: any) {
    console.error("Email Salary Slip Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
