import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaxSlab {
  minAmount: number;
  maxAmount: number | null; // null means above this amount
  percentage: number;
}

export interface ITaxConfiguration extends Document {
  regimeName: string; // e.g. "Old Regime", "New Regime"
  thresholdAmount: number; // Minimum taxable income threshold
  effectiveDate: Date;
  isActive: boolean;
  slabs: ITaxSlab[];
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const TaxSlabSchema = new Schema<ITaxSlab>(
  {
    minAmount: { type: Number, required: true },
    maxAmount: { type: Number, default: null },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const TaxConfigurationSchema: Schema<ITaxConfiguration> = new Schema(
  {
    regimeName: { type: String, required: true, default: "Default Tax Regime" },
    thresholdAmount: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    slabs: { type: [TaxSlabSchema], required: true },
    
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (mongoose.models.TaxConfiguration) {
  delete mongoose.models.TaxConfiguration;
}

export const TaxConfiguration: Model<ITaxConfiguration> = mongoose.model("TaxConfiguration", TaxConfigurationSchema);
