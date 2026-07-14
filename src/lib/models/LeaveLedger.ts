import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaveLedger extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveType: "Paid" | "Casual" | "Sick" | "Maternity" | "Paternity" | "Loss of Pay" | "Comp Off";
  transactionType: "Credit" | "Debit";
  amount: number;
  reason: string;
  leaveRequestId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveLedgerSchema: Schema<ILeaveLedger> = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    leaveType: { 
      type: String, 
      enum: ["Paid", "Casual", "Sick", "Maternity", "Paternity", "Loss of Pay", "Comp Off"], 
      required: true 
    },
    transactionType: { type: String, enum: ["Credit", "Debit"], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    leaveRequestId: { type: Schema.Types.ObjectId, ref: "Leave" },
  },
  { timestamps: true }
);

export const LeaveLedger: Model<ILeaveLedger> = mongoose.models.LeaveLedger || mongoose.model("LeaveLedger", LeaveLedgerSchema);
