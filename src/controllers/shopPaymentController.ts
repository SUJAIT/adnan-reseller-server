import { Response } from "express";
import Phone from "../models/Phone";
import ShopPayment from "../models/ShopPayment";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { amountOwedByShop } from "../utils/calc";
import { broadcastChange } from "../realtime";

async function unpaidForOwner(ownerId: string) {
  const soldPhones = await Phone.find({ owner: ownerId, status: "sold" });
  const totalOwed = soldPhones.reduce((s, p) => s + amountOwedByShop(p), 0);

  const payments = await ShopPayment.find({ owner: ownerId });
  const totalPaid = payments.reduce((s, pay) => s + pay.amount, 0);

  return {
    totalOwed,
    totalPaid,
    unpaid: Math.max(0, totalOwed - totalPaid),
  };
}

// Owner's own "Jahad/Zahed Telecom Unpaid Money" card
export async function getMyUnpaid(req: AuthRequest, res: Response) {
  const result = await unpaidForOwner(req.user!.id);
  res.json(result);
}

// Owner manually records money they received from the shop -> reduces unpaid balance
export async function addPaymentAsOwner(req: AuthRequest, res: Response) {
  const { amount, note } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: "amount is required" });
  }
  const payment = await ShopPayment.create({
    owner: req.user!.id,
    amount: Number(amount),
    note,
    recordedBy: req.user!.id,
  });
  broadcastChange("payments");
  const result = await unpaidForOwner(req.user!.id);
  res.status(201).json({ payment, ...result });
}

// Shop dashboard: "Sujait Unpaid" and "Ovi Unpaid" side by side
export async function getUnpaidByOwners(_req: AuthRequest, res: Response) {
  const owners = await User.find({ role: "owner" }).select("name email");
  const results = await Promise.all(
    owners.map(async (o) => ({
      ownerId: o.id,
      name: o.name,
      ...(await unpaidForOwner(o.id)),
    }))
  );
  res.json({ owners: results });
}

// Shop can also log that it paid a specific owner -> same shared balance, clears on both sides
export async function addPaymentAsShop(req: AuthRequest, res: Response) {
  const { ownerId, amount, note } = req.body;
  if (!ownerId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ message: "ownerId and amount are required" });
  }
  const owner = await User.findById(ownerId);
  if (!owner || owner.role !== "owner") {
    return res.status(404).json({ message: "Owner not found" });
  }
  const payment = await ShopPayment.create({
    owner: ownerId,
    amount: Number(amount),
    note,
    recordedBy: req.user!.id,
  });
  broadcastChange("payments");
  const result = await unpaidForOwner(ownerId);
  res.status(201).json({ payment, ...result });
}

export async function getPaymentHistory(req: AuthRequest, res: Response) {
  if (req.user!.role === "owner") {
    const payments = await ShopPayment.find({ owner: req.user!.id }).sort({ createdAt: -1 });
    return res.json({ payments });
  }

  // Shop role: an explicit ownerId filters to one reseller; otherwise return everyone's
  // payments combined (owner name attached) so the UI can color-code Sujait vs Avi together.
  const ownerId = req.query.ownerId as string | undefined;
  const filter = ownerId ? { owner: ownerId } : {};
  const payments = await ShopPayment.find(filter).populate("owner", "name").sort({ createdAt: -1 });
  res.json({ payments });
}
