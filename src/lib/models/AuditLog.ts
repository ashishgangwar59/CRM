import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: string;
  module: string;
  description: string;
  ipAddress: string;
  browser: string;
  oldValues?: any;
  newValues?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema: Schema<IAuditLog> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Employee" },
    action: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String, required: true },
    ipAddress: { type: String, default: "Unknown" },
    browser: { type: String, default: "Unknown" },
    oldValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
