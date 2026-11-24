import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { connectToDatabase } from "@/lib/db";
import { InvestmentPayment } from "@/lib/models/InvestmentPayment";
import { PaymentUserError, getPaymentConfig } from "@/lib/payments/razorpay";
import {
  getInvestorBalance, investorSnapshot, paymentErrorResponse, paymentView, refreshInvestorPayment, resolvePayer,
} from "@/lib/payments/service";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
};
const MODES = ["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash Deposit", "Other"];

/**
 * multipart/form-data:
 *   investorId, amount, utrNo, paymentDate (YYYY-MM-DD), mode, bankName?, payToken?, screenshot (file)
 * Records a bank-transfer payment as "Pending Verification" for admin approval.
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const config = await getPaymentConfig();
    if (!config.enabled || !config.allowManual) throw new PaymentUserError("Manual payment entry is not enabled.", 403);

    const form = await req.formData();
    const { investor, auth } = await resolvePayer(req, String(form.get("investorId") || ""), form.get("payToken") as string | null);

    const amount = Math.round(Number(form.get("amount")) * 100) / 100;
    const utrNo = String(form.get("utrNo") || "").trim().toUpperCase().replace(/\s+/g, "");
    const paymentDate = String(form.get("paymentDate") || "").trim();
    const mode = String(form.get("mode") || "").trim();
    const bankName = String(form.get("bankName") || "").trim().slice(0, 100);
    const file = form.get("screenshot");

    if (!Number.isFinite(amount) || amount < 1) throw new PaymentUserError("Enter a valid amount.");
    if (!/^[A-Z0-9/-]{6,40}$/.test(utrNo)) throw new PaymentUserError("Enter a valid Transaction / UTR No. (6–40 letters/numbers).");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) throw new PaymentUserError("Select the payment date.");
    if (new Date(paymentDate).getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new PaymentUserError("Payment date cannot be in the future.");
    if (!MODES.includes(mode)) throw new PaymentUserError("Select the payment mode.");
    if (!file || typeof file === "string") throw new PaymentUserError("Please upload the transaction screenshot.");
    const mime = (file as File).type;
    if (!ALLOWED[mime]) throw new PaymentUserError("Screenshot must be a JPG, PNG, WEBP or PDF file.");
    if ((file as File).size > 5 * 1024 * 1024) throw new PaymentUserError("Screenshot must be 5 MB or smaller.");

    const { balance } = await getInvestorBalance(investor);
    if (balance <= 0) throw new PaymentUserError("This investment is already fully paid (or payments are awaiting verification).");
    if (amount > balance) throw new PaymentUserError(`Amount cannot be more than the balance due (Rs ${balance.toLocaleString("en-IN")}).`);

    // The same UTR can't be used twice (unless an earlier entry was rejected).
    const duplicate = await InvestmentPayment.findOne({ "manual.utrNo": utrNo, status: { $in: ["Pending Verification", "Paid"] } }).lean();
    if (duplicate) throw new PaymentUserError("This Transaction / UTR No. has already been submitted.");

    const fileName = `${uuidv4()}${ALLOWED[mime]}`;
    const dir = path.join(process.cwd(), "public/uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), Buffer.from(await (file as File).arrayBuffer()));

    const payment = await InvestmentPayment.create({
      ...investorSnapshot(investor),
      amount,
      method: "manual",
      status: "Pending Verification",
      manual: { utrNo, paymentDate, mode, bankName, screenshotUrl: `/api/uploads/${fileName}` },
      submittedBy: auth?.userId,
    });
    await refreshInvestorPayment(investor._id);
    await logAudit(req, auth?.userId || null, "PAYMENT_MANUAL_SUBMITTED", "Investment Payments",
      `UTR ${utrNo} for Rs ${amount} submitted for ${investor.investorCode} (${investor.fullName})`, null, { paymentId: String(payment._id) });

    return NextResponse.json({
      success: true,
      message: "Payment details submitted. Your receipt will be generated after our team verifies the transaction.",
      data: paymentView(payment),
    });
  } catch (e) {
    const { body, status } = paymentErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
