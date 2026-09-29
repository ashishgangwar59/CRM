import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeductionConfiguration extends Document {
  deductionName: string; // e.g. "Professional Tax", "Late Penalty"
  deductionType: "Fixed" | "Percentage";
  value: number; // Amount or Percentage
  calculationBasis?: "Basic" | "Gross"; // Only if Percentage
  
  effectiveDate: Date;
  isActive: boolean;
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const DeductionConfigurationSchema: Schema<IDeductionConfiguration> = new Schema(
  {
    deductionName: { type: String, required: true },
    deductionType: { 
      type: String, 
      enum: ["Fixed", "Percentage"], 
      required: true 
    },
    value: { type: Number, required: true },
    calculationBasis: { 
      type: String, 
      enum: ["Basic", "Gross"]
    },
    
    effectiveDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (mongoose.models.DeductionConfiguration) {
  delete mongoose.models.DeductionConfiguration;
}

export const DeductionConfiguration: Model<IDeductionConfiguration> = mongoose.model("DeductionConfiguration", DeductionConfigurationSchema);
