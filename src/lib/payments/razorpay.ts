import crypto from "crypto";
import { SystemSettings } from "@/lib/models/SystemSettings";

export interface PaymentConfig {
  enabled: boolean;
  allowOnline: boolean;
  allowManual: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: "test" | "live";
  onlineReady: boolean; // enabled + online allowed + keys present
}

export class PaymentUserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const settings: any = await SystemSettings.findOne().select("integrations.paymentGateway").lean();
  const g = settings?.integrations?.paymentGateway || {};
  const keyId = String(g.razorpayKeyId || "").trim();
  const keySecret = String(g.razorpayKeySecret || "").trim();
  const enabled = Boolean(g.enabled);
  const allowOnline = g.allowOnline !== false;
  return {
    enabled,
    allowOnline,
    allowManual: g.allowManual !== false,
    keyId,
    keySecret,
    webhookSecret: String(g.razorpayWebhookSecret || "").trim(),
    mode: keyId.startsWith("rzp_live_") ? "live" : "test",
    onlineReady: enabled && allowOnline && Boolean(keyId && keySecret),
  };
}

const API = "https://api.razorpay.com/v1";

async function rzp(config: PaymentConfig, method: "GET" | "POST", path: string, body?: any) {
  if (!config.keyId || !config.keySecret) {
    throw new PaymentUserError("Online payment is not configured. Please contact support.", 503);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: "Basic " + Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64"),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const desc = json?.error?.description || `HTTP ${res.status}`;
      console.error(`[Payments] Razorpay ${method} ${path} failed:`, desc);
      if (res.status === 401) throw new PaymentUserError("Payment gateway authentication failed. Please contact support.", 503);
      throw new PaymentUserError(`Payment gateway error: ${desc}`, res.status >= 500 ? 503 : 400);
    }
    return json;
  } catch (e: any) {
    if (e instanceof PaymentUserError) throw e;
    if (e?.name === "AbortError") throw new PaymentUserError("Payment gateway timed out. Please try again.", 504);
    console.error("[Payments] Razorpay network error:", e);
    throw new PaymentUserError("Could not reach the payment gateway. Please try again.", 503);
  } finally {
    clearTimeout(timer);
  }
}

export function createOrder(config: PaymentConfig, input: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  return rzp(config, "POST", "/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt.slice(0, 40),
    notes: input.notes,
    payment_capture: 1,
  });
}

export function fetchPayment(config: PaymentConfig, paymentId: string) {
  return rzp(config, "GET", `/payments/${encodeURIComponent(paymentId)}`);
}

export function capturePayment(config: PaymentConfig, paymentId: string, amountPaise: number) {
  return rzp(config, "POST", `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: "INR" });
}

function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Checkout success handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string) {
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
