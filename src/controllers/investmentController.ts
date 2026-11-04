import { Response } from "express";
import Investment from "../models/Investment";
import { AuthRequest } from "../middleware/auth";
import { broadcastChange } from "../realtime";

export async function addInvestment(req: AuthRequest, res: Response) {
  const { amount, source, note } = req.body;
  if (!amount || !source) {
    return res.status(400).json({ message: "amount and source are required" });
  }
  const investment = await Investment.create({
    owner: req.user!.id,
    amount: Number(amount),
    source,
    note,
  });
  broadcastChange("investments");
  res.status(201).json({ investment });
}

// Each owner only sees their own investments (private dashboard)
export async function getMyInvestments(req: AuthRequest, res: Response) {
  const investments = await Investment.find({ owner: req.user!.id }).sort({ createdAt: -1 });
  res.json({ investments });
}

export async function deleteInvestment(req: AuthRequest, res: Response) {
  const inv = await Investment.findById(req.params.id);
  if (!inv) return res.status(404).json({ message: "Not found" });
  if (String(inv.owner) !== req.user!.id) {
    return res.status(403).json({ message: "Not your investment" });
  }
  await inv.deleteOne();
  broadcastChange("investments");
  res.json({ message: "Deleted" });
}
