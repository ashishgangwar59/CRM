import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISignatureSession extends Document {
  sessionToken: string;
  signatureUrl?: string;
  status: "PENDING" | "COMPLETED";
  createdAt: Date;
  expiresAt: Date;
}

const SignatureSessionSchema: Schema<ISignatureSession> = new Schema(
  {
    sessionToken: { type: String, required: true, unique: true },
    signatureUrl: { type: String },
    status: { type: String, enum: ["PENDING", "COMPLETED"], default: "PENDING" },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 15 * 60 * 1000) } // 15 mins expiry
  },
  { timestamps: true }
);

// TTL index to automatically purge expired sessions after 15 minutes
SignatureSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

if (mongoose.models.SignatureSession) {
  delete mongoose.models.SignatureSession;
}

export const SignatureSession: Model<ISignatureSession> = mongoose.model("SignatureSession", SignatureSessionSchema);
