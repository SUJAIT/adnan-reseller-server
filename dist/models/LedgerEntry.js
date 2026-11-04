"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ledgerEntrySchema = new mongoose_1.Schema({
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["expense", "loss", "repair"], required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String },
    phone: { type: mongoose_1.Schema.Types.ObjectId, ref: "Phone" },
    profitPortion: { type: Number, required: true, default: 0 },
    investmentPortion: { type: Number, required: true, default: 0 },
    recordedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("LedgerEntry", ledgerEntrySchema);
