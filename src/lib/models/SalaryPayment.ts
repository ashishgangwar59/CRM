import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISalaryPayment extends Document {
  paymentReferenceNumber: string;
  monthYear: string;
  totalAmount: number;
  payrolls: mongoose.Types.ObjectId[];
  status: "Pending" | "Success" | "Failed";
  failureReason?: string;
  paidAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryPaymentSchema: Schema<ISalaryPayment> = new Schema(
  {
    paymentReferenceNumber: { type: String, required: true, unique: true },
    monthYear: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    payrolls: [{ type: Schema.Types.ObjectId, ref: "Payroll" }],
    status: { type: String, enum: ["Pending", "Success", "Failed"], default: "Pending" },
    failureReason: { type: String },
    paidAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  },
  { timestamps: true }
);

export const SalaryPayment: Model<ISalaryPayment> = mongoose.models.SalaryPayment || mongoose.model("SalaryPayment", SalaryPaymentSchema);
