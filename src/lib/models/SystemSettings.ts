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
    lateThresholdMins: number;
    halfDayThresholdMins: number;
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
      lateThresholdMins: { type: Number, default: 15 },
      halfDayThresholdMins: { type: Number, default: 240 }
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
    salaryComponents: [{
      name: { type: String },
      type: { type: String, enum: ["Earning", "Deduction"] }
    }]
  },
  { timestamps: true }
);

export const SystemSettings: Model<ISystemSettings> = mongoose.models.SystemSettings || mongoose.model("SystemSettings", SystemSettingsSchema);
