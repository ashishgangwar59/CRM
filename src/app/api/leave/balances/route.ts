import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
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

    let balance = await LeaveBalance.findOne({ employeeId: employee._id }).lean();

    // If no balance exists yet, create default allocation for MVP
    if (!balance) {
      balance = await LeaveBalance.create({
        employeeId: employee._id,
        balances: {
          Paid: 12,
          Casual: 6,
          Sick: 6,
          Maternity: 0,
          Paternity: 0,
          CompOff: 0
        }
      });
    }

    return NextResponse.json({ success: true, data: balance });

  } catch (error) {
    console.error("Leave Balances Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
