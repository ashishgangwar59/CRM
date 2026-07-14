import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWalletTransaction extends Document {
  type: "Credit" | "Debit";
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: "Manual" | "SalaryPayment";
  referenceId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema: Schema<IWalletTransaction> = new Schema(
  {
    type: { type: String, enum: ["Credit", "Debit"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    referenceType: { type: String, enum: ["Manual", "SalaryPayment"], required: true },
    referenceId: { type: Schema.Types.ObjectId, ref: "Payroll" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  },
  { timestamps: true }
);

export const WalletTransaction: Model<IWalletTransaction> = mongoose.models.WalletTransaction || mongoose.model("WalletTransaction", WalletTransactionSchema);
