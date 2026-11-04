"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addExpense = addExpense;
exports.getMyExpenses = getMyExpenses;
exports.getMyLedger = getMyLedger;
exports.getProfitSummary = getProfitSummary;
const LedgerEntry_1 = __importDefault(require("../models/LedgerEntry"));
const calc_1 = require("../utils/calc");
const realtime_1 = require("../realtime");
// Owner: withdraw money from Total Profit (e.g. "took money to buy a power bank").
// Recorded with a note + timestamp so it shows up on "My Expenses".
async function addExpense(req, res) {
    const { amount, note } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0)
        return res.status(400).json({ message: "amount is required" });
    const entry = await LedgerEntry_1.default.create({
        owner: req.user.id,
        type: "expense",
        amount: amt,
        note,
        profitPortion: amt,
        investmentPortion: 0,
        recordedBy: req.user.id,
    });
    (0, realtime_1.broadcastChange)("ledger");
    const summary = await (0, calc_1.getProfitAndInvestmentSummary)(req.user.id);
    res.status(201).json({ entry, ...summary });
}
// "My Expenses" route — every profit withdrawal, newest first.
async function getMyExpenses(req, res) {
    const entries = await LedgerEntry_1.default.find({ owner: req.user.id, type: "expense" }).sort({ createdAt: -1 });
    res.json({ entries });
}
// Full ledger (expenses + losses + repairs) for anyone who wants the complete picture.
// Optional ?type=loss|expense|repair narrows it down -- used by the "Total Loss" detail
// Data Table on the dashboard (?type=loss), which mixes Issue-page write-offs and
// automatic "sold below handover price" shortfalls, since both are stored the same way.
async function getMyLedger(req, res) {
    const { type } = req.query;
    const filter = { owner: req.user.id };
    if (type && ["expense", "loss", "repair"].includes(String(type)))
        filter.type = type;
    const entries = await LedgerEntry_1.default.find(filter)
        .populate("phone", "name imei")
        .sort({ createdAt: -1 });
    res.json({ entries, total: entries.reduce((s, e) => s + e.amount, 0) });
}
async function getProfitSummary(req, res) {
    const summary = await (0, calc_1.getProfitAndInvestmentSummary)(req.user.id);
    res.json(summary);
}
