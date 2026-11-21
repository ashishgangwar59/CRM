import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { generateAndEmailBackup } from "@/lib/cronService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // zipping + uploading large attachments can take a while

async function checkAuth(req: Request) {
  const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) return null;

    const role = (payload.role || "").toUpperCase().replace(/_/g, "");
    if (role !== "KEYADMIN" && role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const authorized = await checkAuth(req);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await generateAndEmailBackup();

    return NextResponse.json({
      success: true,
      message: `Backup (${result.totalMb} MB, zipped) sent to ${result.sendTo} in ${result.emails} email(s).`,
    });
  } catch (error: any) {
    console.error("Manual Backup Email Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send backup email" }, { status: 500 });
  }
}
