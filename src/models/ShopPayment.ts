import { Schema, model, Document, Types } from "mongoose";

// Records money actually received by an owner (Sujait/Ovi) from the shop (Jahed/Zahed).
// Recording a payment here reduces that owner's "Shop Unpaid Money" balance everywhere
// it is shown (owner's own dashboard AND the shop's dashboard), since both read the
// same underlying data.
export interface IShopPayment extends Document {
  owner: Types.ObjectId; // which reseller (Sujait or Ovi) this payment is for
  amount: number;
  note?: string;
  recordedBy: Types.ObjectId; // who logged it (could be the owner themself or the shop user)
  createdAt: Date;
  updatedAt: Date;
}

const shopPaymentSchema = new Schema<IShopPayment>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default model<IShopPayment>("ShopPayment", shopPaymentSchema);
