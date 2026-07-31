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

    const isUserAdmin = payload.role === "ADMIN" || payload.role === "KEY_ADMIN";

    // If lead is locked and non-admin tries to reassign or change lock status, reject
    if (lead.isLocked && !isUserAdmin && (updates.ownerId || updates.isLocked !== undefined)) {
      return NextResponse.json({ error: "This distributed lead is locked by Admin and cannot be modified." }, { status: 403 });
    }

    const oldStage = lead.stage;
    const oldStatus = lead.status;
    const oldOwnerId = lead.ownerId;
    
    // Action: Mark Done by Admin / KeyAdmin
    if (updates.action === "markDone" || updates.status === "Done") {
      lead.status = "Done";
      lead.stage = "Qualified";
      lead.isLocked = true;
      lead.markedDoneBy = payload.userId as any;
      lead.markedDoneAt = new Date();

      await lead.save();

      await LeadActivity.create({
        leadId: lead._id,
        type: "StatusChange",
        content: "Lead marked as Done ✔️ by Admin.",
        createdBy: payload.userId
      });

      await logAudit(req, payload.userId, "Lead Marked Done", "CRM", `Marked lead ${lead.firstName} ${lead.lastName} as Done`, { status: oldStatus }, { status: "Done" });
      return NextResponse.json({ success: true, message: "Lead marked as Done successfully", data: lead });
    }

    // Action: Toggle Lock status by Admin / KeyAdmin
    if (updates.action === "toggleLock" || updates.isLocked !== undefined) {
      if (!isUserAdmin) {
        return NextResponse.json({ error: "Only Admin can lock or unlock leads." }, { status: 403 });
      }
      lead.isLocked = updates.isLocked !== undefined ? updates.isLocked : !lead.isLocked;
      await lead.save();

      await LeadActivity.create({
        leadId: lead._id,
        type: "StatusChange",
        content: `Lead ${lead.isLocked ? "locked 🔒" : "unlocked 🔓"} by Admin.`,
        createdBy: payload.userId
      });

      return NextResponse.json({ success: true, message: `Lead ${lead.isLocked ? "locked" : "unlocked"} successfully`, data: lead });
    }

    // Update general fields
    Object.assign(lead, updates);
    await lead.save();

    // Log Activity if owner changed
    if (updates.ownerId && updates.ownerId.toString() !== (oldOwnerId ? oldOwnerId.toString() : "")) {
      const { Employee } = await import("@/lib/models/Employee");
      const employee = await Employee.findById(updates.ownerId).lean();
      const empName = employee ? `${employee.firstName} ${employee.lastName}` : "Unassigned";
      
      await LeadActivity.create({
        leadId: lead._id,
        type: "StatusChange",
        content: `Lead assigned to ${empName}`,
        createdBy: payload.userId
      });
    }

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
