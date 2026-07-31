import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILead extends Document {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  
  source: "Facebook" | "Google" | "Website" | "Referral" | "Walk In" | "Employee Reference";
  status: "Open" | "Closed Won" | "Closed Lost" | "Done";
  stage: "New" | "Contacted" | "Qualified" | "Proposal" | "Negotiation";
  priority: "Low" | "Medium" | "High";
  dealValue: number;
  
  ownerId?: mongoose.Types.ObjectId;
  nextFollowUp?: Date;
  
  isLocked?: boolean;
  markedDoneBy?: mongoose.Types.ObjectId;
  markedDoneAt?: Date;

  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  remark?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema<ILead> = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String }, // Remove required constraints to allow simple upload if second name is missing
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    
    source: { 
      type: String, 
      enum: ["Facebook", "Google", "Website", "Referral", "Walk In", "Employee Reference"], 
      default: "Website" // Make default so simple CSV imports succeed without source column
    },
    status: { type: String, enum: ["Open", "Closed Won", "Closed Lost", "Done"], default: "Open" },
    stage: { type: String, enum: ["New", "Contacted", "Qualified", "Proposal", "Negotiation"], default: "New" },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    dealValue: { type: Number, default: 0 },
    
    ownerId: { type: Schema.Types.ObjectId, ref: "Employee", required: false },
    nextFollowUp: { type: Date },
    
    isLocked: { type: Boolean, default: false },
    markedDoneBy: { type: Schema.Types.ObjectId, ref: "User" },
    markedDoneAt: { type: Date },

    address1: { type: String },
    address2: { type: String },
    address3: { type: String },
    city: { type: String },
    state: { type: String },
    pinCode: { type: String },
    remark: { type: String },
  },
  { timestamps: true }
);

if (mongoose.models.Lead) {
  delete mongoose.models.Lead;
}
export const Lead: Model<ILead> = mongoose.model("Lead", LeadSchema);
