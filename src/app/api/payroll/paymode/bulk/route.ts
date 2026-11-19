import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payroll } from "@/lib/models/Payroll";
import { verifyAccessToken } from "@/lib/auth";

const ALLOWED_ROLES = ["ADMIN", "KEY_ADMIN", "KEYADMIN"];

// Bulk-update the pay mode (Online / Cash) for every salary slip of a month.
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = verifyAccessToken(token);
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Only Admin or Key Admin can change the pay mode." }, { status: 403 });
    }

    const { monthYear, payMode } = await req.json();
    if (!monthYear) return NextResponse.json({ error: "Payroll month is required." }, { status: 400 });
    if (payMode !== "Account" && payMode !== "Cash") {
      return NextResponse.json({ error: "Pay mode must be Account or Cash." }, { status: 400 });
    }

    const result = await Payroll.updateMany({ monthYear }, { $set: { payMode } });
    return NextResponse.json({
      success: true,
      updated: result.modifiedCount,
      matched: result.matchedCount,
      message: `Pay mode set to ${payMode} for ${result.matchedCount} salary slips of ${monthYear}.`,
    });
  } catch (error: any) {
    console.error("Bulk Pay Mode Update Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
