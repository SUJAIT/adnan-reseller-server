"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addInvestment = addInvestment;
exports.getMyInvestments = getMyInvestments;
exports.deleteInvestment = deleteInvestment;
const Investment_1 = __importDefault(require("../models/Investment"));
const realtime_1 = require("../realtime");
async function addInvestment(req, res) {
    const { amount, source, note } = req.body;
    if (!amount || !source) {
        return res.status(400).json({ message: "amount and source are required" });
    }
    const investment = await Investment_1.default.create({
        owner: req.user.id,
        amount: Number(amount),
        source,
        note,
    });
    (0, realtime_1.broadcastChange)("investments");
    res.status(201).json({ investment });
}
// Each owner only sees their own investments (private dashboard)
async function getMyInvestments(req, res) {
    const investments = await Investment_1.default.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ investments });
}
async function deleteInvestment(req, res) {
    const inv = await Investment_1.default.findById(req.params.id);
    if (!inv)
        return res.status(404).json({ message: "Not found" });
    if (String(inv.owner) !== req.user.id) {
        return res.status(403).json({ message: "Not your investment" });
    }
    await inv.deleteOne();
    (0, realtime_1.broadcastChange)("investments");
    res.json({ message: "Deleted" });
}
