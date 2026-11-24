import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Investor } from "@/lib/models/Investor";
import { getRequestAuth } from "@/lib/kyc/service";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Admin / Key Admin manually approves an investor's KYC (e.g. provider down, name spelling issue).
 * Body: { investorId, reason }
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = getRequestAuth(req);
    if (!auth || (auth.role !== "ADMIN" && auth.role !== "KEYADMIN")) {
      return NextResponse.json({ success: false, error: "Only Admin / Key Admin can override KYC." }, { status: 403 });
    }

    const { investorId, reason } = await req.json().catch(() => ({}));
    if (!investorId || !mongoose.Types.ObjectId.isValid(investorId)) {
      return NextResponse.json({ success: false, error: "Investor ID is required." }, { status: 400 });
    }
    if (!reason || String(reason).trim().length < 5) {
      return NextResponse.json({ success: false, error: "Please enter a reason (at least 5 characters)." }, { status: 400 });
    }

    const investor = await Investor.findByIdAndUpdate(
      investorId,
      {
        $set: {
          "kycVerification.status": "Manual Override",
          "kycVerification.overriddenBy": new mongoose.Types.ObjectId(auth.userId),
          "kycVerification.overrideReason": String(reason).trim().slice(0, 500),
          "kycVerification.overriddenAt": new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!investor) return NextResponse.json({ success: false, error: "Investor not found." }, { status: 404 });
    await logAudit(
      req, auth.userId, "KYC_MANUAL_OVERRIDE", "Investors",
      `KYC manually approved for ${(investor as any).investorCode || investorId} (${(investor as any).fullName || ""}). Reason: ${String(reason).trim()}`,
      null, { investorId, reason: String(reason).trim() }
    );
    return NextResponse.json({ success: true, data: investor });
  } catch (e) {
    console.error("[KYC] Override error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
