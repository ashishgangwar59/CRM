import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { SystemSettings } from "@/lib/models/SystemSettings";
import { sendSalarySlipEmail } from "@/lib/mail";
import { buildPayslipHtml, payslipMonthLabel } from "@/lib/payslipTemplate";

/** Public base URL of this server (behind a proxy, prefer the forwarded host). */
function publicOrigin(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
    const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim();
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || new URL(req.url).origin;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    // In Next 15+, params must be awaited
    const { id } = await params;

    const payroll: any = await Payroll.findById(id).populate("employeeId").lean();
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

    // The email body is the salary slip itself, in the same design as the web/app slip.
    const settings: any = await SystemSettings.findOne({}, { companyProfile: 1 }).lean();
    const htmlBody = buildPayslipHtml(payroll, settings?.companyProfile || {}, `${publicOrigin(req)}/logo.png`);

    const sent = await sendSalarySlipEmail({
      email: emp.email,
      employeeName: empName,
      monthYear: payslipMonthLabel(payroll.monthYear) || payroll.monthYear || "Current Month",
      grossSalary: payroll.grossSalary || 0,
      netSalary: payroll.netSalary || 0,
      pdfBase64,
      htmlBody,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Email could not be sent. Check the SMTP settings in Settings → Integrations." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: `Salary slip emailed successfully to ${emp.email}` });
  } catch (error: any) {
    console.error("Email Salary Slip Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
