import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema: Schema<ICounter> = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<ICounter> = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
