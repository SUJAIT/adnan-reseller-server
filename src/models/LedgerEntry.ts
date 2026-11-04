import { Schema, model, Document, Types } from "mongoose";

export type LedgerEntryType = "expense" | "loss" | "repair";

/**
 * A single money movement that affects an owner's available profit and/or their
 * investment pool:
 *  - "expense": a voluntary withdrawal from Total Profit ("My Expenses" — e.g. buying a
 *    power bank). profitPortion === amount, investmentPortion === 0.
 *  - "loss": an Issue-page write-off. Taken from available profit first; whatever doesn't
 *    fit is taken from the investment pool instead. profitPortion + investmentPortion === amount.
 *  - "repair": an Issue-page repair cost ("Issue Fix"). Always comes out of the investment
 *    pool (and is simultaneously added to the phone's own cost basis). investmentPortion === amount.
 */
export interface ILedgerEntry extends Document {
  owner: Types.ObjectId; // Sujait or Avi whose profit/investment this affects
  type: LedgerEntryType;
  amount: number;
  note?: string;
  phone?: Types.ObjectId; // set for "loss" and "repair"
  profitPortion: number;
  investmentPortion: number;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["expense", "loss", "repair"], required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String },
    phone: { type: Schema.Types.ObjectId, ref: "Phone" },
    profitPortion: { type: Number, required: true, default: 0 },
    investmentPortion: { type: Number, required: true, default: 0 },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default model<ILedgerEntry>("LedgerEntry", ledgerEntrySchema);
