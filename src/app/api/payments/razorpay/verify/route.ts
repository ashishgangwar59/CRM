import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { InvestmentPayment } from "@/lib/models/InvestmentPayment";
import {
  PaymentUserError, capturePayment, fetchPayment, getPaymentConfig, verifyCheckoutSignature,
} from "@/lib/payments/razorpay";
import { getAuth, markPaid, paymentErrorResponse, paymentView } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * Called by the browser after Razorpay Checkout succeeds.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * The signature AND the payment itself (status + amount) are checked with Razorpay before marking Paid.
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.razorpay_order_id || "");
    const paymentId = String(body.razorpay_payment_id || "");
    const signature = String(body.razorpay_signature || "");
    if (!orderId || !paymentId || !signature) throw new PaymentUserError("Incomplete payment response.");

    const config = await getPaymentConfig();
    const payment = await InvestmentPayment.findOne({ razorpayOrderId: orderId });
    if (!payment) throw new PaymentUserError("Payment order not found.", 404);
    if (payment.status === "Paid") {
      return NextResponse.json({ success: true, message: "Payment already recorded.", data: paymentView(payment) });
    }

    if (!verifyCheckoutSignature(orderId, paymentId, signature, config.keySecret)) {
      payment.failureReason = "Signature verification failed";
      await payment.save();
      throw new PaymentUserError("Payment could not be verified. If money was debited, it will be confirmed automatically or refunded by the bank.", 400);
    }

    // Confirm with Razorpay: right order, right amount, captured.
    let rp = await fetchPayment(config, paymentId);
    const expectedPaise = Math.round(payment.amount * 100);
    if (rp.order_id !== orderId || Number(rp.amount) !== expectedPaise) {
      throw new PaymentUserError("Payment details do not match the order. Please contact support.", 400);
    }
    if (rp.status === "authorized") {
      rp = await capturePayment(config, paymentId, expectedPaise);
    }
    if (rp.status !== "captured") {
      throw new PaymentUserError(`Payment is ${rp.status}. It will be confirmed automatically once the bank completes it.`, 400);
    }

    const auth = getAuth(req);
    const { payment: paid } = await markPaid(payment._id, {
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      gatewayMethod: rp.method,
      paidAt: rp.created_at ? new Date(rp.created_at * 1000) : new Date(),
    }, { req, actorUserId: auth?.userId, action: "PAYMENT_ONLINE_PAID" });

    return NextResponse.json({ success: true, message: "Payment successful. Receipt generated.", data: paymentView(paid) });
  } catch (e) {
    const { body, status } = paymentErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
