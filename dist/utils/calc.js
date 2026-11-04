"use strict";
// import { IPhone } from "../models/Phone";
// import LedgerEntry from "../models/LedgerEntry";
// import Phone from "../models/Phone";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LONG_TIME_UNSOLD_DAYS = void 0;
exports.stockMainPrice = stockMainPrice;
exports.handoverPrice = handoverPrice;
exports.shopExtraProfit = shopExtraProfit;
exports.splitShare = splitShare;
exports.amountOwedByShop = amountOwedByShop;
exports.daysUnsold = daysUnsold;
exports.isLongTimeUnsold = isLongTimeUnsold;
exports.saleShortfall = saleShortfall;
exports.startOfWeek = startOfWeek;
exports.startOfMonth = startOfMonth;
exports.startOfYear = startOfYear;
exports.startOfDay = startOfDay;
exports.toShopView = toShopView;
exports.getProfitAndInvestmentSummary = getProfitAndInvestmentSummary;
const LedgerEntry_1 = __importDefault(require("../models/LedgerEntry"));
const Phone_1 = __importDefault(require("../models/Phone"));
/**
 * "Main Price" of a phone for stock-value purposes (Total Unsold Phone, This Week/Month
 * Buying Phone). This is pure money spent so far: buying price + transport cost (if any)
 * + service cost (if any) + any later repair cost from an "Issue Fix". Personal profit is
 * NOT money spent, so it is excluded here.
 */
function stockMainPrice(p) {
    return (p.buyingPrice || 0) + (p.transportCost || 0) + (p.serviceCost || 0) + (p.issueFixCost || 0);
}
/**
 * Shop handover price: the price given to the shop to sell the phone at (or above).
 * buying + transport + service + issue-fix repairs + the personal profit the owner wants to keep.
 */
function handoverPrice(p) {
    return ((p.buyingPrice || 0) +
        (p.transportCost || 0) +
        (p.serviceCost || 0) +
        (p.issueFixCost || 0) +
        (p.personalProfit || 0));
}
/** Extra amount the shop sold above handover price (0 if sold at/under handover, or not sold). */
function shopExtraProfit(p) {
    if (p.status !== "sold" || p.soldPrice == null)
        return 0;
    return Math.max(0, p.soldPrice - handoverPrice(p));
}
/** The extra profit split 50/50 between the shop and the owner. */
function splitShare(p) {
    return shopExtraProfit(p) / 2;
}
/**
 * What the shop owes the owner for a sold phone: the handover price itself (the shop
 * collected the full sell price, so it owes back what it was handed the phone for) plus
 * the owner's half of any extra profit made above that.
 */
function amountOwedByShop(p) {
    if (p.status !== "sold" || p.soldPrice == null)
        return 0;
    return handoverPrice(p) + splitShare(p);
}
/** A phone counts as "Long Time Unsold" once it has sat in stock, unsold, for this many days. */
exports.LONG_TIME_UNSOLD_DAYS = 10;
/** How many whole days a phone has been sitting unsold (from createdAt to now). */
function daysUnsold(p, now = new Date()) {
    return Math.floor((now.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24));
}
/** True once a still-unsold phone has been in stock 10+ days. */
function isLongTimeUnsold(p, now = new Date(), thresholdDays = exports.LONG_TIME_UNSOLD_DAYS) {
    return p.status === "available" && daysUnsold(p, now) >= thresholdDays;
}
/**
 * If a phone is sold for less than what it cost to hand over to the shop (handoverPrice),
 * the shortfall is a loss -- e.g. handed over at 12,000 but the shop only got 10,500 for it.
 */
function saleShortfall(p) {
    if (p.status !== "sold" || p.soldPrice == null)
        return 0;
    return Math.max(0, handoverPrice(p) - p.soldPrice);
}
function startOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay(); // 0 = Sunday
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
}
function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d) {
    return new Date(d.getFullYear(), 0, 1);
}
function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
/**
 * Fields the shop role is allowed to see for a phone. The shop must never see the
 * reseller's internal cost breakdown (buyingPrice / transportCost / serviceCost /
 * personalProfit) — only the single "handover price" it was charged.
 */
function toShopView(phone) {
    const obj = phone.toObject ? phone.toObject() : phone;
    return {
        _id: obj._id,
        name: obj.name,
        imei: obj.imei,
        ram: obj.ram,
        storage: obj.storage,
        details: obj.details,
        images: obj.images,
        status: obj.status,
        sellExpectation: obj.sellExpectation,
        handoverPrice: obj.shopHandoverPrice,
        soldPrice: obj.soldPrice,
        soldAt: obj.soldAt,
        // Jahed's (the shop's) own cut of the upside when sold above handover price — 50% of
        // the profit above handoverPrice, same number the owner dashboard calls "Shop Profit
        // Share". Shown beside Sale Amount on the Sale Average detail tables.
        shopProfitShare: obj.splitShare,
        // Sold for less than what the shop was handed the phone for.
        isLossSale: obj.status === "sold" && obj.soldPrice != null && obj.soldPrice < obj.shopHandoverPrice,
        issueDescription: obj.issueDescription,
        // Optional buyer details captured at sale time (or edited later via Invoice Edit) --
        // used to print the invoice. Every field is optional and may be entirely absent.
        customer: obj.customer,
        owner: obj.owner,
        createdAt: obj.createdAt,
    };
}
/**
 * Gross total profit (personal profit realized on sold phones + the owner's split share of
 * shop upside), and the "available" (net) profit after every expense/loss withdrawal so far.
 * Also returns how much of the investment pool has been written off by losses/repairs.
 */
async function getProfitAndInvestmentSummary(ownerId) {
    const soldPhones = await Phone_1.default.find({ owner: ownerId, status: "sold", soldPrice: { $ne: null } });
    const totalPersonalProfit = soldPhones.reduce((s, p) => s + (p.personalProfit || 0), 0);
    const totalShopProfitShare = soldPhones.reduce((s, p) => s + splitShare(p), 0);
    const grossProfit = totalPersonalProfit + totalShopProfitShare;
    const ledgerEntries = await LedgerEntry_1.default.find({ owner: ownerId });
    const profitWithdrawn = ledgerEntries.reduce((s, e) => s + e.profitPortion, 0);
    // Only a Loss is truly "money gone" from the investment pool. A repair's cost is instead
    // embedded in the phone's own stock value (issueFixCost raises stockMainPrice), so it must
    // NOT also be subtracted here — that would double-count the same taka once as "still tied
    // up in unsold stock" and again as "written off".
    const investmentWrittenOff = ledgerEntries
        .filter((e) => e.type === "loss")
        .reduce((s, e) => s + e.investmentPortion, 0);
    const totalExpenses = ledgerEntries
        .filter((e) => e.type === "expense")
        .reduce((s, e) => s + e.amount, 0);
    const totalLosses = ledgerEntries.filter((e) => e.type === "loss").reduce((s, e) => s + e.amount, 0);
    const totalRepairCosts = ledgerEntries
        .filter((e) => e.type === "repair")
        .reduce((s, e) => s + e.amount, 0);
    return {
        totalPersonalProfit,
        totalShopProfitShare,
        grossProfit,
        availableProfit: Math.max(0, grossProfit - profitWithdrawn),
        investmentWrittenOff,
        totalExpenses,
        totalLosses,
        totalRepairCosts,
    };
}
