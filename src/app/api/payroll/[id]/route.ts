import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    // In Next 15+, params must be awaited
    const { id } = await params;
    
    const payroll = await mongoose.models.Payroll.findById(id)
      .populate("employeeId")
      .lean();

    if (!payroll) return NextResponse.json({ error: "Payroll not found" }, { status: 404 });

    let paymentDetails = null;
    if (payroll.status === "Paid") {
      // First try to find a bulk SalaryPayment record
      const salaryPayment = await mongoose.models.SalaryPayment.findOne({ payrolls: id, status: "Success" }).lean();
      
      if (salaryPayment) {
        paymentDetails = {
          transactionId: salaryPayment.paymentReferenceNumber,
          paymentDate: salaryPayment.paidAt || salaryPayment.createdAt
        };
      } else {
        // Fallback to manual WalletTransaction if paid singly
        const walletTx = await mongoose.models.WalletTransaction.findOne({ referenceId: id, type: "Debit" }).lean();
        if (walletTx) {
          paymentDetails = {
            transactionId: walletTx._id.toString(),
            paymentDate: walletTx.createdAt
          };
        }
      }
    }

    return NextResponse.json({ success: true, data: { ...payroll, paymentDetails } });
  } catch (error) {
    console.error("Fetch Single Payroll Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { action } = await req.json(); // "Lock", "Approve", "Paid"

    const payroll = await Payroll.findById(id);
    if (!payroll) return NextResponse.json({ error: "Payroll not found" }, { status: 404 });

    if (action === "Lock" && payroll.status === "Draft") {
      payroll.status = "Locked";
    } else if (action === "Approve" && payroll.status === "Locked") {
      payroll.status = "Approved";
    } else if (action === "Paid" && payroll.status === "Approved") {
      // Wallet Check
      let wallet = await mongoose.models.CompanyWallet.findOne();
      if (!wallet || wallet.balance < payroll.netSalary) {
        return NextResponse.json({ error: "Insufficient Company Wallet Balance to pay this salary." }, { status: 400 });
      }

      // Deduct wallet
      wallet.balance -= payroll.netSalary;
      await wallet.save();

      // Auth for Audit Log
      const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
      let userId;
      try { 
        if (token) {
          const { verifyAccessToken } = require("@/lib/auth");
          userId = verifyAccessToken(token).userId; 
        }
      } catch (e) {}

      // Create Ledger Entry
      await mongoose.models.WalletTransaction.create({
        type: "Debit",
        amount: payroll.netSalary,
        balanceAfter: wallet.balance,
        description: `Salary Payment for ${payroll.monthYear}`,
        referenceType: "SalaryPayment",
        referenceId: payroll._id,
        createdBy: userId || payroll.employeeId
      });

      payroll.status = "Paid";
    } else {
      return NextResponse.json({ error: `Cannot perform action '${action}' from status '${payroll.status}'` }, { status: 400 });
    }

    await payroll.save();
    return NextResponse.json({ success: true, message: `Payroll status updated to ${payroll.status}` });
  } catch (error) {
    console.error("Update Payroll Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
