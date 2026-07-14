import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHoliday extends Document {
  name: string;
  date: Date;
  description?: string;
  type: "Public" | "Company" | "Optional";
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema: Schema<IHoliday> = new Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true, unique: true },
    description: { type: String },
    type: { 
      type: String, 
      enum: ["Public", "Company", "Optional"], 
      default: "Public" 
    },
  },
  { timestamps: true }
);

export const Holiday: Model<IHoliday> = mongoose.models.Holiday || mongoose.model("Holiday", HolidaySchema);
