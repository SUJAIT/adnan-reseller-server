"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyUnpaid = getMyUnpaid;
exports.addPaymentAsOwner = addPaymentAsOwner;
exports.getUnpaidByOwners = getUnpaidByOwners;
exports.addPaymentAsShop = addPaymentAsShop;
exports.getPaymentHistory = getPaymentHistory;
const Phone_1 = __importDefault(require("../models/Phone"));
const ShopPayment_1 = __importDefault(require("../models/ShopPayment"));
const User_1 = __importDefault(require("../models/User"));
const calc_1 = require("../utils/calc");
const realtime_1 = require("../realtime");
async function unpaidForOwner(ownerId) {
    const soldPhones = await Phone_1.default.find({ owner: ownerId, status: "sold" });
    const totalOwed = soldPhones.reduce((s, p) => s + (0, calc_1.amountOwedByShop)(p), 0);
    const payments = await ShopPayment_1.default.find({ owner: ownerId });
    const totalPaid = payments.reduce((s, pay) => s + pay.amount, 0);
    return {
        totalOwed,
        totalPaid,
        unpaid: Math.max(0, totalOwed - totalPaid),
    };
}
// Owner's own "Jahad/Zahed Telecom Unpaid Money" card
async function getMyUnpaid(req, res) {
    const result = await unpaidForOwner(req.user.id);
    res.json(result);
}
// Owner manually records money they received from the shop -> reduces unpaid balance
async function addPaymentAsOwner(req, res) {
    const { amount, note } = req.body;
    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "amount is required" });
    }
    const payment = await ShopPayment_1.default.create({
        owner: req.user.id,
        amount: Number(amount),
        note,
        recordedBy: req.user.id,
    });
    (0, realtime_1.broadcastChange)("payments");
    const result = await unpaidForOwner(req.user.id);
    res.status(201).json({ payment, ...result });
}
// Shop dashboard: "Sujait Unpaid" and "Ovi Unpaid" side by side
async function getUnpaidByOwners(_req, res) {
    const owners = await User_1.default.find({ role: "owner" }).select("name email");
    const results = await Promise.all(owners.map(async (o) => ({
        ownerId: o.id,
        name: o.name,
        ...(await unpaidForOwner(o.id)),
    })));
    res.json({ owners: results });
}
// Shop can also log that it paid a specific owner -> same shared balance, clears on both sides
async function addPaymentAsShop(req, res) {
    const { ownerId, amount, note } = req.body;
    if (!ownerId || !amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "ownerId and amount are required" });
    }
    const owner = await User_1.default.findById(ownerId);
    if (!owner || owner.role !== "owner") {
        return res.status(404).json({ message: "Owner not found" });
    }
    const payment = await ShopPayment_1.default.create({
        owner: ownerId,
        amount: Number(amount),
        note,
        recordedBy: req.user.id,
    });
    (0, realtime_1.broadcastChange)("payments");
    const result = await unpaidForOwner(ownerId);
    res.status(201).json({ payment, ...result });
}
async function getPaymentHistory(req, res) {
    if (req.user.role === "owner") {
        const payments = await ShopPayment_1.default.find({ owner: req.user.id }).sort({ createdAt: -1 });
        return res.json({ payments });
    }
    // Shop role: an explicit ownerId filters to one reseller; otherwise return everyone's
    // payments combined (owner name attached) so the UI can color-code Sujait vs Avi together.
    const ownerId = req.query.ownerId;
    const filter = ownerId ? { owner: ownerId } : {};
    const payments = await ShopPayment_1.default.find(filter).populate("owner", "name").sort({ createdAt: -1 });
    res.json({ payments });
}
