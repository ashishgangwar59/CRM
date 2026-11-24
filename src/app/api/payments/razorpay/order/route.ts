import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { InvestmentPayment } from "@/lib/models/InvestmentPayment";
import { PaymentUserError, createOrder, getPaymentConfig } from "@/lib/payments/razorpay";
import { getInvestorBalance, investorSnapshot, paymentErrorResponse, resolvePayer } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * Body: { investorId, amount, payToken? }
 * Creates a Razorpay order for (part of) the balance due. The amount is checked on the server.
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const config = await getPaymentConfig();
    if (!config.onlineReady) throw new PaymentUserError("Online payment is not available right now. Please use bank transfer (UTR).", 503);

    const { investor, auth } = await resolvePayer(req, String(body.investorId || ""), body.payToken);
    const { balance } = await getInvestorBalance(investor);
    if (balance <= 0) throw new PaymentUserError("This investment is already fully paid (or payments are awaiting verification).");

    const amount = Math.round(Number(body.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1) throw new PaymentUserError("Enter a valid amount.");
    if (amount > balance) throw new PaymentUserError(`Amount cannot be more than the balance due (Rs ${balance.toLocaleString("en-IN")}).`);

    const snap = investorSnapshot(investor);
    const payment = await InvestmentPayment.create({
      ...snap,
      amount,
      method: "online",
      status: "Created",
      gatewayMode: config.mode,
      submittedBy: auth?.userId,
    });

    try {
      const order = await createOrder(config, {
        amountPaise: Math.round(amount * 100),
        receipt: `PAY-${payment._id}`,
        notes: {
          paymentId: String(payment._id),
          investorId: String(investor._id),
          investorCode: String(investor.investorCode || ""),
          applicationNo: String(snap.applicationNo || ""),
        },
      });
      payment.razorpayOrderId = order.id;
      await payment.save();

      return NextResponse.json({
        success: true,
        data: {
          paymentId: String(payment._id),
          orderId: order.id,
          amountPaise: order.amount,
          currency: order.currency,
          keyId: config.keyId,
          mode: config.mode,
          prefill: { name: investor.fullName, email: investor.email || "", contact: investor.phone || "" },
          description: `Investment ${investor.investorCode || ""}`.trim(),
        },
      });
    } catch (e) {
      payment.status = "Failed";
      payment.failureReason = (e as any)?.message || "Order creation failed";
      await payment.save();
      throw e;
    }
  } catch (e) {
    const { body, status } = paymentErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
