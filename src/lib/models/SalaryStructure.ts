import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISalaryStructure extends Document {
  employeeId: mongoose.Types.ObjectId;
  
  // Earnings
  basic: number;
  hra: number;
  specialAllowance: number;
  
  // Deductions (Fixed amounts or percentages could be stored, but we'll store fixed amounts for simplicity in MVP)
  pf: number;
  esi: number;
  professionalTax: number;
  incomeTax: number;

  effectiveDate: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const SalaryStructureSchema: Schema<ISalaryStructure> = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, unique: true },
    
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    
    effectiveDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SalaryStructure: Model<ISalaryStructure> = mongoose.models.SalaryStructure || mongoose.model("SalaryStructure", SalaryStructureSchema);
