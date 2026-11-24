import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { InvestmentPayment } from "@/lib/models/InvestmentPayment";
import { PaymentUserError } from "@/lib/payments/razorpay";
import {
  ADMIN_ROLES, getAuth, markPaid, paymentErrorResponse, paymentView, refreshInvestorPayment, resolvePayer,
} from "@/lib/payments/service";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** GET one payment (receipt view). Admin, or the investor who owns it. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new PaymentUserError("Payment not found.", 404);
    const payment = await InvestmentPayment.findById(id).lean();
    if (!payment) throw new PaymentUserError("Payment not found.", 404);
    await resolvePayer(req, String(payment.investorId), new URL(req.url).searchParams.get("payToken"));
    return NextResponse.json({ success: true, data: paymentView(payment) });
  } catch (e) {
    const { body, status } = paymentErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}

/**
 * POST { action: "approve" | "reject", reason? } – Admin / Key Admin reviews a manual (UTR) payment.
 * Approve → Paid + receipt number + email. Reject → reason shown to the investor.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = getAuth(req);
    if (!auth || !ADMIN_ROLES.has(auth.role)) throw new PaymentUserError("Only Admin / Key Admin can verify payments.", 403);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new PaymentUserError("Payment not found.", 404);
    const body = await req.json().catch(() => ({}));
    const payment = await InvestmentPayment.findById(id);
    if (!payment) throw new PaymentUserError("Payment not found.", 404);
    if (payment.method !== "manual") throw new PaymentUserError("Only bank-transfer (UTR) payments need manual verification.");
    if (payment.status !== "Pending Verification") throw new PaymentUserError(`This payment is already ${payment.status}.`);

    if (body.action === "approve") {
      const { payment: paid } = await markPaid(payment._id, {
        verifiedBy: new mongoose.Types.ObjectId(auth.userId),
        verifiedAt: new Date(),
        paidAt: payment.manual?.paymentDate ? new Date(`${payment.manual.paymentDate}T12:00:00+05:30`) : new Date(),
      }, { req, actorUserId: auth.userId, action: "PAYMENT_MANUAL_APPROVED" });
      return NextResponse.json({ success: true, message: `Payment approved. Receipt ${paid?.receiptNo} generated.`, data: paymentView(paid) });
    }

    if (body.action === "reject") {
      const reason = String(body.reason || "").trim();
      if (reason.length < 5) throw new PaymentUserError("Please enter a rejection reason (at least 5 characters).");
      payment.status = "Rejected";
      payment.rejectionReason = reason.slice(0, 500);
      payment.verifiedBy = new mongoose.Types.ObjectId(auth.userId);
      payment.verifiedAt = new Date();
      await payment.save();
      await refreshInvestorPayment(payment.investorId);
      await logAudit(req, auth.userId, "PAYMENT_MANUAL_REJECTED", "Investment Payments",
        `UTR ${payment.manual?.utrNo} (Rs ${payment.amount}) for ${payment.investorCode} rejected: ${reason}`, null, { paymentId: id });
      return NextResponse.json({ success: true, message: "Payment rejected.", data: paymentView(payment) });
    }

    throw new PaymentUserError("Invalid action.");
  } catch (e) {
    const { body, status } = paymentErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
