import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILead extends Document {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  
  source: "Facebook" | "Google" | "Website" | "Referral" | "Walk In" | "Employee Reference";
  status: "Open" | "Closed Won" | "Closed Lost";
  stage: "New" | "Contacted" | "Qualified" | "Proposal" | "Negotiation";
  priority: "Low" | "Medium" | "High";
  dealValue: number;
  
  ownerId: mongoose.Types.ObjectId;
  nextFollowUp?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema<ILead> = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    
    source: { 
      type: String, 
      enum: ["Facebook", "Google", "Website", "Referral", "Walk In", "Employee Reference"], 
      required: true 
    },
    status: { type: String, enum: ["Open", "Closed Won", "Closed Lost"], default: "Open" },
    stage: { type: String, enum: ["New", "Contacted", "Qualified", "Proposal", "Negotiation"], default: "New" },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    dealValue: { type: Number, default: 0 },
    
    ownerId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    nextFollowUp: { type: Date },
  },
  { timestamps: true }
);

export const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
