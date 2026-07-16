import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmployeeWallet extends Document {
  employeeId: mongoose.Types.ObjectId;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeWalletSchema: Schema<IEmployeeWallet> = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, unique: true },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const EmployeeWallet: Model<IEmployeeWallet> = mongoose.models.EmployeeWallet || mongoose.model("EmployeeWallet", EmployeeWalletSchema);
