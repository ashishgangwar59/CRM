import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeadAttachment extends Document {
  leadId: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadAttachmentSchema: Schema<ILeadAttachment> = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  },
  { timestamps: true }
);

export const LeadAttachment: Model<ILeadAttachment> = mongoose.models.LeadAttachment || mongoose.model("LeadAttachment", LeadAttachmentSchema);
