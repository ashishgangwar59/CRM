import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeave extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveType: "Paid" | "Casual" | "Sick" | "Maternity" | "Paternity" | "Loss of Pay" | "Comp Off";
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  hourlyDuration?: number; // For hourly leave, e.g., 2 hours
  appliedSandwichDays: number; // For sandwich policy
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  managerId?: mongoose.Types.ObjectId;
  managerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema: Schema<ILeave> = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    leaveType: { 
      type: String, 
      enum: ["Paid", "Casual", "Sick", "Maternity", "Paternity", "Loss of Pay", "Comp Off"], 
      required: true 
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isHalfDay: { type: Boolean, default: false },
    hourlyDuration: { type: Number },
    appliedSandwichDays: { type: Number, default: 0 },
    reason: { type: String, required: true },
    status: { 
      type: String, 
      enum: ["Pending", "Approved", "Rejected", "Cancelled"], 
      default: "Pending" 
    },
    managerId: { type: Schema.Types.ObjectId, ref: "Employee" },
    managerNotes: { type: String },
  },
  { timestamps: true }
);

export const Leave: Model<ILeave> = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);
