import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { verifyAccessToken } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = verifyAccessToken(token);
    if (user.role !== "ADMIN" && user.role !== "KEY_ADMIN") {
      return NextResponse.json({ error: "Only admins can update payroll dates." }, { status: 403 });
    }

    const { monthYear, salaryPeriodStart, salaryPeriodEnd } = await req.json();
    if (!monthYear || !salaryPeriodStart || !salaryPeriodEnd) {
      return NextResponse.json({ error: "Month, start date, and end date are required." }, { status: 400 });
    }
    const start = new Date(salaryPeriodStart);
    const end = new Date(salaryPeriodEnd);
    if (start > end) return NextResponse.json({ error: "Start date cannot be after end date." }, { status: 400 });

    const result = await Payroll.updateMany(
      { monthYear },
      { $set: { salaryPeriodStart: start, salaryPeriodEnd: end } }
    );
    return NextResponse.json({ success: true, updated: result.modifiedCount });
  } catch (error: any) {
    console.error("Bulk Payroll Date Update Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
