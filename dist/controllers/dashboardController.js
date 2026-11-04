"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnerDashboard = getOwnerDashboard;
exports.getShopDashboard = getShopDashboard;
const Phone_1 = __importDefault(require("../models/Phone"));
const Investment_1 = __importDefault(require("../models/Investment"));
const ShopPayment_1 = __importDefault(require("../models/ShopPayment"));
const User_1 = __importDefault(require("../models/User"));
const calc_1 = require("../utils/calc");
// Shared by both dashboards: quantity + average age (in days) of phones that have been
// sitting unsold for 10+ days.
function longTimeUnsoldSummary(phones) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - calc_1.LONG_TIME_UNSOLD_DAYS * 24 * 60 * 60 * 1000);
    const stale = phones.filter((p) => p.createdAt <= cutoff);
    const quantity = stale.length;
    const averageDaysUnsold = quantity
        ? Math.round((stale.reduce((s, p) => s + (0, calc_1.daysUnsold)(p, now), 0) / quantity) * 10) / 10
        : 0;
    return { quantity, averageDaysUnsold };
}
// Private per-owner dashboard: only the logged-in owner's own numbers
async function getOwnerDashboard(req, res) {
    const ownerId = req.user.id;
    const now = new Date();
    const myPhones = await Phone_1.default.find({ owner: ownerId });
    const myInvestments = await Investment_1.default.find({ owner: ownerId });
    const totalInvestmentPool = myInvestments.reduce((s, i) => s + i.amount, 0);
    // "Total Unsold Phone": total money currently tied up in stock that hasn't sold yet.
    const unsoldPhones = myPhones.filter((p) => p.status !== "sold");
    const totalUnsoldPhoneValue = unsoldPhones.reduce((s, p) => s + (0, calc_1.stockMainPrice)(p), 0);
    const unsoldPhoneQuantity = unsoldPhones.length;
    const soldPhones = myPhones.filter((p) => p.status === "sold" && p.soldPrice != null);
    const soldPhoneQuantity = soldPhones.length;
    // "Total Sold Phone" now shows the total SALE PRICE collected (sum of soldPrice), not the
    // count of sold phones -- e.g. handover 10,000 + sold 11,000 adds 11,000 here.
    const totalSoldPhoneValue = soldPhones.reduce((s, p) => s + (p.soldPrice || 0), 0);
    const weekStart = (0, calc_1.startOfWeek)(now);
    const monthStart = (0, calc_1.startOfMonth)(now);
    // "Total Mobile Adding Average": how many phones this owner adds per week / per month on
    // average, based on their whole history (from the first phone they ever added to now).
    const sortedByAdded = [...myPhones].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let weeklyAddingAverage = 0;
    let monthlyAddingAverage = 0;
    if (sortedByAdded.length > 0) {
        const firstAddedAt = sortedByAdded[0].createdAt;
        const daysSpan = Math.max(1, (now.getTime() - firstAddedAt.getTime()) / (1000 * 60 * 60 * 24));
        const weeksSpan = Math.max(1, daysSpan / 7);
        const monthsSpan = Math.max(1, daysSpan / 30.44);
        weeklyAddingAverage = myPhones.length / weeksSpan;
        monthlyAddingAverage = myPhones.length / monthsSpan;
    }
    const weeklyPurchaseTotal = myPhones
        .filter((p) => p.createdAt >= weekStart)
        .reduce((s, p) => s + (0, calc_1.stockMainPrice)(p), 0);
    const monthlyPurchaseTotal = myPhones
        .filter((p) => p.createdAt >= monthStart)
        .reduce((s, p) => s + (0, calc_1.stockMainPrice)(p), 0);
    const totalServiceCost = myPhones.reduce((s, p) => s + (p.serviceCost || 0) + (p.issueFixCost || 0), 0);
    const totalTransportCost = myPhones.reduce((s, p) => s + (p.transportCost || 0), 0);
    // Profit + expense/loss/repair ledger summary (single source of truth, shared with the
    // Issue page and My Expenses).
    const profit = await (0, calc_1.getProfitAndInvestmentSummary)(ownerId);
    // Remaining Balance: capital put in, minus what's tied up in unsold stock, minus whatever
    // has been written off against the investment pool (losses/repairs) -- PLUS whatever
    // profit is still available (money already taken out of profit is not added again, since
    // availableProfit already has withdrawals subtracted).
    const remainingBalance = totalInvestmentPool - totalUnsoldPhoneValue - profit.investmentWrittenOff + profit.availableProfit;
    // Jahad/Zahed Telecom Unpaid Money
    const totalOwedByShop = soldPhones.reduce((s, p) => s + (0, calc_1.amountOwedByShop)(p), 0);
    const payments = await ShopPayment_1.default.find({ owner: ownerId });
    const totalReceivedFromShop = payments.reduce((s, pay) => s + pay.amount, 0);
    const shopUnpaidMoney = Math.max(0, totalOwedByShop - totalReceivedFromShop);
    // Long Time Unsold Phone: still available, sitting in stock 10+ days.
    const longTimeUnsold = longTimeUnsoldSummary(myPhones.filter((p) => p.status === "available"));
    res.json({
        counts: {
            available: myPhones.filter((p) => p.status === "available").length,
            sold: soldPhoneQuantity,
            issue: myPhones.filter((p) => p.status === "issue").length,
            loss: myPhones.filter((p) => p.status === "loss").length,
        },
        totalInvestmentPool,
        totalUnsoldPhoneValue,
        unsoldPhoneQuantity,
        soldPhoneQuantity,
        totalSoldPhoneValue,
        weeklyAddingAverage,
        monthlyAddingAverage,
        remainingBalance,
        totalPersonalProfit: profit.totalPersonalProfit,
        totalShopProfitShare: profit.totalShopProfitShare,
        totalProfit: profit.grossProfit,
        availableProfit: profit.availableProfit,
        totalExpenses: profit.totalExpenses,
        totalLosses: profit.totalLosses,
        // "Total Loss" dashboard number -- combines Issue-page write-offs and automatic
        // "sold below handover price" shortfalls, since both are recorded as ledger losses.
        totalLoss: profit.totalLosses,
        totalRepairCosts: profit.totalRepairCosts,
        investmentWrittenOff: profit.investmentWrittenOff,
        totalServiceCost,
        totalTransportCost,
        weeklyPurchaseTotal,
        monthlyPurchaseTotal,
        shopUnpaidMoney,
        totalOwedByShop,
        totalReceivedFromShop,
        longTimeUnsoldQuantity: longTimeUnsold.quantity,
        longTimeUnsoldAvgDays: longTimeUnsold.averageDaysUnsold,
    });
}
// Shop (Zahed) dashboard: sales totals & profit totals by day/week/month/year + issue alerts
async function getShopDashboard(_req, res) {
    const now = new Date();
    const soldPhones = await Phone_1.default.find({ status: "sold", soldAt: { $ne: null } });
    const unsoldPhones = await Phone_1.default.find({ status: "available", hidden: false });
    const dayStart = (0, calc_1.startOfDay)(now);
    const weekStart = (0, calc_1.startOfWeek)(now);
    const monthStart = (0, calc_1.startOfMonth)(now);
    const yearStart = (0, calc_1.startOfYear)(now);
    const since = (list, start) => list.filter((p) => p.soldAt >= start);
    const sumSince = (start) => since(soldPhones, start).reduce((s, p) => s + (p.soldPrice || 0), 0);
    const countSince = (start) => since(soldPhones, start).length;
    const profitSince = (start) => since(soldPhones, start).reduce((s, p) => s + (0, calc_1.splitShare)(p), 0);
    // Average sale amount per sale (not per day) -- click-through detail table reuses the
    // existing "/phones/shop/sold/:period" route for the raw date/time/amount rows.
    const avgSince = (start) => {
        const count = countSince(start);
        return count ? Math.round(sumSince(start) / count) : 0;
    };
    const issuePhones = await Phone_1.default.find({ status: "issue" }).populate("owner", "name").sort({
        updatedAt: -1,
    });
    const owners = await User_1.default.find({ role: "owner" }).select("name");
    // Final Buying Price Unsold Phone Total -- total handover value tied up in unsold stock,
    // across both Sujait & Ovi.
    const finalBuyingPriceUnsoldTotal = unsoldPhones.reduce((s, p) => s + (p.shopHandoverPrice || 0), 0);
    // Long Time Unsold Phone -- across both owners (hidden phones excluded, same set the shop
    // can otherwise see on the Unsold Phones page).
    const longTimeUnsold = longTimeUnsoldSummary(unsoldPhones);
    res.json({
        totalSell: {
            day: { amount: sumSince(dayStart), count: countSince(dayStart) },
            week: { amount: sumSince(weekStart), count: countSince(weekStart) },
            month: { amount: sumSince(monthStart), count: countSince(monthStart) },
            year: { amount: sumSince(yearStart), count: countSince(yearStart) },
        },
        totalProfit: {
            week: profitSince(weekStart),
            month: profitSince(monthStart),
            year: profitSince(yearStart),
        },
        saleAverage: {
            week: { average: avgSince(weekStart), count: countSince(weekStart), total: sumSince(weekStart) },
            month: { average: avgSince(monthStart), count: countSince(monthStart), total: sumSince(monthStart) },
        },
        // "how many phones sold, including quantity" + "quantity and details for Total Unsold"
        totalSoldQuantity: soldPhones.length,
        totalUnsoldQuantity: unsoldPhones.length,
        finalBuyingPriceUnsoldTotal,
        longTimeUnsoldQuantity: longTimeUnsold.quantity,
        longTimeUnsoldAvgDays: longTimeUnsold.averageDaysUnsold,
        recentIssues: issuePhones.map(calc_1.toShopView),
        owners: owners.map((o) => ({ id: o.id, name: o.name })),
    });
}
