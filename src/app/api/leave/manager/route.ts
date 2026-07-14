import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Leave } from "@/lib/models/Leave";
import { LeaveBalance } from "@/lib/models/LeaveBalance";
import { LeaveLedger } from "@/lib/models/LeaveLedger";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Fetch all pending leaves across the team
    const leaves = await Leave.find({ status: "Pending" })
      .populate("employeeId", "firstName lastName employeeCode")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: leaves });
  } catch (error) {
    console.error("Manager Fetch Leaves Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const { leaveId, action, managerNotes } = await req.json(); // action = "Approve" | "Reject"

    const leave = await Leave.findById(leaveId);
    if (!leave) return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    if (leave.status !== "Pending") return NextResponse.json({ error: "Leave is not pending" }, { status: 400 });

    if (action === "Approve") {
      leave.status = "Approved";
      
      // Deduct balance
      if (leave.leaveType !== "Loss of Pay") {
        let requestedDays = 0;
        if (leave.isHalfDay) requestedDays = 0.5;
        else if (!leave.hourlyDuration) {
          const diffTime = Math.abs(leave.endDate.getTime() - leave.startDate.getTime());
          requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        if (requestedDays > 0) {
          // Debit the balance
          await LeaveBalance.updateOne(
            { employeeId: leave.employeeId },
            { $inc: { [`balances.${leave.leaveType}`]: -requestedDays } }
          );

          // Record in ledger
          await LeaveLedger.create({
            employeeId: leave.employeeId,
            leaveType: leave.leaveType,
            transactionType: "Debit",
            amount: requestedDays,
            reason: "Leave Approved",
            leaveRequestId: leave._id
          });
        }
      }
    } else if (action === "Reject") {
      leave.status = "Rejected";
    }

    leave.managerId = payload.userId;
    leave.managerNotes = managerNotes || "";
    await leave.save();

    return NextResponse.json({ success: true, message: `Leave ${action.toLowerCase()}d successfully` });
  } catch (error) {
    console.error("Manager Leave Action Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
