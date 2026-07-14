import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaveBalance extends Document {
  employeeId: mongoose.Types.ObjectId;
  balances: {
    Paid: number;
    Casual: number;
    Sick: number;
    Maternity: number;
    Paternity: number;
    CompOff: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LeaveBalanceSchema: Schema<ILeaveBalance> = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, unique: true },
    balances: {
      Paid: { type: Number, default: 0 },
      Casual: { type: Number, default: 0 },
      Sick: { type: Number, default: 0 },
      Maternity: { type: Number, default: 0 },
      Paternity: { type: Number, default: 0 },
      CompOff: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const LeaveBalance: Model<ILeaveBalance> = mongoose.models.LeaveBalance || mongoose.model("LeaveBalance", LeaveBalanceSchema);
