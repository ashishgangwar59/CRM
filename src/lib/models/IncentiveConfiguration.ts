import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIncentiveConfiguration extends Document {
  targetType: "Employee" | "Designation" | "TeamOwner" | "Default";
  targetId?: mongoose.Types.ObjectId; // Employee ID if targetType is Employee
  designationName?: string; // If targetType is Designation
  
  incentiveType: "Percentage" | "Fixed";
  value: number; // e.g. 1.5 for 1.5%, or 5000 for ₹5000
  
  effectiveDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const IncentiveConfigurationSchema: Schema<IIncentiveConfiguration> = new Schema(
  {
    targetType: { 
      type: String, 
      enum: ["Employee", "Designation", "TeamOwner", "Default"], 
      required: true 
    },
    targetId: { type: Schema.Types.ObjectId, ref: "Employee" },
    designationName: { type: String },
    
    incentiveType: { 
      type: String, 
      enum: ["Percentage", "Fixed"], 
      required: true 
    },
    value: { type: Number, required: true },
    
    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (mongoose.models.IncentiveConfiguration) {
  delete mongoose.models.IncentiveConfiguration;
}

export const IncentiveConfiguration: Model<IIncentiveConfiguration> = mongoose.model<IIncentiveConfiguration>("IncentiveConfiguration", IncentiveConfigurationSchema);
