import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { IncentiveConfiguration } from "@/lib/models/IncentiveConfiguration";
import { verifyAccessToken } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const userId = payload.userId;

    const body = await req.json();
    const { id } = await params;
    
    const incentive = await IncentiveConfiguration.findByIdAndUpdate(
      id, 
      { ...body, updatedBy: userId }, 
      { new: true }
    );
    
    if (!incentive) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(incentive);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const userId = payload.userId;

    const { id } = await params;
    const incentive = await IncentiveConfiguration.findByIdAndDelete(id);
    if (!incentive) return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
