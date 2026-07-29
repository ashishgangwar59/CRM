import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayroll extends Document {
  employeeId: mongoose.Types.ObjectId;
  monthYear: string; // e.g., "2026-07"
  paidDays?: number; // e.g., 15, 20, 30
  totalDays?: number; // e.g., 30
  
  // Earnings
  earnings: {
    basic: number;
    hra: number;
    specialAllowance: number;
    metroAllowance: number;
    travelAllowance: number;
    bonus: number;
    incentive: number;
    overtimeAmount: number;
  };
  
  // Deductions
  deductions: {
    pf: number;
    esi: number;
    professionalTax: number;
    incomeTax: number;
    loan: number;
    advance: number;
    unpaidLeaveDeduction: number; // LOP
  };
  
  // Totals
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  
  status: "Draft" | "Locked" | "Approved" | "Paid";
  
  pdfUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema: Schema<IPayroll> = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    monthYear: { type: String, required: true },
    paidDays: { type: Number, default: 30 },
    totalDays: { type: Number, default: 30 },
    
    earnings: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      metroAllowance: { type: Number, default: 0 },
      travelAllowance: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      incentive: { type: Number, default: 0 },
      overtimeAmount: { type: Number, default: 0 },
    },
    
    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      incomeTax: { type: Number, default: 0 },
      loan: { type: Number, default: 0 },
      advance: { type: Number, default: 0 },
      unpaidLeaveDeduction: { type: Number, default: 0 },
    },
    
    grossSalary: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    
    status: { 
      type: String, 
      enum: ["Draft", "Locked", "Approved", "Paid"], 
      default: "Draft" 
    },
    
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

// Prevent duplicate payrolls for the same month for an employee
PayrollSchema.index({ employeeId: 1, monthYear: 1 }, { unique: true });

if (mongoose.models.Payroll) {
  delete mongoose.models.Payroll;
}
export const Payroll: Model<IPayroll> = mongoose.model("Payroll", PayrollSchema);
