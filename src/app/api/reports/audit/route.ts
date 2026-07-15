import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { AuditLog } from "@/lib/models/AuditLog";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (payload.role !== "Super Admin" && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await AuditLog.find()
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Fetch Audit Logs Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
