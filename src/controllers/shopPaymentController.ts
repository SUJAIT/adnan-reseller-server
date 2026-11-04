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


// ---- Safe payment helpers -------------------------------------------------
// Serialise payment writes per owner so two quick clicks / two devices can never
// both pass the "amount <= unpaid" check and push the balance below zero.
const ownerLocks = new Map<string, Promise<unknown>>();
function withOwnerLock<T>(ownerId: string, fn: () => Promise<T>): Promise<T> {
  const prev = ownerLocks.get(ownerId) || Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  const tail = run.catch(() => undefined);
  ownerLocks.set(ownerId, tail);
  tail.then(() => {
    if (ownerLocks.get(ownerId) === tail) ownerLocks.delete(ownerId);
  });
  return run;
}

class PaymentError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Validates the amount against the CURRENT unpaid balance and saves the payment.
async function recordPayment(ownerId: string, recordedBy: string, rawAmount: unknown, note?: string) {
  const amount = Math.round(Number(rawAmount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentError(400, "Enter a valid amount greater than 0");
  }
  return withOwnerLock(ownerId, async () => {
    const { unpaid } = await unpaidForOwner(ownerId);
    if (unpaid <= 0) {
      throw new PaymentError(400, "There is no unpaid money to minus");
    }
    if (amount > unpaid) {
      throw new PaymentError(400, `You can minus at most ${unpaid} (current unpaid). You entered ${amount}.`);
    }
    const payment = await ShopPayment.create({ owner: ownerId, amount, note, recordedBy });
    broadcastChange("payments");
    const result = await unpaidForOwner(ownerId);
    return { payment, ...result };
  });
}

function sendPaymentError(res: Response, err: unknown) {
  if (err instanceof PaymentError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: "Could not save payment" });
}

// Owner's own "Jahad/Zahed Telecom Unpaid Money" card
export async function getMyUnpaid(req: AuthRequest, res: Response) {
  const result = await unpaidForOwner(req.user!.id);
  res.json(result);
}

// Owner manually records money they received from the shop -> reduces unpaid balance
export async function addPaymentAsOwner(req: AuthRequest, res: Response) {
  try {
    const { amount, note } = req.body;
    const result = await recordPayment(req.user!.id, req.user!.id, amount, note);
    res.status(201).json(result);
  } catch (err) {
    sendPaymentError(res, err);
  }
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
  try {
    const { ownerId, amount, note } = req.body;
    if (!ownerId) return res.status(400).json({ message: "ownerId and amount are required" });
    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== "owner") {
      return res.status(404).json({ message: "Owner not found" });
    }
    const result = await recordPayment(ownerId, req.user!.id, amount, note);
    res.status(201).json(result);
  } catch (err) {
    sendPaymentError(res, err);
  }
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
