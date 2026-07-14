import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILoginHistory extends Document {
  userId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  createdAt: Date;
}

const LoginHistorySchema: Schema<ILoginHistory> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LoginHistory: Model<ILoginHistory> = mongoose.models.LoginHistory || mongoose.model("LoginHistory", LoginHistorySchema);
