import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { CompanyWallet } from "@/lib/models/CompanyWallet";
import { WalletTransaction } from "@/lib/models/WalletTransaction";
import { SalaryPayment } from "@/lib/models/SalaryPayment";
import { verifyAccessToken } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth Check
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const { payrollIds, monthYear } = await req.json();

    if (!payrollIds || payrollIds.length === 0) {
      return NextResponse.json({ error: "No payrolls selected for payment." }, { status: 400 });
    }

    // 1. Fetch all selected payrolls
    const payrolls = await Payroll.find({ _id: { $in: payrollIds } });
    
    // Verify all payrolls are at least "Approved" and not already "Paid"
    for (const p of payrolls) {
      if (p.status === "Paid") {
        return NextResponse.json({ error: "One or more selected payrolls are already paid." }, { status: 400 });
      }
      if (p.status === "Draft") {
        return NextResponse.json({ error: "One or more selected payrolls are still in Draft status. Please Lock and Approve them first." }, { status: 400 });
      }
    }

    // Calculate total amount
    const totalAmount = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

    // 2. Create SalaryPayment Record (Pending)
    const referenceNumber = `PAY-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const paymentRecord = await SalaryPayment.create({
      paymentReferenceNumber: referenceNumber,
      monthYear,
      totalAmount,
      payrolls: payrollIds,
      status: "Pending",
      createdBy: payload.userId
    });

    // 3. Wallet Check
    let wallet = await CompanyWallet.findOne();
    if (!wallet || wallet.balance < totalAmount) {
      // Fail the transaction
      paymentRecord.status = "Failed";
      paymentRecord.failureReason = "Insufficient Company Wallet Balance";
      await paymentRecord.save();
      return NextResponse.json({ error: "Insufficient Company Wallet Balance to process this bulk payment.", data: paymentRecord }, { status: 400 });
    }

    // 4. Execute Payment (Deduct Wallet)
    wallet.balance -= totalAmount;
    await wallet.save();

    // 5. Create Wallet Ledger Entry
    await WalletTransaction.create({
      type: "Debit",
      amount: totalAmount,
      balanceAfter: wallet.balance,
      description: `Bulk Salary Payment (${payrolls.length} employees) for ${monthYear}`,
      referenceType: "SalaryPayment",
      createdBy: payload.userId
    });

    // 6. Mark all Payrolls as Paid
    await Payroll.updateMany(
      { _id: { $in: payrollIds } },
      { $set: { status: "Paid" } }
    );

    // 7. Mark Payment Record as Success
    paymentRecord.status = "Success";
    paymentRecord.paidAt = new Date();
    await paymentRecord.save();

    // Trigger Notifications
    payrolls.forEach(p => {
      notificationService.notifySalaryPaid(p.employeeId.toString(), p.monthYear, p.netSalary);
    });

    await logAudit(req, payload.userId, "Bulk Salary Payment", "Payroll", `Processed ${payrolls.length} salaries for ₹${totalAmount}`, { previousWalletBalance: wallet.balance }, { newWalletBalance: wallet.balance - totalAmount });

    return NextResponse.json({ success: true, message: `Successfully paid ${payrolls.length} salaries.`, data: paymentRecord });
  } catch (error) {
    console.error("Bulk Salary Payment Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
