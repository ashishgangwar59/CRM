import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    // In Next 15+, params must be awaited
    const { id } = await params;
    
    const payroll = await Payroll.findById(id).populate("employeeId");
    if (!payroll) return NextResponse.json({ error: "Payroll not found" }, { status: 404 });

    // Here you would integrate with Resend, SendGrid, Amazon SES, etc.
    // For MVP, we simulate success
    console.log(`[Email Simulation] Sent Salary Slip PDF to: ${(payroll.employeeId as any).email}`);

    return NextResponse.json({ success: true, message: `Salary slip emailed successfully to ${(payroll.employeeId as any).email}` });
  } catch (error) {
    console.error("Email Salary Slip Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
