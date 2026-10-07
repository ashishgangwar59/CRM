import mongoose, { Schema, Document } from "mongoose";

export interface IVendorInvoice extends Document {
  title: string;
  invoiceNo: string;
  amount: number;
  date: string;
  paymentMode?: string;
  approvedBy?: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorInvoiceSchema: Schema<IVendorInvoice> = new Schema(
  {
    title: { type: String, required: true },
    invoiceNo: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    paymentMode: { type: String },
    approvedBy: { type: String },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.VendorInvoice || mongoose.model<IVendorInvoice>("VendorInvoice", VendorInvoiceSchema);
