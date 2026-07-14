import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { LeadActivity } from "@/lib/models/LeadActivity";
import { Lead } from "@/lib/models/Lead";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const { type, content, nextFollowUp } = await req.json(); // type: "Note", "Call", "Email"

    if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

    const activity = await LeadActivity.create({
      leadId: id,
      type,
      content,
      createdBy: payload.userId
    });

    if (nextFollowUp) {
      await Lead.findByIdAndUpdate(id, { nextFollowUp: new Date(nextFollowUp) });
    }

    return NextResponse.json({ success: true, message: "Activity added successfully", data: activity });
  } catch (error) {
    console.error("Create Lead Activity Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
