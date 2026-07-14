import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmployeeTask extends Document {
  title: string;
  description: string;
  assignedTo: mongoose.Types.ObjectId;
  status: "Pending" | "InProgress" | "Completed";
  dueDate: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeTaskSchema: Schema<IEmployeeTask> = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    status: { type: String, enum: ["Pending", "InProgress", "Completed"], default: "Pending" },
    dueDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  },
  { timestamps: true }
);

export const EmployeeTask: Model<IEmployeeTask> = mongoose.models.EmployeeTask || mongoose.model("EmployeeTask", EmployeeTaskSchema);
