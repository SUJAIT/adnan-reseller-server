"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const investmentSchema = new mongoose_1.Schema({
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    source: { type: String, required: true },
    note: { type: String },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Investment", investmentSchema);
