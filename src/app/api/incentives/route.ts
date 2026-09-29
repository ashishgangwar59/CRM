import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { IncentiveConfiguration } from "@/lib/models/IncentiveConfiguration";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const userId = payload.userId;

    const searchParams = req.nextUrl.searchParams;
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");

    let query: any = {};
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;

    const incentives = await IncentiveConfiguration.find(query)
      .populate("targetId", "firstName lastName employeeCode")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    return NextResponse.json(incentives);
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
    const userId = payload.userId;

    const body = await req.json();
    
    // Deactivate existing rule of same condition to prevent duplicate
    const query: any = { targetType: body.targetType, isActive: true };
    if (body.targetType === "Employee" || body.targetType === "TeamOwner") {
       if (body.targetId) query.targetId = body.targetId;
       else query.targetId = { $exists: false }; // Global team owner rule
    } else if (body.targetType === "Designation") {
       query.designationName = body.designationName;
    }

    // Inactivate any overlapping active rule
    await IncentiveConfiguration.updateMany(query, { $set: { isActive: false } });

    const newIncentive = await IncentiveConfiguration.create({
      ...body,
      createdBy: userId,
    });

    return NextResponse.json(newIncentive, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
