import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Leave } from "@/lib/models/Leave";
import { LeaveBalance } from "@/lib/models/LeaveBalance";
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";
import { LeaveLedger } from "@/lib/models/LeaveLedger";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const employee = await Employee.findOne({ email: user.email });
    if (!employee) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });

    const { leaveId } = await req.json();

    const leave = await Leave.findOne({ _id: leaveId, employeeId: employee._id });
    if (!leave) return NextResponse.json({ error: "Leave not found" }, { status: 404 });

    if (leave.status !== "Pending" && leave.status !== "Approved") {
      return NextResponse.json({ error: "Only pending or approved leave requests can be cancelled" }, { status: 400 });
    }

    // If it was already approved, we need to refund the balance via the Ledger
    if (leave.status === "Approved" && leave.leaveType !== "Loss of Pay") {
      let requestedDays = 0;
      if (leave.isHalfDay) requestedDays = 0.5;
      else if (!leave.hourlyDuration) {
        const diffTime = Math.abs(leave.endDate.getTime() - leave.startDate.getTime());
        requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
      
      if (requestedDays > 0) {
        // Credit back the balance
        await LeaveBalance.updateOne(
          { employeeId: leave.employeeId },
          { $inc: { [`balances.${leave.leaveType}`]: requestedDays } }
        );

        // Record in ledger
        await LeaveLedger.create({
          employeeId: leave.employeeId,
          leaveType: leave.leaveType,
          transactionType: "Credit",
          amount: requestedDays,
          reason: "Refund due to Leave Cancellation",
          leaveRequestId: leave._id
        });
      }
    }

    leave.status = "Cancelled";
    await leave.save();

    return NextResponse.json({ success: true, message: "Leave cancelled successfully" });
  } catch (error) {
    console.error("Cancel Leave Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
