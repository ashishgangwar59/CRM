import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TaxConfiguration } from "@/lib/models/TaxConfiguration";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const taxConfig = await TaxConfiguration.findOne({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: taxConfig });
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
    await TaxConfiguration.updateMany({ isActive: true }, { $set: { isActive: false } });

    const newConfig = await TaxConfiguration.create({
      ...body,
      createdBy: payload.userId,
    });

    return NextResponse.json({ success: true, data: newConfig }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
