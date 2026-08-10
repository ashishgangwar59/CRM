import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISalaryStructure extends Document {
  employeeId: mongoose.Types.ObjectId;
  
  // Earnings
  basic: number;
  hra: number;
  specialAllowance: number;
  metroAllowance: number;
  travelAllowance: number;
  incentive: number;
  
  // Deductions
  pf: number;
  esi: number;
  professionalTax: number;
  incomeTax: number;
  advanceSalaryDrawn: number;

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
    metroAllowance: { type: Number, default: 0 },
    travelAllowance: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    advanceSalaryDrawn: { type: Number, default: 0 },
    
    effectiveDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

if (mongoose.models.SalaryStructure) {
  delete mongoose.models.SalaryStructure;
}
export const SalaryStructure: Model<ISalaryStructure> = mongoose.model("SalaryStructure", SalaryStructureSchema);
