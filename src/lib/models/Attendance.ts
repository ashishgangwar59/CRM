import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  
  punchIn?: {
    time: Date;
    ipAddress: string;
    latitude?: number;
    longitude?: number;
  };
  
  punchOut?: {
    time: Date;
    ipAddress: string;
    latitude?: number;
    longitude?: number;
  };
  
  breaks: Array<{
    type: string;
    startTime: Date;
    endTime?: Date;
    durationMinutes?: number;
  }>;
  
  metrics: {
    workingHours: number;
    overtimeHours: number;
    isLate: boolean;
    isEarlyLeave: boolean;
  };
  
  status: "Present" | "Absent" | "Half-Day" | "Leave" | "Holiday";
  
  correction?: {
    status: "Pending" | "Approved" | "Rejected";
    reason: string;
    requestedTimeIn?: Date;
    requestedTimeOut?: Date;
    managerId?: mongoose.Types.ObjectId;
    managerNotes?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema<IAttendance> = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true },
    
    punchIn: {
      time: Date,
      ipAddress: String,
      latitude: Number,
      longitude: Number,
    },
    
    punchOut: {
      time: Date,
      ipAddress: String,
      latitude: Number,
      longitude: Number,
    },
    
    breaks: [{
      type: String,
      startTime: Date,
      endTime: Date,
      durationMinutes: Number,
    }],
    
    metrics: {
      workingHours: { type: Number, default: 0 },
      overtimeHours: { type: Number, default: 0 },
      isLate: { type: Boolean, default: false },
      isEarlyLeave: { type: Boolean, default: false },
    },
    
    status: { 
      type: String, 
      enum: ["Present", "Absent", "Half-Day", "Leave", "Holiday"], 
      default: "Absent" 
    },
    
    correction: {
      status: { type: String, enum: ["Pending", "Approved", "Rejected"] },
      reason: String,
      requestedTimeIn: Date,
      requestedTimeOut: Date,
      managerId: { type: Schema.Types.ObjectId, ref: "Employee" },
      managerNotes: String,
    },
  },
  { timestamps: true }
);

// Ensure only one attendance record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
