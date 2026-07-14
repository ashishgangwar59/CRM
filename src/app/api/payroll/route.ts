import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { verifyAccessToken } from "@/lib/auth";

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
      query.employeeId = payload.userId;
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
