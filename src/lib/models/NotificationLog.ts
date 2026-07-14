import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotificationLog extends Document {
  recipientId: mongoose.Types.ObjectId;
  channel: "Email" | "SMS" | "Push";
  triggerEvent: string;
  message: string;
  status: "Sent" | "Failed";
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema: Schema<INotificationLog> = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    channel: { type: String, enum: ["Email", "SMS", "Push"], required: true },
    triggerEvent: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["Sent", "Failed"], default: "Sent" }
  },
  { timestamps: true }
);

export const NotificationLog: Model<INotificationLog> = mongoose.models.NotificationLog || mongoose.model("NotificationLog", NotificationLogSchema);
