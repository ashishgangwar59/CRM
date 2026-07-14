import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Lead } from "@/lib/models/Lead";
import { LeadActivity } from "@/lib/models/LeadActivity";
import { logAudit } from "@/lib/audit";
import { LeadAttachment } from "@/lib/models/LeadAttachment";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lead = await Lead.findById(id).populate("ownerId", "firstName lastName email phone");
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const activities = await LeadActivity.find({ leadId: id })
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    const attachments = await LeadAttachment.find({ leadId: id })
      .populate("uploadedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: { lead, activities, attachments } });
  } catch (error) {
    console.error("Fetch Single Lead Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const updates = await req.json();
    const lead = await Lead.findById(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const oldStage = lead.stage;
    const oldStatus = lead.status;
    
    // Update fields
    Object.assign(lead, updates);
    await lead.save();

    // Log Activity if stage changed
    if (updates.stage && updates.stage !== oldStage) {
      await LeadActivity.create({
        leadId: lead._id,
        type: "StatusChange",
        content: `Stage updated from ${oldStage} to ${updates.stage}`,
        createdBy: payload.userId
      });
    }

    await logAudit(req, payload.userId, "Lead Update", "CRM", `Updated lead ${lead.firstName} ${lead.lastName}`, { stage: oldStage, status: oldStatus }, { stage: lead.stage, status: lead.status });

    return NextResponse.json({ success: true, message: "Lead updated successfully", data: lead });
  } catch (error) {
    console.error("Update Lead Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
