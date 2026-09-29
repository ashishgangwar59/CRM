import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayrollAuditLog extends Document {
  actionType: "Create" | "Update" | "Delete" | "Calculation";
  entityType: "Incentive" | "Tax" | "PF" | "Deduction" | "SalaryStructure" | "Payroll";
  entityId?: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  
  oldValues?: any;
  newValues?: any;
  
  reason?: string;
  
  changedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PayrollAuditLogSchema: Schema<IPayrollAuditLog> = new Schema(
  {
    actionType: { 
      type: String, 
      enum: ["Create", "Update", "Delete", "Calculation"], 
      required: true 
    },
    entityType: { 
      type: String, 
      enum: ["Incentive", "Tax", "PF", "Deduction", "SalaryStructure", "Payroll"], 
      required: true 
    },
    entityId: { type: Schema.Types.ObjectId },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    
    oldValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    
    reason: { type: String },
    
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

if (mongoose.models.PayrollAuditLog) {
  delete mongoose.models.PayrollAuditLog;
}

export const PayrollAuditLog: Model<IPayrollAuditLog> = mongoose.model("PayrollAuditLog", PayrollAuditLogSchema);
