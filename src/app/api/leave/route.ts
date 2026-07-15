import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Leave } from "@/lib/models/Leave";
import { LeaveBalance } from "@/lib/models/LeaveBalance";
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";

export async function GET(req: Request) {
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

    const leaves = await Leave.find({ employeeId: employee._id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: leaves });
  } catch (error) {
    console.error("Fetch Leaves Error:", error);
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

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const employee = await Employee.findOne({ email: user.email });
    if (!employee) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });

    const { leaveType, startDate, endDate, isHalfDay, hourlyDuration, reason } = await req.json();

    // Basic calculation for requested days
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      return NextResponse.json({ error: "End date cannot be before start date" }, { status: 400 });
    }

    let requestedDays = 0;
    if (hourlyDuration) {
      requestedDays = 0; // Hourly leaves don't deduct full days in MVP, handled separately or as fraction
    } else if (isHalfDay) {
      requestedDays = 0.5;
    } else {
      // Calculate diff in days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    }

    // Check Balance if it's not Loss of Pay
    if (leaveType !== "Loss of Pay") {
      const balanceDoc = await LeaveBalance.findOne({ employeeId: employee._id });
      const currentBalance = balanceDoc ? (balanceDoc.balances as any)[leaveType] : 0;
      
      if (currentBalance < requestedDays) {
        return NextResponse.json({ error: `Insufficient balance for ${leaveType}. You only have ${currentBalance} days left.` }, { status: 400 });
      }
    }

    // Apply Sandwich Policy Logic here if needed. 
    // For MVP, we'll assume `requestedDays` is accurate to what the user inputted or we'd automatically add +2 if a weekend is detected.
    
    const leave = await Leave.create({
      employeeId: employee._id,
      leaveType,
      startDate: start,
      endDate: end,
      isHalfDay,
      hourlyDuration,
      appliedSandwichDays: 0,
      reason,
      status: "Pending"
    });

    return NextResponse.json({ success: true, message: "Leave applied successfully", data: leave });
  } catch (error: any) {
    console.error("Apply Leave Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
