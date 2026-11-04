// import { Schema, model, Document, Types } from "mongoose";
// import { PhoneStatus } from "../types";

// export interface ISellerInfo {
//   name?: string;
//   phoneNumber?: string;
//   nidNumber?: string;
//   nidImageUrl?: string;
//   socialMediaLink?: string; // social media link or ID name
//   note?: string;
// }

// export interface ICostEvent {
//   amount: number;
//   note?: string;
//   createdAt: Date;
// }

// export interface IPhone extends Document {
//   owner: Types.ObjectId; // Sujait or Avi (who bought/added the phone)

//   name: string; // phone name, e.g. "iPhone 11"
//   ram?: string;
//   storage?: string;

//   seller: ISellerInfo;

//   buyingPrice: number; // Facebook Marketplace price
//   transportCost: number; // car fare etc to collect the phone
//   serviceCost: number; // repair / back-shell / damage fix cost at purchase time
//   issueFixCost: number; // repair cost added later, after an "Issue Fix" while listed
//   personalProfit: number; // what the owner wants to keep

//   imei: string;
//   details: string; // model, condition, specs, description — optional
//   sellExpectation: string; // free text, e.g. "10000-12000" or "10000/12000"

//   images: string[]; // phone photos (cloudinary urls)

//   status: PhoneStatus; // available | sold | issue | loss
//   hidden: boolean; // hidden from Zahed's All Phone page

//   soldPrice?: number;
//   soldAt?: Date;

//   issueDescription?: string;
//   issueHistory: { description: string; createdAt: Date }[];
//   issueFixHistory: ICostEvent[]; // repair costs added via "Issue Fix"
//   lossHistory: ICostEvent[]; // amounts written off via "Loss"

//   createdAt: Date;
//   updatedAt: Date;
// }

// const costEventSchema = new Schema<ICostEvent>(
//   {
//     amount: { type: Number, required: true, min: 0 },
//     note: { type: String },
//     createdAt: { type: Date, default: Date.now },
//   },
//   { _id: false }
// );

// const phoneSchema = new Schema<IPhone>(
//   {
//     owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

//     name: { type: String, required: true, trim: true },
//     ram: { type: String },
//     storage: { type: String },

//     seller: {
//       name: { type: String },
//       phoneNumber: { type: String },
//       nidNumber: { type: String },
//       nidImageUrl: { type: String },
//       socialMediaLink: { type: String },
//       note: { type: String },
//     },

//     buyingPrice: { type: Number, required: true, min: 0 },
//     transportCost: { type: Number, default: 0, min: 0 },
//     serviceCost: { type: Number, default: 0, min: 0 },
//     issueFixCost: { type: Number, default: 0, min: 0 },
//     personalProfit: { type: Number, default: 0, min: 0 },

//     imei: { type: String, required: true, unique: true, trim: true },
//     details: { type: String, default: "" },
//     sellExpectation: { type: String, required: true, trim: true },

//     images: [{ type: String }],

//     status: { type: String, enum: ["available", "sold", "issue", "loss"], default: "available" },
//     hidden: { type: Boolean, default: false },

//     soldPrice: { type: Number },
//     soldAt: { type: Date },

//     issueDescription: { type: String },
//     issueHistory: [
//       {
//         description: String,
//         createdAt: { type: Date, default: Date.now },
//       },
//     ],
//     issueFixHistory: [costEventSchema],
//     lossHistory: [costEventSchema],
//   },
//   { timestamps: true }
// );

// // Total price handed to the shop = buying + transport + service + issue-fix repairs + personal profit
// phoneSchema.virtual("shopHandoverPrice").get(function (this: IPhone) {
//   return this.buyingPrice + this.transportCost + this.serviceCost + this.issueFixCost + this.personalProfit;
// });

// // Extra profit earned when shop sells above handover price, split 50/50
// phoneSchema.virtual("shopProfit").get(function (this: IPhone) {
//   if (this.status !== "sold" || this.soldPrice == null) return 0;
//   const handover = this.buyingPrice + this.transportCost + this.serviceCost + this.issueFixCost + this.personalProfit;
//   return Math.max(0, this.soldPrice - handover);
// });

// phoneSchema.virtual("splitShare").get(function (this: IPhone) {
//   if (this.status !== "sold" || this.soldPrice == null) return 0;
//   const handover = this.buyingPrice + this.transportCost + this.serviceCost + this.issueFixCost + this.personalProfit;
//   const profit = Math.max(0, this.soldPrice - handover);
//   return profit / 2;
// });

// phoneSchema.set("toJSON", { virtuals: true });
// phoneSchema.set("toObject", { virtuals: true });

// export default model<IPhone>("Phone", phoneSchema);


// new update 8/18/26

import { Schema, model, Document, Types } from "mongoose";
import { PhoneStatus } from "../types";

