import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { PfConfiguration } from "@/lib/models/PfConfiguration";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pfConfig = await PfConfiguration.findOne({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: pfConfig });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    if (payload.role !== "ADMIN" && payload.role !== "KEY_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Inactivate older configs
    await PfConfiguration.updateMany({ isActive: true }, { $set: { isActive: false } });

    const newConfig = await PfConfiguration.create({
      ...body,
      createdBy: payload.userId,
    });

    return NextResponse.json({ success: true, data: newConfig }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
