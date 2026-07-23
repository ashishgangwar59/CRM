import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { SystemSettings } from "@/lib/models/SystemSettings";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }

    let updated = false;
    if (!settings.emailTemplates || settings.emailTemplates.length === 0) {
      settings.emailTemplates = [
        {
          triggerEvent: "Leave Approved",
          subject: "Leave Request Approved",
          body: "Hi {{employeeName}},\n\nYour leave request from {{startDate}} to {{endDate}} has been approved.\n\nBest regards,\nHR Team"
        },
        {
          triggerEvent: "Leave Rejected",
          subject: "Leave Request Update",
          body: "Hi {{employeeName}},\n\nYour leave request from {{startDate}} to {{endDate}} has been rejected. Reason: {{reason}}.\n\nBest regards,\nHR Team"
        },
        {
          triggerEvent: "Late Attendance Notice",
          subject: "Late Attendance Notice",
          body: "Hi {{employeeName}},\n\nYou checked in late today at {{punchInTime}}.\n\nBest regards,\nHR Team"
        }
      ];
      updated = true;
    }

    if (!settings.smsTemplates || settings.smsTemplates.length === 0) {
      settings.smsTemplates = [
        {
          triggerEvent: "OTP Verification",
          body: "Your CRM login OTP is {{otp}}. Valid for 5 minutes."
        },
        {
          triggerEvent: "Lead Assigned",
          body: "A new lead {{leadName}} has been assigned to you. Check leads page."
        }
      ];
      updated = true;
    }

    if (!settings.investorLegalBondTemplate) {
      settings.investorLegalBondTemplate = `INVESTOR CAPITAL BOND AGREEMENT TERMS

1. The Investor agrees to invest the specified capital amount (RS) into the capital fund.
2. Monthly returns will be computed at the agreed rate per month subject to document verification.
3. All uploaded KYC documents (Aadhar, PAN, Marksheets & Bank Details) are verified by Key Admin before activation.
4. By checking the agreement box, the investor digitally signs and confirms that all submitted information is accurate and legally binding.`;
      updated = true;
    }

    if (updated) {
      await settings.save();
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Settings GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates = await req.json();
    
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }

    // Strip immutable fields to prevent Mongoose error
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.__v;

    // Merge updates
    Object.assign(settings, updates);
    await settings.save();

    return NextResponse.json({ success: true, message: "Settings updated successfully", data: settings });
  } catch (error) {
    console.error("Settings PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
