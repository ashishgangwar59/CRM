import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendanceSettings extends Document {
  standardStartTime: string; // "09:00"
  standardEndTime: string;   // "18:00"
  lateThresholdMinutes: number; // e.g. 15
  earlyLeaveThresholdMinutes: number; // e.g. 15
  allowedIPs: string[]; // e.g. ["192.168.1.1"]
  officeLocation?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSettingsSchema: Schema<IAttendanceSettings> = new Schema(
  {
    standardStartTime: { type: String, default: "09:00" },
    standardEndTime: { type: String, default: "18:00" },
    lateThresholdMinutes: { type: Number, default: 15 },
    earlyLeaveThresholdMinutes: { type: Number, default: 15 },
    allowedIPs: [{ type: String }],
    officeLocation: {
      latitude: Number,
      longitude: Number,
      radiusMeters: Number,
    },
  },
  { timestamps: true }
);

export const AttendanceSettings: Model<IAttendanceSettings> = mongoose.models.AttendanceSettings || mongoose.model("AttendanceSettings", AttendanceSettingsSchema);
