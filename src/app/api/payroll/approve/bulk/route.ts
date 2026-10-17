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
    if (user.role !== "ADMIN" && user.role !== "KEY_ADMIN") return NextResponse.json({ error: "Only admins can bulk approve payrolls." }, { status: 403 });
    const { monthYear } = await req.json();
    if (!monthYear) return NextResponse.json({ error: "Payroll month is required." }, { status: 400 });
    const result = await Payroll.updateMany({ monthYear, status: { $in: ["Draft", "Locked"] } }, { $set: { status: "Approved" } });
    return NextResponse.json({ success: true, approved: result.modifiedCount, message: `${result.modifiedCount} salary slips approved for ${monthYear}.` });
  } catch (error: any) {
    console.error("Bulk Approve Payroll Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
