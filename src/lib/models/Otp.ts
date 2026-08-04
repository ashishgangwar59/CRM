import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOtp extends Document {
  phone: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OtpSchema: Schema<IOtp> = new Schema(
  {
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Create TTL index on expiresAt (expires after 0 seconds from the specified date)
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp: Model<IOtp> = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
