import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CompanyWallet } from "@/lib/models/CompanyWallet";
import { WalletTransaction } from "@/lib/models/WalletTransaction";
import { verifyAccessToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth Check
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const { type, amount, description } = await req.json(); // type = "Credit" | "Debit"

    if (amount <= 0) return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });

    let wallet = await CompanyWallet.findOne();
    if (!wallet) {
      wallet = await CompanyWallet.create({ balance: 0 });
    }

    if (type === "Debit" && wallet.balance < amount) {
      return NextResponse.json({ error: "Insufficient Wallet Balance" }, { status: 400 });
    }

    const newBalance = type === "Credit" ? wallet.balance + amount : wallet.balance - amount;

    // Update Wallet
    wallet.balance = newBalance;
    await wallet.save();

    // Log Transaction
    const transaction = await WalletTransaction.create({
      type,
      amount,
      balanceAfter: newBalance,
      description,
      referenceType: "Manual",
      createdBy: payload.userId
    });

    return NextResponse.json({ success: true, message: `Successfully ${type.toLowerCase()}ed wallet.`, data: transaction });
  } catch (error) {
    console.error("Wallet Transaction Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
