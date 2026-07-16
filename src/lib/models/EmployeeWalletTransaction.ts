import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmployeeWalletTransaction extends Document {
  employeeWalletId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  type: "Credit" | "Debit";
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: "Salary" | "Manual";
  referenceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeWalletTransactionSchema: Schema<IEmployeeWalletTransaction> = new Schema(
  {
    employeeWalletId: { type: Schema.Types.ObjectId, ref: "EmployeeWallet", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    type: { type: String, enum: ["Credit", "Debit"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    referenceType: { type: String, enum: ["Salary", "Manual"], required: true },
    referenceId: { type: Schema.Types.ObjectId, ref: "SalaryPayment" },
  },
  { timestamps: true }
);

export const EmployeeWalletTransaction: Model<IEmployeeWalletTransaction> = mongoose.models.EmployeeWalletTransaction || mongoose.model("EmployeeWalletTransaction", EmployeeWalletTransactionSchema);
