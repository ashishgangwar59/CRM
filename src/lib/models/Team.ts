import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeam extends Document {
  name: string;
  owner: mongoose.Types.ObjectId; // References User
  members: mongoose.Types.ObjectId[]; // References User
  department: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema: Schema<ITeam> = new Schema(
  {
    name: { type: String, required: true, unique: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    department: { type: String, default: "General" },
  },
  { timestamps: true }
);

// Delete the cached model to ensure hot-reloads pick up schema changes
if (mongoose.models.Team) {
  delete mongoose.models.Team;
}

export const Team: Model<ITeam> = mongoose.model<ITeam>("Team", TeamSchema);
