import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { NotificationLog } from "@/lib/models/NotificationLog";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (payload.role !== "KEY_ADMIN" && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await NotificationLog.find()
      .populate("recipientId", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Fetch Notification Logs Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
