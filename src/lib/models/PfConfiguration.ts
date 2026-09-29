import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPfConfiguration extends Document {
  employeePercentage: number;
  employerPercentage: number;
  calculationBasis: "Basic" | "Gross";
  isCapped: boolean;
  ceilingAmount?: number; // e.g. 15000
  
  effectiveDate: Date;
  isActive: boolean;
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const PfConfigurationSchema: Schema<IPfConfiguration> = new Schema(
  {
    employeePercentage: { type: Number, required: true },
    employerPercentage: { type: Number, required: true },
    calculationBasis: { 
      type: String, 
      enum: ["Basic", "Gross"], 
      required: true 
    },
    isCapped: { type: Boolean, default: true },
    ceilingAmount: { type: Number },
    
    effectiveDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (mongoose.models.PfConfiguration) {
  delete mongoose.models.PfConfiguration;
}

export const PfConfiguration: Model<IPfConfiguration> = mongoose.model<IPfConfiguration>("PfConfiguration", PfConfigurationSchema);
