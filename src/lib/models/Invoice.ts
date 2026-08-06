import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceItem {
  title: string;
  desc: string;
  sacCode: string;
  qty: number;
  rate: number;
  igstRate: number;
}

export interface IInvoice extends Document {
  invoiceNo: string;
  invoiceDate: string;
  reverseCharge: string;
  state: string;
  stateCode: string;
  billToName: string;
  billToAddress: string;
  billToState: string;
  billToStateCode: string;
  items: IInvoiceItem[];
  modeOfPayment?: string;
  paymentModeOther?: string;
  bankName?: string;
  transactionUtrNo?: string;
  chequeDdNo?: string;
  chequeDdDate?: string;
  drawnOnBank?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema({
  title: { type: String, required: true },
  desc: { type: String, default: "" },
  sacCode: { type: String, default: "" },
  qty: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  igstRate: { type: Number, default: 0 },
});

const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    invoiceDate: { type: String, required: true },
    reverseCharge: { type: String, default: "No" },
    state: { type: String, default: "Delhi" },
    stateCode: { type: String, default: "07" },
    billToName: { type: String, required: true },
    billToAddress: { type: String, required: true },
    billToState: { type: String, default: "Delhi" },
    billToStateCode: { type: String, default: "07" },
    items: [InvoiceItemSchema],
    modeOfPayment: { type: String, default: "NEFT/RTGS" },
    paymentModeOther: { type: String, default: "" },
    bankName: { type: String, default: "" },
    transactionUtrNo: { type: String, default: "" },
    chequeDdNo: { type: String, default: "" },
    chequeDdDate: { type: String, default: "" },
    drawnOnBank: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
