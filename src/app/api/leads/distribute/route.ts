import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Lead } from "@/lib/models/Lead";
import { LeadActivity } from "@/lib/models/LeadActivity";
import { Employee } from "@/lib/models/Employee";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (payload.role !== "ADMIN" && payload.role !== "KEY_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { leadIds, employeeIds, scheduledDate } = await req.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "No lead IDs provided" }, { status: 400 });
    }

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: "No employee IDs provided" }, { status: 400 });
    }

    // Resolve creator employee record
    const { User } = await import("@/lib/models/User");
    const user = await User.findById(payload.userId).lean();
    const creatorEmployee = user ? await Employee.findOne({ email: user.email }).lean() : null;
    const creatorEmployeeId = creatorEmployee ? creatorEmployee._id : payload.userId;

    const targetDate = scheduledDate ? new Date(scheduledDate) : undefined;
    const mongoose = (await import("mongoose")).default;

    // Distribute leads among employees in a round-robin fashion
    const assignments: { leadId: string; employeeId: string }[] = [];
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];
      const employeeId = employeeIds[i % employeeIds.length];
      assignments.push({ leadId, employeeId });
    }

    // Update each lead
    for (const assignment of assignments) {
      const lead = await Lead.findById(assignment.leadId);
      if (lead) {
        lead.ownerId = new mongoose.Types.ObjectId(assignment.employeeId) as any;
        lead.isLocked = true; // Lock lead upon distribution to prevent unapproved edits
        if (targetDate) {
          lead.nextFollowUp = targetDate;
        }
        await lead.save();

        // Get employee info
        const employee = await Employee.findById(assignment.employeeId).lean();
        const empName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";

        // Add activity
        await LeadActivity.create({
          leadId: lead._id,
          type: "StatusChange",
          content: `Lead assigned to ${empName} via bulk distribution${targetDate ? ` scheduled for ${targetDate.toLocaleDateString()}` : ""}`,
          createdBy: creatorEmployeeId
        });
      }
    }

    await logAudit(
      req,
      payload.userId,
      "Lead Bulk Distribution",
      "CRM",
      `Distributed ${leadIds.length} leads among ${employeeIds.length} employees`,
      {},
      { leadCount: leadIds.length, employeeCount: employeeIds.length, scheduledDate }
    );

    return NextResponse.json({ success: true, message: `Successfully distributed ${leadIds.length} leads.` });
  } catch (error: any) {
    console.error("Bulk Lead Distribution Error:", error);
    return NextResponse.json({ error: error.message || "Failed to distribute leads" }, { status: 500 });
  }
}
