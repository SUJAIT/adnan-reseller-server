import { Response } from "express";
import LedgerEntry from "../models/LedgerEntry";
import { AuthRequest } from "../middleware/auth";
import { getProfitAndInvestmentSummary } from "../utils/calc";
import { broadcastChange } from "../realtime";

// Owner: withdraw money from Total Profit (e.g. "took money to buy a power bank").
// Recorded with a note + timestamp so it shows up on "My Expenses".
export async function addExpense(req: AuthRequest, res: Response) {
  const { amount, note } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ message: "amount is required" });

  const entry = await LedgerEntry.create({
    owner: req.user!.id,
    type: "expense",
    amount: amt,
    note,
    profitPortion: amt,
    investmentPortion: 0,
    recordedBy: req.user!.id,
  });

  broadcastChange("ledger");
  const summary = await getProfitAndInvestmentSummary(req.user!.id);
  res.status(201).json({ entry, ...summary });
}

// "My Expenses" route — every profit withdrawal, newest first.
export async function getMyExpenses(req: AuthRequest, res: Response) {
  const entries = await LedgerEntry.find({ owner: req.user!.id, type: "expense" }).sort({ createdAt: -1 });
  res.json({ entries });
}

// Full ledger (expenses + losses + repairs) for anyone who wants the complete picture.
// Optional ?type=loss|expense|repair narrows it down -- used by the "Total Loss" detail
// Data Table on the dashboard (?type=loss), which mixes Issue-page write-offs and
// automatic "sold below handover price" shortfalls, since both are stored the same way.
export async function getMyLedger(req: AuthRequest, res: Response) {
  const { type } = req.query;
  const filter: Record<string, unknown> = { owner: req.user!.id };
  if (type && ["expense", "loss", "repair"].includes(String(type))) filter.type = type;

  const entries = await LedgerEntry.find(filter)
    .populate("phone", "name imei")
    .sort({ createdAt: -1 });
  res.json({ entries, total: entries.reduce((s, e) => s + e.amount, 0) });
}

export async function getProfitSummary(req: AuthRequest, res: Response) {
  const summary = await getProfitAndInvestmentSummary(req.user!.id);
  res.json(summary);
}
