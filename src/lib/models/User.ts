import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  password?: string;
  role: string;
  lastPasswordChange: Date;
  requirePasswordChange: boolean;
  accessibleModules: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, default: "USER" },
    lastPasswordChange: { type: Date, default: Date.now },
    requirePasswordChange: { type: Boolean, default: false },
    accessibleModules: { type: [String], default: ["Overview", "Attendance", "Leads", "Reports", "Profile"] },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model("User", UserSchema);
