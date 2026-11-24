import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { InvestmentPayment } from "@/lib/models/InvestmentPayment";
import { PaymentUserError } from "@/lib/payments/razorpay";
import { ADMIN_ROLES, getAuth, paymentErrorResponse, paymentView } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * Admin list for Invoice → Investment Payments.
 * GET ?status=Paid|Pending Verification|Rejected|Failed|all &search=&method=&page=&limit=&from=&to=
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = getAuth(req);
    if (!auth || !ADMIN_ROLES.has(auth.role)) throw new PaymentUserError("Only Admin / Key Admin can view investment payments.", 403);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const method = searchParams.get("method") || "";
    const search = (searchParams.get("search") || "").trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100000, Math.max(1, parseInt(searchParams.get("limit") || "10")));

    // Abandoned checkout attempts ("Created") are never listed.
    const query: any = { status: status === "all" ? { $ne: "Created" } : status };
    if (method === "online" || method === "manual") query.method = method;
    if (search) {
      const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      query.$or = [
        { investorName: rx }, { investorCode: rx }, { applicationNo: rx }, { receiptNo: rx },
        { email: rx }, { phone: rx }, { "manual.utrNo": rx }, { razorpayPaymentId: rx },
      ];
    }
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(`${from}T00:00:00+05:30`);
      if (to) query.createdAt.$lte = new Date(`${to}T23:59:59+05:30`);
    }

    const [total, rows, counts] = await Promise.all([
      InvestmentPayment.countDocuments(query),
      InvestmentPayment.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      InvestmentPayment.aggregate([
        { $match: { status: { $ne: "Created" } } },
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: rows.map(paymentView),
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      counts: Object.fromEntries(counts.map(c => [c._id, { count: c.count, amount: c.amount }])),
    });
  } catch (e) {
    const { body, status } = paymentErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
