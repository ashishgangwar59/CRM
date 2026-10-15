import mongoose, { Model, Schema } from "mongoose";

export interface IDebentureContactOtp {
  channel: "email" | "phone";
  target: string;
  otpHash?: string | null;
  deliveryMethod: "email" | "sms" | "twilio-verify";
  expiresAt: Date;
  sentAt: Date;
  verifiedAt?: Date | null;
  attempts: number;
}

const DebentureContactOtpSchema: Schema<IDebentureContactOtp> = new Schema({
  channel: { type: String, enum: ["email", "phone"], required: true },
  target: { type: String, required: true },
  otpHash: { type: String },
  deliveryMethod: { type: String, enum: ["email", "sms", "twilio-verify"], required: true },
  expiresAt: { type: Date, required: true },
  sentAt: { type: Date, required: true },
  verifiedAt: { type: Date, default: null },
  attempts: { type: Number, default: 0 },
});

DebentureContactOtpSchema.index({ channel: 1, target: 1 }, { unique: true });
DebentureContactOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DebentureContactOtp: Model<IDebentureContactOtp> =
  mongoose.models.DebentureContactOtp ||
  mongoose.model("DebentureContactOtp", DebentureContactOtpSchema);
