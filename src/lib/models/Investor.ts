import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvestor extends Document {
  investorCode: string; // INV-0001
  userId?: mongoose.Types.ObjectId; // Linked User account
  fullName: string;
  email: string;
  phone: string;
  investmentAmount: number; // Invest RS amount
  monthlyGrowthPercentage: number; // e.g. 2.5%
  
  status: "Pending" | "Verified" | "Rejected";
  rejectionReason?: string;

  // KYC Documents
  kycDocs: {
    aadharNumber?: string;
    aadharDocUrl?: string;
    panNumber?: string;
    panDocUrl?: string;
    marksheet10thUrl?: string;
    marksheet12thUrl?: string;
    graduationUrl?: string; // Optional
    postGraduationUrl?: string; // Optional
    bankPassbookUrl?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
  };

  // Document Approval Statuses (one-by-one verification)
  docVerifications?: {
    aadhar?: "Approved" | "Rejected" | "Pending";
    pan?: "Approved" | "Rejected" | "Pending";
    marksheet10th?: "Approved" | "Rejected" | "Pending";
    marksheet12th?: "Approved" | "Rejected" | "Pending";
    graduation?: "Approved" | "Rejected" | "Pending";
    postGraduation?: "Approved" | "Rejected" | "Pending";
    bankPassbook?: "Approved" | "Rejected" | "Pending";
  };
  // Debenture Application Form Details
  debentureForm?: {
    applicationNo?: string;
    applicationDate?: string;
    fatherSpouseName?: string;
    dob?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    occupation?: string;
    typeOfDebenture?: "Secured" | "Non-Convertible" | "Redeemable";
    faceValue?: number;
    noOfDebentures?: number;
    totalApplicationAmount?: number;
    modeOfPayment?: "NEFT/RTGS" | "Cheque" | "DD" | "Other";
    chequeDdNo?: string;
    chequeDdDate?: string;
    transactionUtrNo?: string;
    drawnOnBank?: string;
    passportPhotoUrl?: string;
  };

  // Referral tracking (which employee submitted/referred this investor application)
  referralEmployeeId?: mongoose.Types.ObjectId;
  referralEmployeeName?: string;

  bondAgreement: {
    accepted: boolean;
    signatureText?: string;
    acceptedAt?: Date;
  };

  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvestorSchema: Schema<IInvestor> = new Schema(
  {
    investorCode: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    investmentAmount: { type: Number, default: 0 },
    monthlyGrowthPercentage: { type: Number, default: 2 }, // Default 2% monthly return

    status: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    rejectionReason: { type: String },

    kycDocs: {
      aadharNumber: { type: String },
      aadharDocUrl: { type: String },
      panNumber: { type: String },
      panDocUrl: { type: String },
      marksheet10thUrl: { type: String },
      marksheet12thUrl: { type: String },
      graduationUrl: { type: String },
      postGraduationUrl: { type: String },
      bankPassbookUrl: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      branchName: { type: String },
    },

    docVerifications: {
      aadhar: { type: String, enum: ["Approved", "Rejected", "Pending"], default: "Pending" },
      pan: { type: String, enum: ["Approved", "Rejected", "Pending"], default: "Pending" },
      marksheet10th: { type: String, enum: ["Approved", "Rejected", "Pending"], default: "Pending" },
      marksheet12th: { type: String, enum: ["Approved", "Rejected", "Pending"], default: "Pending" },
      graduation: { type: String, enum: ["Approved", "Rejected", "Pending"], default: "Pending" },
      postGraduation: { type: String, enum: ["Approved", "Rejected", "Pending"], default: "Pending" },
      bankPassbook: { type: String, enum: ["Approved", "Rejected", "Pending"], default: "Pending" },
    },

    debentureForm: {
      applicationNo: { type: String },
      applicationDate: { type: String },
      fatherSpouseName: { type: String },
      dob: { type: String },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      pinCode: { type: String },
      occupation: { type: String },
      typeOfDebenture: { type: String },
      faceValue: { type: Number },
      noOfDebentures: { type: Number },
      totalApplicationAmount: { type: Number },
      modeOfPayment: { type: String },
      chequeDdNo: { type: String },
      chequeDdDate: { type: String },
      transactionUtrNo: { type: String },
      drawnOnBank: { type: String },
      passportPhotoUrl: { type: String },
    },

    referralEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    referralEmployeeName: { type: String },

    bondAgreement: {
      accepted: { type: Boolean, default: false },
      signatureText: { type: String },
      acceptedAt: { type: Date },
    },

    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

export const Investor: Model<IInvestor> =
  mongoose.models.Investor || mongoose.model("Investor", InvestorSchema);