export interface ISellerInfo {
  name?: string;
  phoneNumber?: string;
  nidNumber?: string;
  nidImageUrl?: string;
  socialMediaLink?: string; // social media link or ID name
  note?: string;
}

export interface ICostEvent {
  amount: number;
  note?: string;
  createdAt: Date;
}

export type PaymentMethod = "cash" | "bank" | "bkash";

// Optional buyer details captured (or later edited) when the shop marks a phone as sold.
// Every field is optional -- a phone can be sold with none of this filled in, and the
// invoice can still be printed with these left blank for the shop to fill in by hand.
export interface ICustomerInfo {
  name?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  paymentMethod?: PaymentMethod;
  bankName?: string;
  bankNumber?: string;
  bkashNumber?: string;
}

export interface IPhone extends Document {
  owner: Types.ObjectId; // Sujait or Avi (who bought/added the phone)

  name: string; // phone name, e.g. "iPhone 11"
  ram?: string;
  storage?: string;

  seller: ISellerInfo;

  buyingPrice: number; // Facebook Marketplace price
  transportCost: number; // car fare etc to collect the phone
  serviceCost: number; // repair / back-shell / damage fix cost at purchase time
  issueFixCost: number; // repair cost added later, after an "Issue Fix" while listed
  personalProfit: number; // what the owner wants to keep

  imei: string;
  details: string; // model, condition, specs, description — optional
  sellExpectation: string; // free text, e.g. "10000-12000" or "10000/12000"

  images: string[]; // phone photos (cloudinary urls)

  status: PhoneStatus; // available | sold | issue | loss
  hidden: boolean; // hidden from Zahed's All Phone page

  soldPrice?: number;
  soldAt?: Date;
  customer?: ICustomerInfo; // optional buyer details, entered at sale time or edited later via Invoice Edit

  issueDescription?: string;
  issueHistory: { description: string; createdAt: Date }[];
  issueFixHistory: ICostEvent[]; // repair costs added via "Issue Fix"
  lossHistory: ICostEvent[]; // amounts written off via "Loss"

  createdAt: Date;
  updatedAt: Date;
}

const costEventSchema = new Schema<ICostEvent>(
  {
    amount: { type: Number, required: true, min: 0 },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const phoneSchema = new Schema<IPhone>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true, trim: true },
    ram: { type: String },
    storage: { type: String },

    seller: {
      name: { type: String },
      phoneNumber: { type: String },
      nidNumber: { type: String },
      nidImageUrl: { type: String },
      socialMediaLink: { type: String },
      note: { type: String },
    },

    buyingPrice: { type: Number, required: true, min: 0 },
    transportCost: { type: Number, default: 0, min: 0 },
    serviceCost: { type: Number, default: 0, min: 0 },
    issueFixCost: { type: Number, default: 0, min: 0 },
    personalProfit: { type: Number, default: 0, min: 0 },

    imei: { type: String, required: true, unique: true, trim: true },
    details: { type: String, default: "" },
    sellExpectation: { type: String, required: true, trim: true },

    images: [{ type: String }],

    status: { type: String, enum: ["available", "sold", "issue", "loss"], default: "available" },
    hidden: { type: Boolean, default: false },

    soldPrice: { type: Number },
    soldAt: { type: Date },
    customer: {
      name: { type: String, trim: true },
      phoneNumber: { type: String, trim: true },
      email: { type: String, trim: true },
      address: { type: String, trim: true },
      paymentMethod: { type: String, enum: ["cash", "bank", "bkash"] },
      bankName: { type: String, trim: true },
      bankNumber: { type: String, trim: true },
      bkashNumber: { type: String, trim: true },
    },

    issueDescription: { type: String },
    issueHistory: [
      {
        description: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    issueFixHistory: [costEventSchema],
    lossHistory: [costEventSchema],
  },
  { timestamps: true }
);

// Total price handed to the shop = buying + transport + service + issue-fix repairs + personal profit
phoneSchema.virtual("shopHandoverPrice").get(function (this: IPhone) {
  return this.buyingPrice + this.transportCost + this.serviceCost + this.issueFixCost + this.personalProfit;
});

// Extra profit earned when shop sells above handover price, split 50/50
phoneSchema.virtual("shopProfit").get(function (this: IPhone) {
  if (this.status !== "sold" || this.soldPrice == null) return 0;
  const handover = this.buyingPrice + this.transportCost + this.serviceCost + this.issueFixCost + this.personalProfit;
  return Math.max(0, this.soldPrice - handover);
});

phoneSchema.virtual("splitShare").get(function (this: IPhone) {
  if (this.status !== "sold" || this.soldPrice == null) return 0;
  const handover = this.buyingPrice + this.transportCost + this.serviceCost + this.issueFixCost + this.personalProfit;
  const profit = Math.max(0, this.soldPrice - handover);
  return profit / 2;
});

phoneSchema.set("toJSON", { virtuals: true });
phoneSchema.set("toObject", { virtuals: true });

export default model<IPhone>("Phone", phoneSchema);
