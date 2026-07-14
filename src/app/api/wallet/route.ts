import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CompanyWallet } from "@/lib/models/CompanyWallet";
import { WalletTransaction } from "@/lib/models/WalletTransaction";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth Check
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // In a real app with RBAC: if (!payload.isAdmin) return 403;

    let wallet = await CompanyWallet.findOne();
    if (!wallet) {
      wallet = await CompanyWallet.create({ balance: 0 });
    }

    const transactions = await WalletTransaction.find()
      .populate("createdBy", "firstName lastName")
      .populate({
        path: "referenceId",
        select: "monthYear employeeId",
        populate: { path: "employeeId", select: "firstName lastName employeeCode" }
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, data: { balance: wallet.balance, transactions } });
  } catch (error) {
    console.error("Fetch Wallet Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
