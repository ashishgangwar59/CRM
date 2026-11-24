import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * One identity-verification attempt (Aadhaar OTP + PAN + uploaded document match).
 * - Public Debenture Application: identified by a random `token` kept in the browser.
 * - Investor login: linked to the investor's `userId`.
 * Full Aadhaar numbers are NEVER stored – only the last 4 digits and a keyed hash.
 */
export interface IKycSession extends Document {
  token: string;
  userId?: mongoose.Types.ObjectId;
  investorIds: mongoose.Types.ObjectId[];
  provider: string;
  ip?: string;
  consentAt?: Date;

  aadhaar: {
    status: "Pending" | "OtpSent" | "Verified" | "Failed";
    last4?: string;
    numberHash?: string;
    providerRef?: string;
    otpSends: number;
    otpAttempts: number;
    name?: string;
    dob?: string;
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    careOf?: string;
    verifiedAt?: Date;
    error?: string;
  };

  pan: {
    status: "Pending" | "Verified" | "Failed";
    number?: string;
    name?: string;
    dob?: string;
    aadhaarLinked?: boolean | null;
    attempts: number;
    verifiedAt?: Date;
    error?: string;
  };

  documents: {
    aadhaar: { status: "Pending" | "Matched" | "Failed"; url?: string; extractedNumber?: string; extractedName?: string; attempts: number; error?: string };
    pan: { status: "Pending" | "Matched" | "Failed"; url?: string; extractedNumber?: string; extractedName?: string; attempts: number; error?: string };
  };

  nameMatchScore?: number;
  overallStatus: "In Progress" | "Verified" | "Failed";
  log: { at: Date; action: string; result: string; detail?: string }[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocSchema = {
  status: { type: String, enum: ["Pending", "Matched", "Failed"], default: "Pending" },
  url: String,
  extractedNumber: String,
  extractedName: String,
  attempts: { type: Number, default: 0 },
  error: String,
};

const KycSessionSchema = new Schema<IKycSession>(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    investorIds: [{ type: Schema.Types.ObjectId, ref: "Investor" }],
    provider: { type: String, default: "mock" },
    ip: String,
    consentAt: Date,

    aadhaar: {
      status: { type: String, enum: ["Pending", "OtpSent", "Verified", "Failed"], default: "Pending" },
      last4: String,
      numberHash: String,
      providerRef: String,
      otpSends: { type: Number, default: 0 },
      otpAttempts: { type: Number, default: 0 },
      name: String,
      dob: String,
      gender: String,
      address: String,
      city: String,
      state: String,
      pinCode: String,
      careOf: String,
      verifiedAt: Date,
      error: String,
    },

    pan: {
      status: { type: String, enum: ["Pending", "Verified", "Failed"], default: "Pending" },
      number: String,
      name: String,
      dob: String,
      aadhaarLinked: { type: Boolean, default: null },
      attempts: { type: Number, default: 0 },
      verifiedAt: Date,
      error: String,
    },

    documents: {
      aadhaar: DocSchema,
      pan: DocSchema,
    },

    nameMatchScore: Number,
    overallStatus: { type: String, enum: ["In Progress", "Verified", "Failed"], default: "In Progress" },
    log: [{ at: { type: Date, default: Date.now }, action: String, result: String, detail: String }],
    // Unlinked public sessions are cleaned up automatically after 7 days.
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

KycSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
KycSessionSchema.index({ ip: 1, createdAt: -1 });

if (mongoose.models.KycSession) {
  delete mongoose.models.KycSession;
}

export const KycSession: Model<IKycSession> = mongoose.model<IKycSession>("KycSession", KycSessionSchema);
