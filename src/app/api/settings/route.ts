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

    if (!settings.letterTemplates || !settings.letterTemplates.offerLetter) {
      settings.letterTemplates = {
        offerLetter: {
          page1: `<h3 class="font-bold underline uppercase mb-1">REPORTING LOCATION</h3>
<p class="mb-3">The Nukleus Center, Mezzanine Level, Shivaji Stadium Metro Station, Airport Express Line, Connaught Place, New Delhi 110001</p>

<h3 class="font-bold underline uppercase mb-1">PROBATION & CONFIRMATION</h3>
<p class="mb-3">
  The initial probation period shall be 3 months unless otherwise communicated in writing. During probation, the Company may review performance, attendance, conduct, documentation, communication and role suitability.<br />
  Confirmation or extension will be communicated by the Company in accordance with applicable terms and law.
</p>

<h3 class="font-bold underline uppercase mb-1">ROLE & RESPONSIBILITIES</h3>
<p class="mb-5">
  You shall perform assigned responsibilities diligently, maintain professional standards, follow approved business processes, submit required reports, protect Company information and comply with lawful instructions and applicable workplace policies.
</p>

<h3 class="font-bold underline uppercase mb-1">PERFORMANCE & INCENTIVES</h3>
<p class="mb-5">
  Performance may be reviewed periodically on business/operational performance, quality of work, attendance, customer handling, reporting discipline, compliance and teamwork. Incentives, where applicable, are subject to the relevant policy, eligibility, verification and approval.
</p>`,
          page2: `<h3 class="font-bold underline uppercase mb-1">ATTENDANCE & WORKING HOURS</h3>
<p class="mb-5">
  You shall follow the working hours and attendance system communicated by HR. Repeated late attendance, unauthorised absence or failure to follow attendance procedures may result in action under applicable policy and law.
</p>

<h3 class="font-bold underline uppercase mb-1">LEAVE</h3>
<p class="mb-5">
  Leave must be requested and approved through the prescribed process. Unauthorised absence may be treated in accordance with Company policy and applicable law.
</p>

<h3 class="font-bold underline uppercase mb-1">REVIEW & CAREER DEVELOPMENT</h3>
<p class="mb-5">
  Role responsibilities, reporting structures, targets and compensation components may be reviewed from time to time based on business requirements, performance and applicable employment terms.
</p>

<h3 class="font-bold underline uppercase mb-2">CONFIDENTIALITY & COMPLIANCE</h3>
<div class="space-y-3 mb-5">
  <p><strong>CONFIDENTIALITY:</strong> You shall protect confidential information relating to the Company, clients, investors, employees, business processes, commercial arrangements, databases, passwords, documents and proprietary information during and after employment.</p>
  <p><strong>COMPANY PROPERTY & ACCESS:</strong> All Company-issued devices, ID cards, documents, files, credentials, database access and other assets remain Company property and must be protected and returned upon request or separation.</p>
  <p><strong>FINANCIAL & CLIENT COMPLIANCE:</strong> You are not authorised to make unauthorised commitments regarding returns, approvals, refunds or Company obligations. Company/client/investor money must not be collected into personal bank accounts or personal payment instruments. All financial transactions must follow officially approved procedures.</p>
  <p><strong>PROFESSIONAL CONDUCT:</strong> Fraud, falsification, misuse of Company systems/property, unauthorised disclosure, harassment, misrepresentation, serious policy violations or unauthorised handling of funds may lead to appropriate action after following applicable process and law.</p>
  <p><strong>CONFLICT OF INTEREST:</strong> You shall disclose actual or potential conflicts of interest and shall not use your position, Company information or resources for unauthorised personal benefit.</p>
</div>

<h3 class="font-bold underline uppercase mb-1">DOCUMENT REQUIRED & VERIFICATION</h3>
<ul class="list-disc pl-5 mb-1 space-y-0.5">
  <li>Certificate supporting education qualification.</li>
  <li>Certificate supporting employment from the present and previous organisation.</li>
  <li>02 passport size photograph.</li>
  <li>Aadhar card.</li>
  <li>Pan card.</li>
</ul>
<p class="mb-5">
  You need to carry the abovementioned documents in original with you on the day of joining for the cross verification. Employment is subject to verification of submitted information and documents. Materially false, misleading or incomplete information may result in appropriate action under applicable law and Company policy.
</p>`,
          page3: `<h3 class="font-bold underline uppercase mb-1">INTELLECTUAL PROPERTY</h3>
<p class="mb-3">
  Work product and business materials created in the course of employment for Company business shall be handled in accordance with applicable Company policies and law.
</p>

<h3 class="font-bold underline uppercase mb-1">SEPARATION & ACCEPTANCE</h3>
<p class="mb-1"><strong>TRANSFER / REASSIGNMENT:</strong> Subject to applicable law and employment terms, the Company may assign you to another department, role, branch or work location according to business requirements and suitability.</p>
<p class="mb-1"><strong>SEPARATION & NOTICE:</strong> Either party may terminate the employment relationship in accordance with applicable employment terms, notice requirements and law. Serious misconduct, fraud, unauthorised disclosure or major compliance violations may result in immediate action where legally permitted. Company property, documents and access credentials must be returned upon separation.</p>
<p class="mb-3"><strong>COMPANY POLICIES:</strong> You agree to comply with applicable HR, attendance, information-security, confidentiality, workplace-conduct, compliance and operational policies issued by the Company from time to time, subject to applicable law.</p>

<h3 class="font-bold underline uppercase mb-1">ACCEPTANCE</h3>
<p class="mb-10">
  By signing below, you confirm that you have read and understood this Offer Letter, the information provided by you is accurate to the best of your knowledge, and you agree to comply with applicable Company policies and procedures.
</p>`
        },
        joiningLetter: {
          page1: `<p class="mb-4">
  Further to your acceptance of our offer letter, we are pleased to confirm your appointment with us as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department, effective from your date of joining on <strong>{{joiningDate}}</strong>.
</p>

<p class="mb-4">
  Your employment will be governed by the standard policies, rules, and regulations of the company, which may be amended from time to time. You will be on a probation period of 3 months, during which your performance will be evaluated.
</p>

<p class="mb-4">
  Please note that your employment is strictly governed by a confidentiality clause, meaning you shall not disclose any sensitive company information, trade secrets, or client data to any unauthorized third parties during or after your tenure with the company.
</p>

<p class="mb-8">
  We are excited to have you on board and are confident that you will make a significant contribution to the company. Please sign the duplicate copy of this appointment letter to signify your acceptance of the terms of employment.
</p>

<p class="mb-12 font-medium">Welcome to the team!</p>`
        }
      };
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

    // Use findOneAndUpdate to ensure nested fields like letterTemplates are properly merged and saved
    const updatedSettings = await SystemSettings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, message: "Settings updated successfully", data: updatedSettings });
  } catch (error) {
    console.error("Settings PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
