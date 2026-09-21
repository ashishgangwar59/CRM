import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILetterRegister extends Document {
  type: "INWARD" | "OUTWARD";
  serialNo: string; 
  date: Date; // Received Date (IN) / Dispatch Date (OUT)
  letterNo: string;
  letterDate: Date;
  partyName: string; // Received From (IN) / Sent To (OUT)
  subject: string;
  mode: string; // Dispatch Mode (Courier/Email/Post/Hand)
  handledBy: string; // Received By (IN) / Sent By (OUT)
  time: string;
  remarks: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LetterRegisterSchema: Schema<ILetterRegister> = new Schema(
  {
    type: { type: String, enum: ["INWARD", "OUTWARD"], required: true },
    serialNo: { type: String, required: true },
    date: { type: Date, required: true },
    letterNo: { type: String },
    letterDate: { type: Date },
    partyName: { type: String, required: true },
    subject: { type: String, required: true },
    mode: { type: String },
    handledBy: { type: String, required: true },
    time: { type: String },
    remarks: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Force Mongoose to re-compile the model in development
if (mongoose.models.LetterRegister) {
  delete mongoose.models.LetterRegister;
}
export const LetterRegister: Model<ILetterRegister> = mongoose.model<ILetterRegister>("LetterRegister", LetterRegisterSchema);
