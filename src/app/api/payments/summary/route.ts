import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { InvestmentPayment } from "@/lib/models/InvestmentPayment";
import { getPaymentConfig } from "@/lib/payments/razorpay";
import { getInvestorBalance, paymentErrorResponse, paymentView, resolvePayer } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * GET ?investorId=…&payToken=…
 * Amount due / paid / balance for one investment, its payments, and which payment options are available.
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const investorId = searchParams.get("investorId") || "";
    const { investor } = await resolvePayer(req, investorId, searchParams.get("payToken"));
    const config = await getPaymentConfig();

    const [balance, payments] = await Promise.all([
      getInvestorBalance(investor),
      InvestmentPayment.find({ investorId: investor._id, status: { $ne: "Created" } }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled,
        onlineAvailable: config.onlineReady,
        manualAvailable: config.enabled && config.allowManual,
        mode: config.mode,
        investor: {
          _id: String(investor._id),
          investorCode: investor.investorCode,
          fullName: investor.fullName,
          applicationNo: (investor as any).debentureForm?.applicationNo || "",
        },
        ...balance,
        payments: payments.map(paymentView),
      },
    });
  } catch (e) {
    const { body, status } = paymentErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
