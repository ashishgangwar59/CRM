import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: string;
  expiresAt: Date;
  createdAt: Date;
}

const SessionSchema: Schema<ISession> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    refreshToken: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    deviceInfo: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Session: Model<ISession> = mongoose.models.Session || mongoose.model("Session", SessionSchema);
