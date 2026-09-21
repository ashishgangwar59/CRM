import mongoose, { Schema, Document } from "mongoose";

export interface IOtherExpense extends Document {
  title: string;
  amount: number;
  date: string;
  paymentMode?: string;
  paymentTransferredBy?: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OtherExpenseSchema: Schema<IOtherExpense> = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    paymentMode: { type: String },
    paymentTransferredBy: { type: String },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.OtherExpense || mongoose.model<IOtherExpense>("OtherExpense", OtherExpenseSchema);
