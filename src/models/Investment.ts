import { Schema, model, Document, Types } from "mongoose";

export interface IInvestment extends Document {
  owner: Types.ObjectId; // who recorded this investment (Sujait or Avi)
  amount: number;
  source: string; // e.g. "Borrowed from uncle", "Own savings"
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const investmentSchema = new Schema<IInvestment>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    source: { type: String, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

export default model<IInvestment>("Investment", investmentSchema);
