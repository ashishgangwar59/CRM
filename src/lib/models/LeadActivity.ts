import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeadActivity extends Document {
  leadId: mongoose.Types.ObjectId;
  type: "Note" | "StatusChange" | "Call" | "Email";
  content: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadActivitySchema: Schema<ILeadActivity> = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    type: { type: String, enum: ["Note", "StatusChange", "Call", "Email"], required: true },
    content: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  },
  { timestamps: true }
);

export const LeadActivity: Model<ILeadActivity> = mongoose.models.LeadActivity || mongoose.model("LeadActivity", LeadActivitySchema);
