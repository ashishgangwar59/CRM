import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Lead } from "@/lib/models/Lead";
import { LeadActivity } from "@/lib/models/LeadActivity";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");
    const source = searchParams.get("source");
    const priority = searchParams.get("priority");

    let query: any = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    if (status) query.status = status;
    if (stage) query.stage = stage;
    if (source) query.source = source;
    if (priority) query.priority = priority;

    if (payload.role === "Employee") {
      query.ownerId = payload.userId;
    }

    const leads = await Lead.find(query)
      .populate("ownerId", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    console.error("Fetch Leads Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const body = await req.json();

    const newLead = await Lead.create({
      ...body,
      status: "Open",
      stage: "New",
      ownerId: payload.userId
    });

    // Auto-create initial activity
    await LeadActivity.create({
      leadId: newLead._id,
      type: "StatusChange",
      content: "Lead created and marked as New.",
      createdBy: payload.userId
    });

    return NextResponse.json({ success: true, message: "Lead created successfully", data: newLead });
  } catch (error) {
    console.error("Create Lead Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
