import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSettings extends Document {
  companyProfile: {
    name: string;
    logoUrl: string;
    address: string;
    phone: string;
    website: string;
    email: string;
    gstNo?: string;
  };
  departments: string[];
  designations: string[];
  officeLocations: string[];
  shifts: {
    name: string;
    startTime: string; // e.g. "09:00"
    endTime: string;   // e.g. "18:00"
  }[];
  leavePolicy: {
    maxSickLeaves: number;
    maxCasualLeaves: number;
    carryForwardLimit: number;
  };
  attendancePolicy: {
    officeStartTime: string;
    officeEndTime?: string;
    lateThresholdMins: number;
    earlyLeaveThresholdMins?: number;
    halfDayThresholdMins: number;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
  };
  roles: {
    name: string;
    permissions: string[];
  }[];
  emailTemplates: {
    triggerEvent: string;
    subject: string;
    body: string;
  }[];
  smsTemplates: {
    triggerEvent: string;
    body: string;
  }[];
  salaryComponents: {
    name: string;
    type: "Earning" | "Deduction";
  }[];
  letterTemplates: {
    offerLetter: {
      page1: string;
      page2: string;
      page3: string;
    };
    joiningLetter: {
      page1: string;
    };
  };
  investorLegalBondTemplate?: string;
  investorMaturityPeriodMonths?: number;
  integrations: {
    smtp: {
      host: string;
      port: string;
      user: string;
      pass: string;
      from: string;
    };
    paymentGateway: {
      razorpayAccountNumber: string;
      razorpayKeyId: string;
      razorpayKeySecret: string;
    };
    smsGateway: {
      twilioAccountSid: string;
      twilioAuthToken: string;
      twilioPhoneNumber: string;
      twilioVerifyServiceSid: string;
      msg91AuthKey: string;
      msg91SenderId: string;
    };
  };
  backupConfig: {
    email: string;
    backupTime: string; // e.g. "10:00"
  };
}

const SystemSettingsSchema: Schema<ISystemSettings> = new Schema(
  {
    companyProfile: {
      name: { type: String, default: "My Company" },
      logoUrl: { type: String, default: "" },
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
      website: { type: String, default: "" },
      email: { type: String, default: "" },
      gstNo: { type: String, default: "" }
    },
    departments: { type: [String], default: ["Engineering", "Sales", "HR", "Marketing"] },
    designations: { type: [String], default: ["Manager", "Developer", "Analyst"] },
    officeLocations: { type: [String], default: ["Headquarters"] },
    shifts: [{
      name: { type: String },
      startTime: { type: String },
      endTime: { type: String }
    }],
    leavePolicy: {
      maxSickLeaves: { type: Number, default: 12 },
      maxCasualLeaves: { type: Number, default: 12 },
      carryForwardLimit: { type: Number, default: 5 }
    },
    attendancePolicy: {
      officeStartTime: { type: String, default: "10:00" },
      officeEndTime: { type: String, default: "18:00" },
      lateThresholdMins: { type: Number, default: 15 },
      earlyLeaveThresholdMins: { type: Number, default: 15 },
      halfDayThresholdMins: { type: Number, default: 240 },
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
      radiusMeters: { type: Number, default: 100 }
    },
    roles: [{
      name: { type: String },
      permissions: { type: [String] }
    }],
    emailTemplates: {
      type: [{
        triggerEvent: String,
        subject: String,
        body: String
      }],
      default: [
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
      ]
    },
    smsTemplates: {
      type: [{
        triggerEvent: String,
        body: String
      }],
      default: [
        {
          triggerEvent: "OTP Verification",
          body: "Your CRM login OTP is {{otp}}. Valid for 5 minutes."
        },
        {
          triggerEvent: "Lead Assigned",
          body: "A new lead {{leadName}} has been assigned to you. Check leads page."
        }
      ]
    },
    investorLegalBondTemplate: {
      type: String,
      default: `INVESTOR CAPITAL BOND AGREEMENT TERMS

1. The Investor agrees to invest the specified capital amount (RS) into the capital fund.
2. Monthly returns will be computed at the agreed rate per month subject to document verification.
3. All uploaded KYC documents (Aadhar, PAN, Marksheets & Bank Details) are verified by Key Admin before activation.
4. By checking the agreement box, the investor digitally signs and confirms that all submitted information is accurate and legally binding.`
    },
    investorMaturityPeriodMonths: { type: Number, default: 1 },
    integrations: {
      smtp: {
        host: { type: String, default: "" },
        port: { type: String, default: "" },
        user: { type: String, default: "" },
        pass: { type: String, default: "" },
        from: { type: String, default: "" },
      },
      paymentGateway: {
        razorpayAccountNumber: { type: String, default: "" },
        razorpayKeyId: { type: String, default: "" },
        razorpayKeySecret: { type: String, default: "" },
      },
      smsGateway: {
        twilioAccountSid: { type: String, default: "" },
        twilioAuthToken: { type: String, default: "" },
        twilioPhoneNumber: { type: String, default: "" },
        twilioVerifyServiceSid: { type: String, default: "" },
        msg91AuthKey: { type: String, default: "" },
        msg91SenderId: { type: String, default: "" },
      }
    },
    backupConfig: {
      email: { type: String, default: "admin@example.com" },
      backupTime: { type: String, default: "10:00" }
    },
    letterTemplates: {
      offerLetter: {
        page1: { type: String, default: `<h3 class="font-bold underline uppercase mb-1">REPORTING LOCATION</h3>
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
</p>` },
        page2: { type: String, default: `<h3 class="font-bold underline uppercase mb-1">ATTENDANCE & WORKING HOURS</h3>
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
</p>` },
        page3: { type: String, default: `<h3 class="font-bold underline uppercase mb-1">INTELLECTUAL PROPERTY</h3>
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
</p>` }
      },
      joiningLetter: {
        page1: { type: String, default: `<p class="mb-4">
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

<p class="mb-12 font-medium">Welcome to the team!</p>` }
      }
    }
  },
  { timestamps: true }
);

export const SystemSettings: Model<ISystemSettings> = mongoose.models.SystemSettings || mongoose.model("SystemSettings", SystemSettingsSchema);
