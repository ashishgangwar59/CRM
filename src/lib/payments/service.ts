import crypto from "crypto";
import mongoose from "mongoose";
import { Investor } from "@/lib/models/Investor";
import { User } from "@/lib/models/User";
import { Counter } from "@/lib/models/Counter";
import { InvestmentPayment, IInvestmentPayment } from "@/lib/models/InvestmentPayment";
import { verifyAccessToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendPaymentReceiptEmail } from "@/lib/mail";
import { PaymentUserError } from "./razorpay";

export const ADMIN_ROLES = new Set(["ADMIN", "KEYADMIN"]);

export function getAuth(req: Request): { userId: string; role: string } | null {
  const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
  const authHeader = req.headers.get("authorization");
  const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null);
  if (!token) return null;
  try {
    const payload: any = verifyAccessToken(token);
    if (!payload?.userId) return null;
    return { userId: String(payload.userId), role: String(payload.role || "").toUpperCase().replace(/_/g, "") };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pay token – lets an applicant pay right after submitting the public Debenture
// Application without logging in. Signed, tied to one investor, valid 48 hours.
// ---------------------------------------------------------------------------

const PAY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
function payTokenSecret() {
  return process.env.PAYMENT_TOKEN_SECRET || process.env.JWT_SECRET || "payment-dev-secret";
}

export function createPayToken(investorId: string): string {
  const exp = Date.now() + PAY_TOKEN_TTL_MS;
  const sig = crypto.createHmac("sha256", payTokenSecret()).update(`${investorId}.${exp}`).digest("hex");
  return `${investorId}.${exp}.${sig}`;
}

export function verifyPayToken(token: string | null | undefined, investorId: string): boolean {
  if (!token) return false;
  const [id, expStr, sig] = token.split(".");
  if (id !== investorId || !expStr || !sig || Number(expStr) < Date.now()) return false;
  const expected = crypto.createHmac("sha256", payTokenSecret()).update(`${id}.${expStr}`).digest("hex");
  return expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

/**
 * Returns the investor the requester is allowed to pay for:
 *  - the logged-in investor's own investment,
 *  - any investment for Admin / Key Admin,
 *  - or the investment named in a valid pay token.
 */
export async function resolvePayer(req: Request, investorId: string, payToken?: string | null) {
  if (!investorId || !mongoose.Types.ObjectId.isValid(investorId)) throw new PaymentUserError("Investment not found.", 404);
  const investor = await Investor.findById(investorId);
  if (!investor) throw new PaymentUserError("Investment not found.", 404);

  const auth = getAuth(req);
  if (auth && ADMIN_ROLES.has(auth.role)) return { investor, auth, isAdmin: true };

  if (auth?.role === "INVESTOR") {
    const user: any = await User.findById(auth.userId).select("email").lean();
    const owns = (investor.userId && String(investor.userId) === auth.userId) ||
      (user?.email && String(investor.email || "").toLowerCase() === String(user.email).toLowerCase());
    if (owns) return { investor, auth, isAdmin: false };
  }

  if (verifyPayToken(payToken, investorId)) return { investor, auth, isAdmin: false };
  throw new PaymentUserError("You are not allowed to pay for this investment. Please log in.", 403);
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export async function getTotals(investorId: string | mongoose.Types.ObjectId) {
  const id = new mongoose.Types.ObjectId(String(investorId));
  const rows = await InvestmentPayment.aggregate([
    { $match: { investorId: id, status: { $in: ["Paid", "Pending Verification"] } } },
    { $group: { _id: "$status", total: { $sum: "$amount" }, last: { $max: "$paidAt" } } },
  ]);
  const paid = rows.find(r => r._id === "Paid");
  const pending = rows.find(r => r._id === "Pending Verification");
  return { amountPaid: paid?.total || 0, pendingVerificationAmount: pending?.total || 0, lastPaidAt: paid?.last || undefined };
}

export async function getInvestorBalance(investor: any) {
  const totals = await getTotals(investor._id);
  const due = Number(investor.investmentAmount) || 0;
  return {
    amountDue: due,
    ...totals,
    balance: Math.max(0, Math.round((due - totals.amountPaid - totals.pendingVerificationAmount) * 100) / 100),
  };
}

export async function refreshInvestorPayment(investorId: string | mongoose.Types.ObjectId) {
  const investor: any = await Investor.findById(investorId).select("investmentAmount").lean();
  if (!investor) return;
  const totals = await getTotals(investorId);
  const due = Number(investor.investmentAmount) || 0;
  const status = totals.amountPaid <= 0 ? "Unpaid" : totals.amountPaid + 0.5 >= due ? "Paid" : "Partially Paid";
  await Investor.updateOne({ _id: investorId }, {
    $set: {
      "payment.status": status,
      "payment.amountPaid": totals.amountPaid,
      "payment.pendingVerificationAmount": totals.pendingVerificationAmount,
      ...(totals.lastPaidAt ? { "payment.lastPaidAt": totals.lastPaidAt } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Receipt numbers: RCPT/2026-27/00001 (Indian financial year, IST)
// ---------------------------------------------------------------------------

function financialYear(date = new Date()) {
  const ist = new Date(date.getTime() + 330 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1; // FY starts in April
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

async function nextReceiptNo() {
  const fy = financialYear();
  const counter: any = await Counter.findByIdAndUpdate(
    { _id: `paymentReceipt-${fy}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `RCPT/${fy}/${String(counter.seq).padStart(5, "0")}`;
}

/**
 * Marks a payment Paid exactly once (safe to call from both checkout verify and webhook),
 * assigns the receipt number, updates investor totals, emails the receipt and logs it.
 */
export async function markPaid(
  paymentId: string | mongoose.Types.ObjectId,
  extra: Partial<IInvestmentPayment> & Record<string, any>,
  ctx: { req?: Request | null; actorUserId?: string | null; action: string }
) {
  const updated = await InvestmentPayment.findOneAndUpdate(
    { _id: paymentId, status: { $ne: "Paid" } },
    { $set: { ...extra, status: "Paid", paidAt: extra.paidAt || new Date() } },
    { new: true }
  );
  if (!updated) {
    // Already paid earlier (e.g. webhook arrived first) – return the existing record.
    return { payment: await InvestmentPayment.findById(paymentId), alreadyPaid: true };
  }

  for (let attempt = 0; attempt < 3 && !updated.receiptNo; attempt++) {
    try {
      updated.receiptNo = await nextReceiptNo();
      await updated.save();
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
      updated.receiptNo = undefined;
    }
  }

  await refreshInvestorPayment(updated.investorId);

  // Keep the debenture form's payment fields in sync for the first payment.
  const ref = updated.method === "online" ? updated.razorpayPaymentId : updated.manual?.utrNo;
  await Investor.updateOne(
    { _id: updated.investorId, $or: [{ "debentureForm.transactionUtrNo": { $in: [null, ""] } }, { "debentureForm.transactionUtrNo": { $exists: false } }] },
    { $set: { "debentureForm.transactionUtrNo": ref || "", "debentureForm.modeOfPayment": updated.method === "online" ? "Online (Razorpay)" : (updated.manual?.mode || "NEFT/RTGS") } }
  );

  await logAudit(
    ctx.req || null, ctx.actorUserId || null, ctx.action, "Investment Payments",
    `Payment ${updated.receiptNo} of Rs ${updated.amount} marked Paid for ${updated.investorCode || updated.investorId} (${updated.investorName}) via ${updated.method === "online" ? "Razorpay " + (updated.razorpayPaymentId || "") : "UTR " + (updated.manual?.utrNo || "")}`,
    null, { paymentId: String(updated._id), receiptNo: updated.receiptNo }
  );

  // Email the receipt (never fail the payment because of email problems).
  if (updated.email) {
    sendPaymentReceiptEmail(paymentView(updated))
      .then(sent => sent ? InvestmentPayment.updateOne({ _id: updated._id }, { $set: { receiptEmailedAt: new Date() } }) : null)
      .catch(err => console.error("[Payments] Receipt email failed:", err));
  }

  return { payment: updated, alreadyPaid: false };
}

/** Data safe to send to the browser. */
export function paymentView(p: any) {
  return {
    _id: String(p._id),
    receiptNo: p.receiptNo || "",
    investorId: String(p.investorId),
    investorCode: p.investorCode || "",
    applicationNo: p.applicationNo || "",
    investorName: p.investorName,
    email: p.email || "",
    phone: p.phone || "",
    address: p.address || "",
    panNumber: p.panNumber || "",
    amount: p.amount,
    currency: p.currency || "INR",
    method: p.method,
    status: p.status,
    razorpayOrderId: p.razorpayOrderId || "",
    razorpayPaymentId: p.razorpayPaymentId || "",
    gatewayMethod: p.gatewayMethod || "",
    gatewayMode: p.gatewayMode || "",
    failureReason: p.failureReason || "",
    manual: {
      utrNo: p.manual?.utrNo || "",
      paymentDate: p.manual?.paymentDate || "",
      mode: p.manual?.mode || "",
      bankName: p.manual?.bankName || "",
      screenshotUrl: p.manual?.screenshotUrl || "",
    },
    paidAt: p.paidAt || null,
    verifiedAt: p.verifiedAt || null,
    rejectionReason: p.rejectionReason || "",
    createdAt: p.createdAt,
  };
}

export function investorSnapshot(investor: any) {
  const f = investor.debentureForm || {};
  const address = [f.address, f.city, f.state, f.pinCode].filter(Boolean).join(", ");
  return {
    investorId: investor._id,
    userId: investor.userId,
    investorCode: investor.investorCode,
    applicationNo: f.applicationNo,
    investorName: investor.fullName,
    email: investor.email,
    phone: investor.phone,
    address,
    panNumber: investor.kycDocs?.panNumber || "",
  };
}

export function paymentErrorResponse(e: any) {
  if (e instanceof PaymentUserError) return { body: { success: false, error: e.message }, status: e.status };
  console.error("[Payments] Unexpected error:", e);
  return { body: { success: false, error: "Payment request failed due to a server error. Please try again." }, status: 500 };
}
