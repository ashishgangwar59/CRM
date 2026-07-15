import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { LeadActivity } from "@/lib/models/LeadActivity";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (payload.role !== "Super Admin" && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await LeadActivity.find()
      .populate("createdBy", "firstName lastName")
      .populate("leadId", "firstName lastName company")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, data: activities });
  } catch (error) {
    console.error("Lead Timeline Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
