import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    const { searchParams } = new URL(req.url);
    const monthYear = searchParams.get("monthYear"); // optional filter

    let query: any = {};
    if (monthYear) {
      query.monthYear = monthYear;
    }

    if (payload.role === "Employee") {
      const user = await User.findById(payload.userId);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const employee = await Employee.findOne({ email: user.email });
      if (!employee) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
      query.employeeId = employee._id;
    }

    const payrolls = await Payroll.find(query)
      .populate("employeeId", "firstName lastName employeeCode department designation")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: payrolls });
  } catch (error) {
    console.error("Fetch Payrolls Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
