import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { InvestmentPayment } from "@/lib/models/InvestmentPayment";
import { getPaymentConfig, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { markPaid } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks):
 *   URL:    https://<your-domain>/api/payments/razorpay/webhook
 *   Events: payment.captured, payment.failed, order.paid
 * Records payments even if the investor closed the browser before the checkout callback.
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const config = await getPaymentConfig();
    const raw = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!config.webhookSecret) {
      console.error("[Payments] Webhook received but no webhook secret is configured.");
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    if (!verifyWebhookSignature(raw, signature, config.webhookSecret)) {
      console.warn("[Payments] Webhook signature mismatch – ignored.");
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const event = JSON.parse(raw);
    const entity = event?.payload?.payment?.entity;
    if (!entity?.order_id) return NextResponse.json({ ok: true });

    const payment = await InvestmentPayment.findOne({ razorpayOrderId: entity.order_id });
    if (!payment) return NextResponse.json({ ok: true }); // not one of ours

    if ((event.event === "payment.captured" || event.event === "order.paid") && entity.status === "captured") {
      if (Number(entity.amount) !== Math.round(payment.amount * 100)) {
        console.error(`[Payments] Webhook amount mismatch for order ${entity.order_id}`);
        return NextResponse.json({ ok: true });
      }
      await markPaid(payment._id, {
        razorpayPaymentId: entity.id,
        gatewayMethod: entity.method,
        paidAt: entity.created_at ? new Date(entity.created_at * 1000) : new Date(),
      }, { req, actorUserId: null, action: "PAYMENT_ONLINE_PAID_WEBHOOK" });
    } else if (event.event === "payment.failed" && payment.status === "Created") {
      payment.status = "Failed";
      payment.failureReason = entity.error_description || entity.error_reason || "Payment failed";
      payment.razorpayPaymentId = payment.razorpayPaymentId || entity.id;
      await payment.save().catch(() => undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Payments] Webhook error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
