import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * One payment towards an investor's investment.
 *  - method "online": Razorpay order → payment (verified by signature + webhook)
 *  - method "manual": investor enters Transaction / UTR No. + screenshot → admin approves
 * A Payment Receipt number is assigned when the payment becomes "Paid".
 */
export type PaymentStatus = "Created" | "Paid" | "Failed" | "Pending Verification" | "Rejected";

export interface IInvestmentPayment extends Document {
  receiptNo?: string;
  investorId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  investorCode?: string;
  applicationNo?: string;
  investorName: string;
  email?: string;
  phone?: string;
  address?: string;
  panNumber?: string;

  amount: number; // INR (rupees)
  currency: string;
  method: "online" | "manual";
  status: PaymentStatus;

  // Online (Razorpay)
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  gatewayMethod?: string; // upi / card / netbanking / wallet
  gatewayMode?: "test" | "live";
  failureReason?: string;

  // Manual (bank transfer / UPI outside the gateway)
  manual?: {
    utrNo?: string;
    paymentDate?: string;
    mode?: string;
    bankName?: string;
    screenshotUrl?: string;
  };

  paidAt?: Date;
  submittedBy?: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  receiptEmailedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentPaymentSchema = new Schema<IInvestmentPayment>(
  {
    receiptNo: { type: String },
    investorId: { type: Schema.Types.ObjectId, ref: "Investor", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    investorCode: String,
    applicationNo: String,
    investorName: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    panNumber: String,

    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },
    method: { type: String, enum: ["online", "manual"], required: true },
    status: {
      type: String,
      enum: ["Created", "Paid", "Failed", "Pending Verification", "Rejected"],
      default: "Created",
      index: true,
    },

    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: String,
    gatewayMethod: String,
    gatewayMode: { type: String, enum: ["test", "live"] },
    failureReason: String,

    manual: {
      utrNo: String,
      paymentDate: String,
      mode: String,
      bankName: String,
      screenshotUrl: String,
    },

    paidAt: Date,
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    rejectionReason: String,
    receiptEmailedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

// A receipt number / Razorpay order / Razorpay payment can only belong to one record.
InvestmentPaymentSchema.index({ receiptNo: 1 }, { unique: true, partialFilterExpression: { receiptNo: { $type: "string" } } });
InvestmentPaymentSchema.index({ razorpayOrderId: 1 }, { unique: true, partialFilterExpression: { razorpayOrderId: { $type: "string" } } });
InvestmentPaymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: "string" } } });
InvestmentPaymentSchema.index({ "manual.utrNo": 1 });
InvestmentPaymentSchema.index({ createdAt: -1 });

if (mongoose.models.InvestmentPayment) {
  delete mongoose.models.InvestmentPayment;
}

export const InvestmentPayment: Model<IInvestmentPayment> =
  mongoose.model<IInvestmentPayment>("InvestmentPayment", InvestmentPaymentSchema);
