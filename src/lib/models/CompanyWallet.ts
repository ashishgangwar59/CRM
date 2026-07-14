import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICompanyWallet extends Document {
  balance: number;
  updatedAt: Date;
}

const CompanyWalletSchema: Schema<ICompanyWallet> = new Schema(
  {
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CompanyWallet: Model<ICompanyWallet> = mongoose.models.CompanyWallet || mongoose.model("CompanyWallet", CompanyWalletSchema);
