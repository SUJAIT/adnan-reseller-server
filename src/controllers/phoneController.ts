// import { Response } from "express";
// import Phone, { IPhone } from "../models/Phone";
// import LedgerEntry from "../models/LedgerEntry";
// import { AuthRequest } from "../middleware/auth";
// import {
//   startOfWeek,
//   startOfMonth,
//   startOfYear,
//   toShopView,
//   getProfitAndInvestmentSummary,
//   daysUnsold,
//   LONG_TIME_UNSOLD_DAYS,
//   saleShortfall,
// } from "../utils/calc";
// import { broadcastChange } from "../realtime";

// // Auto-generated "loss" ledger notes are tagged so we can find/undo them cleanly (e.g. if
// // the shop mis-clicked "Sold" and cancels it, or edits the sold price).
// const SALE_LOSS_NOTE = "Sold below shop handover price";

// // Case-insensitive search filter matching against IMEI, name, or details
// function searchFilter(q: unknown) {
//   if (!q || typeof q !== "string" || !q.trim()) return {};
//   const rx = new RegExp(q.trim(), "i");
//   return { $or: [{ imei: rx }, { name: rx }, { details: rx }] };
// }

// // Idempotency guard for "Add Phone": if the exact same owner submits the exact same set of
// // IMEIs again within this window, we treat it as a duplicate submit (double-tap, a client
// // retry after a slow/dropped response, etc.) and return the phones that were already
// // created instead of creating a second, "cloned" copy.
// const RECENT_ADD_WINDOW_MS = 20_000;
// const recentAddSubmissions = new Map<string, { at: number; phones: any[] }>();
// function recentAddKey(ownerId: string, imeis: string[]) {
//   return `${ownerId}::${[...imeis].sort().join(",")}`;
// }
// function pruneRecentAddSubmissions() {
//   const cutoff = Date.now() - RECENT_ADD_WINDOW_MS;
//   for (const [key, entry] of recentAddSubmissions) {
//     if (entry.at < cutoff) recentAddSubmissions.delete(key);
//   }
// }

// // Owner: add a new phone. If more than one IMEI is submitted, one Phone document is
// // created per IMEI (all sharing the same name/specs/costs/seller info) — e.g. buying two
// // identical units in one trip still gets tracked as two separate stock items.
// export async function addPhone(req: AuthRequest, res: Response) {
//   try {
//     const {
//       name,
//       ram,
//       storage,
//       sellerName,
//       sellerPhoneNumber,
//       sellerNidNumber,
//       sellerSocialMediaLink,
//       sellerNote,
//       buyingPrice,
//       transportCost,
//       serviceCost,
//       personalProfit,
//       details,
//       sellExpectation,
//     } = req.body;

//     // imeis can arrive under a few different keys/shapes depending on how the form posted:
//     // repeated "imeis" fields (multer turns those into a real array), the bracketed
//     // "imeis[]" convention, a single JSON-encoded string, or a lone "imei". Checking only
//     // "imeis" and missing "imeis[]" (or vice versa) is exactly how a 2nd/3rd IMEI can
//     // silently disappear on submit, so every shape is normalized here.
//     const rawImeis = req.body.imeis ?? req.body["imeis[]"] ?? req.body.imei;
//     let imeis: string[] = [];
//     if (Array.isArray(rawImeis)) {
//       imeis = rawImeis;
//     } else if (typeof rawImeis === "string") {
//       try {
//         const parsed = JSON.parse(rawImeis);
//         imeis = Array.isArray(parsed) ? parsed : [rawImeis];
//       } catch {
//         imeis = [rawImeis];
//       }
//     }
//     // Belt-and-braces: also fold in anything that arrived under the other key, in case the
//     // client sent a mix (shouldn't normally happen, but avoids silently dropping an IMEI).
//     for (const altKey of ["imeis[]", "imeis"]) {
//       const alt = (req.body as any)[altKey];
//       if (alt === rawImeis) continue;
//       if (Array.isArray(alt)) imeis.push(...alt);
//       else if (typeof alt === "string") imeis.push(alt);
//     }
//     imeis = imeis.map((i) => String(i).trim()).filter(Boolean);
//     // De-duplicate defensively so a double-submitted form field never creates two
//     // identical stock entries for the same physical phone.
//     imeis = Array.from(new Set(imeis));

//     if (!name || !buyingPrice || imeis.length === 0 || !sellExpectation) {
//       return res
//         .status(400)
//         .json({ message: "name, buyingPrice, at least one imei, and sellExpectation are required" });
//     }

//     const ownerId = req.user!.id;

//     // Same owner, same exact IMEI set, submitted again within the last few seconds --
//     // almost certainly a double submit rather than a genuine second purchase. Return what
//     // was already created instead of creating a duplicate/"cloned" entry.
//     pruneRecentAddSubmissions();
//     const dedupeKey = recentAddKey(ownerId, imeis);
//     const recent = recentAddSubmissions.get(dedupeKey);
//     if (recent) {
//       return res.status(201).json({ phones: recent.phones, deduped: true });
//     }

//     // Guard against a genuine race (this same request arriving twice almost
//     // simultaneously, e.g. a real double-tap before the first response even lands):
//     // reserve the key up front so a second concurrent request sees it immediately.
//     recentAddSubmissions.set(dedupeKey, { at: Date.now(), phones: [] });

//     // Refuse up front if any of these IMEIs already exist anywhere in the system, rather
//     // than creating some of the batch and only failing on the duplicate one -- that
//     // "partial success" is exactly what used to leave one IMEI saved and the other
//     // silently missing (and prompted a retry that looked like a duplicate add).
//     const existing = await Phone.find({ imei: { $in: imeis } }).select("imei");
//     if (existing.length > 0) {
//       recentAddSubmissions.delete(dedupeKey);
//       return res.status(400).json({
//         message: `This IMEI is already in the system: ${existing.map((p) => p.imei).join(", ")}`,
//       });
//     }

//     const files = (req.files as { [field: string]: Express.Multer.File[] }) || {};
//     const images = (files["images"] || []).map((f) => (f as any).path);
//     const nidImageUrl = files["nidImage"]?.[0] ? (files["nidImage"][0] as any).path : undefined;

//     const shared = {
//       owner: ownerId,
//       name,
//       ram,
//       storage,
//       seller: {
//         name: sellerName,
//         phoneNumber: sellerPhoneNumber,
//         nidNumber: sellerNidNumber,
//         nidImageUrl,
//         socialMediaLink: sellerSocialMediaLink,
//         note: sellerNote,
//       },
//       buyingPrice: Number(buyingPrice),
//       transportCost: Number(transportCost) || 0,
//       serviceCost: Number(serviceCost) || 0,
//       personalProfit: Number(personalProfit) || 0,
//       details: details || "",
//       sellExpectation: String(sellExpectation),
//       images,
//     };

//     let phones;
//     try {
//       phones = await Phone.insertMany(
//         imeis.map((imei) => ({ ...shared, imei })),
//         { ordered: true }
//       );
//     } catch (createErr) {
//       // If a couple of docs made it in before a failure (e.g. a genuine last-instant race
//       // on a duplicate IMEI), clean up whatever partially landed so it doesn't linger as an
//       // orphaned/"cloned" entry.
//       await Phone.deleteMany({ imei: { $in: imeis }, owner: ownerId, createdAt: { $gte: new Date(Date.now() - 5000) } });
//       recentAddSubmissions.delete(dedupeKey);
//       throw createErr;
//     }

//     recentAddSubmissions.set(dedupeKey, { at: Date.now(), phones });
//     broadcastChange("phones");
//     res.status(201).json({ phones });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to add phone", error: (err as Error).message });
//   }
// }

// // Owner: all phones (both Sujait & Avi see the same shared list)
// export async function getAllPhonesOwnerView(req: AuthRequest, res: Response) {
//   const phones = await Phone.find({ status: "available", ...searchFilter(req.query.q) })
//     .populate("owner", "name")
//     .sort({ createdAt: -1 });
//   res.json({ phones });
// }

// export async function getSoldPhones(req: AuthRequest, res: Response) {
//   const filter = req.user!.role === "owner" ? { owner: req.user!.id, status: "sold" } : { status: "sold" };
//   const phones = await Phone.find({ ...filter, ...searchFilter(req.query.q) })
//     .populate("owner", "name")
//     .sort({ soldAt: -1 });
//   // Shop role never sees the owner's internal cost breakdown.
//   res.json({ phones: req.user!.role === "shop" ? phones.map(toShopView) : phones });
// }

// export async function getIssuePhones(req: AuthRequest, res: Response) {
//   const filter = req.user!.role === "owner" ? { owner: req.user!.id, status: "issue" } : { status: "issue" };
//   const phones = await Phone.find(filter).populate("owner", "name").sort({ updatedAt: -1 });
//   res.json({ phones: req.user!.role === "shop" ? phones.map(toShopView) : phones });
// }

// // Owner: "Total Phone" — every phone this owner has ever added, any status.
// export async function getMyPhones(req: AuthRequest, res: Response) {
//   const phones = await Phone.find({ owner: req.user!.id, ...searchFilter(req.query.q) })
//     .populate("owner", "name")
//     .sort({ createdAt: -1 });
//   res.json({ phones });
// }

// // Owner: click-through detail for "Total Mobile Adding Average" -- how many phones were
// // added on each date, plus the weekly/monthly average across the owner's whole history.
// export async function getAddingAverageBreakdown(req: AuthRequest, res: Response) {
//   const phones = await Phone.find({ owner: req.user!.id }).sort({ createdAt: 1 });

//   const now = new Date();
//   let weeklyAddingAverage = 0;
//   let monthlyAddingAverage = 0;
//   let firstAddedAt: Date | null = null;

//   if (phones.length > 0) {
//     firstAddedAt = phones[0].createdAt;
//     const daysSpan = Math.max(1, (now.getTime() - firstAddedAt.getTime()) / (1000 * 60 * 60 * 24));
//     const weeksSpan = Math.max(1, daysSpan / 7);
//     const monthsSpan = Math.max(1, daysSpan / 30.44);
//     weeklyAddingAverage = phones.length / weeksSpan;
//     monthlyAddingAverage = phones.length / monthsSpan;
//   }

//   // Group by calendar date (YYYY-MM-DD), most recent first.
//   const byDate = new Map<string, number>();
//   for (const p of phones) {
//     const key = p.createdAt.toISOString().slice(0, 10);
//     byDate.set(key, (byDate.get(key) || 0) + 1);
//   }
//   const daily = Array.from(byDate.entries())
//     .map(([date, count]) => ({ date, count }))
//     .sort((a, b) => (a.date < b.date ? 1 : -1));

//   res.json({
//     totalPhones: phones.length,
//     firstAddedAt,
//     weeklyAddingAverage,
//     monthlyAddingAverage,
//     daily,
//   });
// }

// // Owner: click-through detail list for "This Week Buying Phone" / "This Month Buying Phone"
// export async function getPhonesBoughtInRange(req: AuthRequest, res: Response) {
//   const { period } = req.params; // "week" | "month"
//   const now = new Date();
//   const start = period === "month" ? startOfMonth(now) : startOfWeek(now);

//   const phones = await Phone.find({
//     owner: req.user!.id,
//     createdAt: { $gte: start },
//     ...searchFilter(req.query.q),
//   })
//     .populate("owner", "name")
//     .sort({ createdAt: -1 });

//   res.json({ phones, since: start });
// }

// // Owner: single phone by id (used to prefill the Edit Phone form)
// export async function getPhoneById(req: AuthRequest, res: Response) {
//   const phone = await Phone.findById(req.params.id).populate("owner", "name");
//   if (!phone) return res.status(404).json({ message: "Phone not found" });
//   res.json({ phone });
// }

// // Owner: click-through detail for "Total Service Cost"
// export async function getServiceCostBreakdown(req: AuthRequest, res: Response) {
//   const phones = await Phone.find({
//     owner: req.user!.id,
//     $and: [{ $or: [{ serviceCost: { $gt: 0 } }, { issueFixCost: { $gt: 0 } }] }, searchFilter(req.query.q)],
//   })
//     .populate("owner", "name")
//     .sort({ serviceCost: -1 });

//   const total = phones.reduce((s, p) => s + p.serviceCost + p.issueFixCost, 0);
//   res.json({ phones, total });
// }

// // Owner: toggle hide/unhide so Zahed can't see it on shop page. Only the owner who added
// // the phone can hide/unhide it -- Ovi and Sujait must not be able to toggle each other's
// // phones, same rule as edit/delete.
// export async function toggleHidden(req: AuthRequest, res: Response) {
//   const phone = await Phone.findById(req.params.id);
//   if (!phone) return res.status(404).json({ message: "Phone not found" });
//   if (String(phone.owner) !== req.user!.id) {
//     return res.status(403).json({ message: "You can only hide/unhide phones you added yourself" });
//   }
//   phone.hidden = !phone.hidden;
//   await phone.save();
//   broadcastChange("phones");
//   res.json({ phone });
// }

// export async function updatePhone(req: AuthRequest, res: Response) {
//   const phone = await Phone.findById(req.params.id);
//   if (!phone) return res.status(404).json({ message: "Phone not found" });
//   // One owner can see the other owner's phones on "All Phone", but must not be able to
//   // edit them -- only the person who added the phone can edit it.
//   if (String(phone.owner) !== req.user!.id) {
//     return res.status(403).json({ message: "You can only edit phones you added yourself" });
//   }

//   const numericFields = ["buyingPrice", "transportCost", "serviceCost", "personalProfit"] as const;
//   const textFields = ["name", "ram", "storage", "imei", "details", "sellExpectation"] as const;
//   const sellerTextFields = ["sellerName", "sellerPhoneNumber", "sellerNidNumber", "sellerSocialMediaLink", "sellerNote"] as const;
//   const sellerFieldMap: Record<(typeof sellerTextFields)[number], keyof IPhone["seller"]> = {
//     sellerName: "name",
//     sellerPhoneNumber: "phoneNumber",
//     sellerNidNumber: "nidNumber",
//     sellerSocialMediaLink: "socialMediaLink",
//     sellerNote: "note",
//   };

//   for (const field of numericFields) {
//     if (req.body[field] !== undefined) (phone as any)[field] = Number(req.body[field]);
//   }
//   for (const field of textFields) {
//     if (req.body[field] !== undefined) (phone as any)[field] = req.body[field];
//   }
//   for (const field of sellerTextFields) {
//     if (req.body[field] !== undefined) {
//       (phone.seller as any)[sellerFieldMap[field]] = req.body[field];
//     }
//   }

//   const files = (req.files as { [field: string]: Express.Multer.File[] }) || {};
//   if (files["nidImage"]?.[0]) {
//     phone.seller.nidImageUrl = (files["nidImage"][0] as any).path;
//   }
//   const newImages = (files["images"] || []).map((f) => (f as any).path);

//   // existingImages (optional, JSON string array) lets the edit form say which previously
//   // uploaded photos to keep; anything newly uploaded is appended on top of that.
//   if (req.body.existingImages !== undefined) {
//     try {
//       const kept = JSON.parse(req.body.existingImages);
//       phone.images = Array.isArray(kept) ? kept : phone.images;
//     } catch {
//       /* ignore malformed input, keep existing images as-is */
//     }
//   }
//   if (newImages.length > 0) {
//     phone.images = [...phone.images, ...newImages];
//   }

//   await phone.save();
//   broadcastChange("phones");
//   res.json({ phone });
// }

// // Owner: delete a phone. If it was still unsold, its value simply stops counting toward
// // Total Unsold Phone / Remaining Balance deductions — no separate refund bookkeeping is
// // needed since Remaining Balance is derived live from what's still in stock.
// export async function deletePhone(req: AuthRequest, res: Response) {
//   const phone = await Phone.findById(req.params.id);
//   if (!phone) return res.status(404).json({ message: "Phone not found" });
//   // Same rule as edit: only the phone's own adder can delete it.
//   if (String(phone.owner) !== req.user!.id) {
//     return res.status(403).json({ message: "You can only delete phones you added yourself" });
//   }
//   await phone.deleteOne();
//   broadcastChange("phones");
//   res.json({ message: "Deleted" });
// }

// // Owner: Issue page action — write off a loss. Comes out of available profit first, any
// // remainder comes out of the investment pool. Phone leaves the active issue list.
// export async function reportLoss(req: AuthRequest, res: Response) {
//   const { amount, note } = req.body;
//   const amt = Number(amount);
//   if (!amt || amt <= 0) return res.status(400).json({ message: "amount is required" });

//   const phone = await Phone.findById(req.params.id);
//   if (!phone) return res.status(404).json({ message: "Phone not found" });
//   if (String(phone.owner) !== req.user!.id) return res.status(403).json({ message: "Not your phone" });

//   const { availableProfit } = await getProfitAndInvestmentSummary(req.user!.id);
//   const profitPortion = Math.min(amt, availableProfit);
//   const investmentPortion = amt - profitPortion;

//   await LedgerEntry.create({
//     owner: req.user!.id,
//     type: "loss",
//     amount: amt,
//     note,
//     phone: phone._id,
//     profitPortion,
//     investmentPortion,
//     recordedBy: req.user!.id,
//   });

//   phone.status = "loss";
//   phone.lossHistory.push({ amount: amt, note, createdAt: new Date() });
//   await phone.save();

//   broadcastChange("phones");
//   broadcastChange("ledger");
//   res.json({ phone });
// }

// // Owner: Issue page action — pay to repair the phone. Always comes out of the investment
// // pool, and is added to the phone's own cost basis (raises its final buying/handover price).
// export async function issueFix(req: AuthRequest, res: Response) {
//   const { repairCost, note } = req.body;
//   const cost = Number(repairCost);
//   if (!cost || cost <= 0) return res.status(400).json({ message: "repairCost is required" });

//   const phone = await Phone.findById(req.params.id);
//   if (!phone) return res.status(404).json({ message: "Phone not found" });
//   if (String(phone.owner) !== req.user!.id) return res.status(403).json({ message: "Not your phone" });

//   await LedgerEntry.create({
//     owner: req.user!.id,
//     type: "repair",
//     amount: cost,
//     note,
//     phone: phone._id,
//     profitPortion: 0,
//     investmentPortion: cost,
//     recordedBy: req.user!.id,
//   });

//   phone.issueFixCost += cost;
//   phone.issueFixHistory.push({ amount: cost, note, createdAt: new Date() });
//   phone.status = "available";
//   phone.issueDescription = undefined;
//   await phone.save();

//   broadcastChange("phones");
//   broadcastChange("ledger");
//   res.json({ phone });
// }

// // Long Time Unsold Phone -- available for 10+ days since it was added. Owner sees only
// // their own; Shop sees across both owners (hidden phones excluded, same as Unsold Phone).
// export async function getLongTimeUnsoldPhones(req: AuthRequest, res: Response) {
//   const isShop = req.user!.role === "shop";
//   const filter: Record<string, unknown> = { status: "available" };
//   if (isShop) filter.hidden = false;
//   else filter.owner = req.user!.id;

//   const now = new Date();
//   const cutoff = new Date(now.getTime() - LONG_TIME_UNSOLD_DAYS * 24 * 60 * 60 * 1000);

//   const phones = await Phone.find({ ...filter, createdAt: { $lte: cutoff } })
//     .populate("owner", "name")
//     .sort({ createdAt: 1 }); // oldest (worst offenders) first

//   const withAge = phones.map((p) => ({ phone: p, days: daysUnsold(p, now) }));
//   const quantity = withAge.length;
//   const averageDaysUnsold = quantity
//     ? Math.round((withAge.reduce((s, x) => s + x.days, 0) / quantity) * 10) / 10
//     : 0;

//   // Simple bucket breakdown (10-19 / 20-29 / 30+ days etc.) — good material for a bar chart.
//   const buckets = new Map<string, number>();
//   for (const { days } of withAge) {
//     const bucketStart = Math.floor(days / 10) * 10;
//     const label = `${bucketStart}-${bucketStart + 9}d`;
//     buckets.set(label, (buckets.get(label) || 0) + 1);
//   }

//   res.json({
//     thresholdDays: LONG_TIME_UNSOLD_DAYS,
//     quantity,
//     averageDaysUnsold,
//     buckets: Array.from(buckets.entries())
//       .map(([label, count]) => ({ label, count }))
//       .sort((a, b) => parseInt(a.label) - parseInt(b.label)),
//     phones: phones.map((p, i) => {
//       const base = isShop ? toShopView(p) : (p.toJSON() as any);
//       return { ...base, daysUnsold: withAge[i].days };
//     }),
//   });
// }

// // ---- Shop (Zahed) side ----

// // Only non-hidden, available phones. Owner's internal cost breakdown is stripped.
// export async function getShopUnsoldPhones(req: AuthRequest, res: Response) {
//   const phones = await Phone.find({
//     status: "available",
//     hidden: false,
//     ...searchFilter(req.query.q),
//   })
//     .populate("owner", "name")
//     .sort({ createdAt: -1 });
//   res.json({ phones: phones.map(toShopView) });
// }

// // Shop: click-through detail for Day/Week/Month/Year Sale + Sold Phone page. Searchable.
// export async function getShopSoldPhonesInRange(req: AuthRequest, res: Response) {
//   const { period } = req.params; // "day" | "week" | "month" | "year" | "all"
//   const now = new Date();
//   let start: Date | null = null;
//   if (period === "day") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//   else if (period === "week") start = startOfWeek(now);
//   else if (period === "month") start = startOfMonth(now);
//   else if (period === "year") start = startOfYear(now);

//   const phones = await Phone.find({
//     status: "sold",
//     ...(start ? { soldAt: { $gte: start } } : {}),
//     ...searchFilter(req.query.q),
//   })
//     .populate("owner", "name")
//     .sort({ soldAt: -1 });

//   res.json({ phones: phones.map(toShopView) });
// }

// export async function markSold(req: AuthRequest, res: Response) {
//   const { soldPrice } = req.body;
//   if (!soldPrice) return res.status(400).json({ message: "soldPrice is required" });

//   const phone = await Phone.findById(req.params.id);
//   if (!phone) return res.status(404).json({ message: "Phone not found" });

//   phone.status = "sold";
//   phone.soldPrice = Number(soldPrice);
//   phone.soldAt = new Date();
//   await phone.save();

//   // Sold for less than the shop handover price -> automatically record it as a loss for
//   // the owner (comes out of available profit first, then the investment pool -- same rule
//   // as an Issue-page write-off). Shows up in "Total Loss" and its breakdown immediately.
//   const shortfall = saleShortfall(phone);
//   if (shortfall > 0) {
//     const { availableProfit } = await getProfitAndInvestmentSummary(String(phone.owner));
//     const profitPortion = Math.min(shortfall, availableProfit);
//     const investmentPortion = shortfall - profitPortion;
//     await LedgerEntry.create({
//       owner: phone.owner,
//       type: "loss",
//       amount: shortfall,
//       note: SALE_LOSS_NOTE,
//       phone: phone._id,
//       profitPortion,
//       investmentPortion,
//       recordedBy: req.user!.id,
//     });
//     broadcastChange("ledger");
//   }

//   broadcastChange("phones");
//   res.json({ phone });
// }

// export async function cancelSold(req: AuthRequest, res: Response) {
//   const phone = await Phone.findById(req.params.id);
//   if (!phone) return res.status(404).json({ message: "Phone not found" });

//   phone.status = "available";
//   phone.soldPrice = undefined;
//   phone.soldAt = undefined;
//   await phone.save();

//   // Undo any auto-recorded "sold below handover price" loss tied to this sale, so
//   // canceling a mis-click doesn't leave a phantom loss on the owner's books.
//   const removed = await LedgerEntry.deleteMany({ phone: phone._id, type: "loss", note: SALE_LOSS_NOTE });
//   if (removed.deletedCount) broadcastChange("ledger");

//   broadcastChange("phones");
//   res.json({ phone });
// }

// export async function reportIssue(req: AuthRequest, res: Response) {
//   const { description } = req.body;
//   if (!description) return res.status(400).json({ message: "description is required" });

//   const phone = await Phone.findById(req.params.id);
//   if (!phone) return res.status(404).json({ message: "Phone not found" });

//   phone.status = "issue";
//   phone.issueDescription = description;
//   phone.issueHistory.push({ description, createdAt: new Date() });
//   await phone.save();

//   broadcastChange("phones");
//   res.json({ phone });
// }

// export async function searchByImei(req: AuthRequest, res: Response) {
//   const { imei } = req.query;
//   if (!imei) return res.status(400).json({ message: "imei query param required" });

//   const phone = await Phone.findOne({ imei: String(imei).trim() }).populate("owner", "name");
//   if (!phone) return res.status(404).json({ message: "No phone found with this IMEI" });

//   res.json({ phone: req.user!.role === "shop" ? toShopView(phone) : phone });
// }



// new update 8/18/26
import { Response } from "express";
import Phone, { IPhone } from "../models/Phone";
import LedgerEntry from "../models/LedgerEntry";
import { AuthRequest } from "../middleware/auth";
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  toShopView,
  getProfitAndInvestmentSummary,
  daysUnsold,
  LONG_TIME_UNSOLD_DAYS,
  saleShortfall,
} from "../utils/calc";
import { broadcastChange } from "../realtime";

// Auto-generated "loss" ledger notes are tagged so we can find/undo them cleanly (e.g. if
// the shop mis-clicked "Sold" and cancels it, or edits the sold price).
const SALE_LOSS_NOTE = "Sold below shop handover price";

// Case-insensitive search filter matching against IMEI, name, or details
function searchFilter(q: unknown) {
  if (!q || typeof q !== "string" || !q.trim()) return {};
  const rx = new RegExp(q.trim(), "i");
  return { $or: [{ imei: rx }, { name: rx }, { details: rx }] };
}

// Every customer field on a sale is optional. This trims whitespace, drops anything blank,
// and only keeps the payment-method-specific fields (bank name/number, bKash number) that
// actually match the chosen payment method -- so a stray value typed and then abandoned in
// the wrong field never gets saved.
function sanitizeCustomer(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  const paymentMethodRaw = clean(raw.paymentMethod);
  const paymentMethod =
    paymentMethodRaw === "cash" || paymentMethodRaw === "bank" || paymentMethodRaw === "bkash"
      ? paymentMethodRaw
      : undefined;

  const customer: Record<string, string> = {};
  const name = clean(raw.name);
  const phoneNumber = clean(raw.phoneNumber);
  const email = clean(raw.email);
  const address = clean(raw.address);
  if (name) customer.name = name;
  if (phoneNumber) customer.phoneNumber = phoneNumber;
  if (email) customer.email = email;
  if (address) customer.address = address;
  if (paymentMethod) {
    customer.paymentMethod = paymentMethod;
    if (paymentMethod === "bank") {
      const bankName = clean(raw.bankName);
      const bankNumber = clean(raw.bankNumber);
      if (bankName) customer.bankName = bankName;
      if (bankNumber) customer.bankNumber = bankNumber;
    } else if (paymentMethod === "bkash") {
      const bkashNumber = clean(raw.bkashNumber);
      if (bkashNumber) customer.bkashNumber = bkashNumber;
    }
  }

  return Object.keys(customer).length > 0 ? customer : undefined;
}

// Idempotency guard for "Add Phone": if the exact same owner submits the exact same set of
// IMEIs again within this window, we treat it as a duplicate submit (double-tap, a client
// retry after a slow/dropped response, etc.) and return the phones that were already
// created instead of creating a second, "cloned" copy.
const RECENT_ADD_WINDOW_MS = 20_000;
const recentAddSubmissions = new Map<string, { at: number; phones: any[] }>();
function recentAddKey(ownerId: string, imeis: string[]) {
  return `${ownerId}::${[...imeis].sort().join(",")}`;
}
function pruneRecentAddSubmissions() {
  const cutoff = Date.now() - RECENT_ADD_WINDOW_MS;
  for (const [key, entry] of recentAddSubmissions) {
    if (entry.at < cutoff) recentAddSubmissions.delete(key);
  }
}

// Owner: add a new phone. If more than one IMEI is submitted, one Phone document is
// created per IMEI (all sharing the same name/specs/costs/seller info) — e.g. buying two
// identical units in one trip still gets tracked as two separate stock items.
export async function addPhone(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      ram,
      storage,
      sellerName,
      sellerPhoneNumber,
      sellerNidNumber,
      sellerSocialMediaLink,
      sellerNote,
      buyingPrice,
      transportCost,
      serviceCost,
      personalProfit,
      details,
      sellExpectation,
    } = req.body;

    // imeis can arrive under a few different keys/shapes depending on how the form posted:
    // repeated "imeis" fields (multer turns those into a real array), the bracketed
    // "imeis[]" convention, a single JSON-encoded string, or a lone "imei". Checking only
    // "imeis" and missing "imeis[]" (or vice versa) is exactly how a 2nd/3rd IMEI can
    // silently disappear on submit, so every shape is normalized here.
    const rawImeis = req.body.imeis ?? req.body["imeis[]"] ?? req.body.imei;
    let imeis: string[] = [];
    if (Array.isArray(rawImeis)) {
      imeis = rawImeis;
    } else if (typeof rawImeis === "string") {
      try {
        const parsed = JSON.parse(rawImeis);
        imeis = Array.isArray(parsed) ? parsed : [rawImeis];
      } catch {
        imeis = [rawImeis];
      }
    }
    // Belt-and-braces: also fold in anything that arrived under the other key, in case the
    // client sent a mix (shouldn't normally happen, but avoids silently dropping an IMEI).
    for (const altKey of ["imeis[]", "imeis"]) {
      const alt = (req.body as any)[altKey];
      if (alt === rawImeis) continue;
      if (Array.isArray(alt)) imeis.push(...alt);
      else if (typeof alt === "string") imeis.push(alt);
    }
    imeis = imeis.map((i) => String(i).trim()).filter(Boolean);
    // De-duplicate defensively so a double-submitted form field never creates two
    // identical stock entries for the same physical phone.
    imeis = Array.from(new Set(imeis));

    if (!name || !buyingPrice || imeis.length === 0 || !sellExpectation) {
      return res
        .status(400)
        .json({ message: "name, buyingPrice, at least one imei, and sellExpectation are required" });
    }

    const ownerId = req.user!.id;

    // Same owner, same exact IMEI set, submitted again within the last few seconds --
    // almost certainly a double submit rather than a genuine second purchase. Return what
    // was already created instead of creating a duplicate/"cloned" entry.
    pruneRecentAddSubmissions();
    const dedupeKey = recentAddKey(ownerId, imeis);
    const recent = recentAddSubmissions.get(dedupeKey);
    if (recent) {
      return res.status(201).json({ phones: recent.phones, deduped: true });
    }

    // Guard against a genuine race (this same request arriving twice almost
    // simultaneously, e.g. a real double-tap before the first response even lands):
    // reserve the key up front so a second concurrent request sees it immediately.
    recentAddSubmissions.set(dedupeKey, { at: Date.now(), phones: [] });

    // Refuse up front if any of these IMEIs already exist anywhere in the system, rather
    // than creating some of the batch and only failing on the duplicate one -- that
    // "partial success" is exactly what used to leave one IMEI saved and the other
    // silently missing (and prompted a retry that looked like a duplicate add).
    const existing = await Phone.find({ imei: { $in: imeis } }).select("imei");
    if (existing.length > 0) {
      recentAddSubmissions.delete(dedupeKey);
      return res.status(400).json({
        message: `This IMEI is already in the system: ${existing.map((p) => p.imei).join(", ")}`,
      });
    }

    const files = (req.files as { [field: string]: Express.Multer.File[] }) || {};
    const images = (files["images"] || []).map((f) => (f as any).path);
    const nidImageUrl = files["nidImage"]?.[0] ? (files["nidImage"][0] as any).path : undefined;

    const shared = {
      owner: ownerId,
      name,
      ram,
      storage,
      seller: {
        name: sellerName,
        phoneNumber: sellerPhoneNumber,
        nidNumber: sellerNidNumber,
        nidImageUrl,
        socialMediaLink: sellerSocialMediaLink,
        note: sellerNote,
      },
      buyingPrice: Number(buyingPrice),
      transportCost: Number(transportCost) || 0,
      serviceCost: Number(serviceCost) || 0,
      personalProfit: Number(personalProfit) || 0,
      details: details || "",
      sellExpectation: String(sellExpectation),
      images,
    };

    let phones;
    try {
      phones = await Phone.insertMany(
        imeis.map((imei) => ({ ...shared, imei })),
        { ordered: true }
      );
    } catch (createErr) {
      // If a couple of docs made it in before a failure (e.g. a genuine last-instant race
      // on a duplicate IMEI), clean up whatever partially landed so it doesn't linger as an
      // orphaned/"cloned" entry.
      await Phone.deleteMany({ imei: { $in: imeis }, owner: ownerId, createdAt: { $gte: new Date(Date.now() - 5000) } });
      recentAddSubmissions.delete(dedupeKey);
      throw createErr;
    }

    recentAddSubmissions.set(dedupeKey, { at: Date.now(), phones });
    broadcastChange("phones");
    res.status(201).json({ phones });
  } catch (err) {
    res.status(500).json({ message: "Failed to add phone", error: (err as Error).message });
  }
}

// Owner: all phones (both Sujait & Avi see the same shared list)
export async function getAllPhonesOwnerView(req: AuthRequest, res: Response) {
  const phones = await Phone.find({ status: "available", ...searchFilter(req.query.q) })
    .populate("owner", "name")
    .sort({ createdAt: -1 });
  res.json({ phones });
}

export async function getSoldPhones(req: AuthRequest, res: Response) {
  const filter = req.user!.role === "owner" ? { owner: req.user!.id, status: "sold" } : { status: "sold" };
  const phones = await Phone.find({ ...filter, ...searchFilter(req.query.q) })
    .populate("owner", "name")
    .sort({ soldAt: -1 });
  // Shop role never sees the owner's internal cost breakdown.
  res.json({ phones: req.user!.role === "shop" ? phones.map(toShopView) : phones });
}

export async function getIssuePhones(req: AuthRequest, res: Response) {
  const filter = req.user!.role === "owner" ? { owner: req.user!.id, status: "issue" } : { status: "issue" };
  const phones = await Phone.find(filter).populate("owner", "name").sort({ updatedAt: -1 });
  res.json({ phones: req.user!.role === "shop" ? phones.map(toShopView) : phones });
}

// Owner: "Total Phone" — every phone this owner has ever added, any status.
export async function getMyPhones(req: AuthRequest, res: Response) {
  const phones = await Phone.find({ owner: req.user!.id, ...searchFilter(req.query.q) })
    .populate("owner", "name")
    .sort({ createdAt: -1 });
  res.json({ phones });
}

// Owner: click-through detail for "Total Mobile Adding Average" -- how many phones were
// added on each date, plus the weekly/monthly average across the owner's whole history.
export async function getAddingAverageBreakdown(req: AuthRequest, res: Response) {
  const phones = await Phone.find({ owner: req.user!.id }).sort({ createdAt: 1 });

  const now = new Date();
  let weeklyAddingAverage = 0;
  let monthlyAddingAverage = 0;
  let firstAddedAt: Date | null = null;

  if (phones.length > 0) {
    firstAddedAt = phones[0].createdAt;
    const daysSpan = Math.max(1, (now.getTime() - firstAddedAt.getTime()) / (1000 * 60 * 60 * 24));
    const weeksSpan = Math.max(1, daysSpan / 7);
    const monthsSpan = Math.max(1, daysSpan / 30.44);
    weeklyAddingAverage = phones.length / weeksSpan;
    monthlyAddingAverage = phones.length / monthsSpan;
  }

  // Group by calendar date (YYYY-MM-DD), most recent first.
  const byDate = new Map<string, number>();
  for (const p of phones) {
    const key = p.createdAt.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) || 0) + 1);
  }
  const daily = Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  res.json({
    totalPhones: phones.length,
    firstAddedAt,
    weeklyAddingAverage,
    monthlyAddingAverage,
    daily,
  });
}

// Owner: click-through detail list for "This Week Buying Phone" / "This Month Buying Phone"
export async function getPhonesBoughtInRange(req: AuthRequest, res: Response) {
  const { period } = req.params; // "week" | "month"
  const now = new Date();
  const start = period === "month" ? startOfMonth(now) : startOfWeek(now);

  const phones = await Phone.find({
    owner: req.user!.id,
    createdAt: { $gte: start },
    ...searchFilter(req.query.q),
  })
    .populate("owner", "name")
    .sort({ createdAt: -1 });

  res.json({ phones, since: start });
}

// Owner: single phone by id (used to prefill the Edit Phone form)
export async function getPhoneById(req: AuthRequest, res: Response) {
  const phone = await Phone.findById(req.params.id).populate("owner", "name");
  if (!phone) return res.status(404).json({ message: "Phone not found" });
  res.json({ phone });
}

// Owner: click-through detail for "Total Service Cost"
export async function getServiceCostBreakdown(req: AuthRequest, res: Response) {
  const phones = await Phone.find({
    owner: req.user!.id,
    $and: [{ $or: [{ serviceCost: { $gt: 0 } }, { issueFixCost: { $gt: 0 } }] }, searchFilter(req.query.q)],
  })
    .populate("owner", "name")
    .sort({ serviceCost: -1 });

  const total = phones.reduce((s, p) => s + p.serviceCost + p.issueFixCost, 0);
  res.json({ phones, total });
}

// Owner: toggle hide/unhide so Zahed can't see it on shop page. Only the owner who added
// the phone can hide/unhide it -- Ovi and Sujait must not be able to toggle each other's
// phones, same rule as edit/delete.
export async function toggleHidden(req: AuthRequest, res: Response) {
  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });
  if (String(phone.owner) !== req.user!.id) {
    return res.status(403).json({ message: "You can only hide/unhide phones you added yourself" });
  }
  phone.hidden = !phone.hidden;
  await phone.save();
  broadcastChange("phones");
  res.json({ phone });
}

export async function updatePhone(req: AuthRequest, res: Response) {
  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });
  // One owner can see the other owner's phones on "All Phone", but must not be able to
  // edit them -- only the person who added the phone can edit it.
  if (String(phone.owner) !== req.user!.id) {
    return res.status(403).json({ message: "You can only edit phones you added yourself" });
  }

  const numericFields = ["buyingPrice", "transportCost", "serviceCost", "personalProfit"] as const;
  const textFields = ["name", "ram", "storage", "imei", "details", "sellExpectation"] as const;
  const sellerTextFields = ["sellerName", "sellerPhoneNumber", "sellerNidNumber", "sellerSocialMediaLink", "sellerNote"] as const;
  const sellerFieldMap: Record<(typeof sellerTextFields)[number], keyof IPhone["seller"]> = {
    sellerName: "name",
    sellerPhoneNumber: "phoneNumber",
    sellerNidNumber: "nidNumber",
    sellerSocialMediaLink: "socialMediaLink",
    sellerNote: "note",
  };

  for (const field of numericFields) {
    if (req.body[field] !== undefined) (phone as any)[field] = Number(req.body[field]);
  }
  for (const field of textFields) {
    if (req.body[field] !== undefined) (phone as any)[field] = req.body[field];
  }
  for (const field of sellerTextFields) {
    if (req.body[field] !== undefined) {
      (phone.seller as any)[sellerFieldMap[field]] = req.body[field];
    }
  }

  const files = (req.files as { [field: string]: Express.Multer.File[] }) || {};
  if (files["nidImage"]?.[0]) {
    phone.seller.nidImageUrl = (files["nidImage"][0] as any).path;
  }
  const newImages = (files["images"] || []).map((f) => (f as any).path);

  // existingImages (optional, JSON string array) lets the edit form say which previously
  // uploaded photos to keep; anything newly uploaded is appended on top of that.
  if (req.body.existingImages !== undefined) {
    try {
      const kept = JSON.parse(req.body.existingImages);
      phone.images = Array.isArray(kept) ? kept : phone.images;
    } catch {
      /* ignore malformed input, keep existing images as-is */
    }
  }
  if (newImages.length > 0) {
    phone.images = [...phone.images, ...newImages];
  }

  await phone.save();
  broadcastChange("phones");
  res.json({ phone });
}

// Owner: delete a phone. If it was still unsold, its value simply stops counting toward
// Total Unsold Phone / Remaining Balance deductions — no separate refund bookkeeping is
// needed since Remaining Balance is derived live from what's still in stock.
export async function deletePhone(req: AuthRequest, res: Response) {
  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });
  // Same rule as edit: only the phone's own adder can delete it.
  if (String(phone.owner) !== req.user!.id) {
    return res.status(403).json({ message: "You can only delete phones you added yourself" });
  }
  await phone.deleteOne();
  broadcastChange("phones");
  res.json({ message: "Deleted" });
}

// Owner: Issue page action — write off a loss. Comes out of available profit first, any
// remainder comes out of the investment pool. Phone leaves the active issue list.
export async function reportLoss(req: AuthRequest, res: Response) {
  const { amount, note } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ message: "amount is required" });

  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });
  if (String(phone.owner) !== req.user!.id) return res.status(403).json({ message: "Not your phone" });

  const { availableProfit } = await getProfitAndInvestmentSummary(req.user!.id);
  const profitPortion = Math.min(amt, availableProfit);
  const investmentPortion = amt - profitPortion;

  await LedgerEntry.create({
    owner: req.user!.id,
    type: "loss",
    amount: amt,
    note,
    phone: phone._id,
    profitPortion,
    investmentPortion,
    recordedBy: req.user!.id,
  });

  phone.status = "loss";
  phone.lossHistory.push({ amount: amt, note, createdAt: new Date() });
  await phone.save();

  broadcastChange("phones");
  broadcastChange("ledger");
  res.json({ phone });
}

// Owner: Issue page action — pay to repair the phone. Always comes out of the investment
// pool, and is added to the phone's own cost basis (raises its final buying/handover price).
export async function issueFix(req: AuthRequest, res: Response) {
  const { repairCost, note } = req.body;
  const cost = Number(repairCost);
  if (!cost || cost <= 0) return res.status(400).json({ message: "repairCost is required" });

  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });
  if (String(phone.owner) !== req.user!.id) return res.status(403).json({ message: "Not your phone" });

  await LedgerEntry.create({
    owner: req.user!.id,
    type: "repair",
    amount: cost,
    note,
    phone: phone._id,
    profitPortion: 0,
    investmentPortion: cost,
    recordedBy: req.user!.id,
  });

  phone.issueFixCost += cost;
  phone.issueFixHistory.push({ amount: cost, note, createdAt: new Date() });
  phone.status = "available";
  phone.issueDescription = undefined;
  await phone.save();

  broadcastChange("phones");
  broadcastChange("ledger");
  res.json({ phone });
}

// Long Time Unsold Phone -- available for 10+ days since it was added. Owner sees only
// their own; Shop sees across both owners (hidden phones excluded, same as Unsold Phone).
export async function getLongTimeUnsoldPhones(req: AuthRequest, res: Response) {
  const isShop = req.user!.role === "shop";
  const filter: Record<string, unknown> = { status: "available" };
  if (isShop) filter.hidden = false;
  else filter.owner = req.user!.id;

  const now = new Date();
  const cutoff = new Date(now.getTime() - LONG_TIME_UNSOLD_DAYS * 24 * 60 * 60 * 1000);

  const phones = await Phone.find({ ...filter, createdAt: { $lte: cutoff } })
    .populate("owner", "name")
    .sort({ createdAt: 1 }); // oldest (worst offenders) first

  const withAge = phones.map((p) => ({ phone: p, days: daysUnsold(p, now) }));
  const quantity = withAge.length;
  const averageDaysUnsold = quantity
    ? Math.round((withAge.reduce((s, x) => s + x.days, 0) / quantity) * 10) / 10
    : 0;

  // Simple bucket breakdown (10-19 / 20-29 / 30+ days etc.) — good material for a bar chart.
  const buckets = new Map<string, number>();
  for (const { days } of withAge) {
    const bucketStart = Math.floor(days / 10) * 10;
    const label = `${bucketStart}-${bucketStart + 9}d`;
    buckets.set(label, (buckets.get(label) || 0) + 1);
  }

  res.json({
    thresholdDays: LONG_TIME_UNSOLD_DAYS,
    quantity,
    averageDaysUnsold,
    buckets: Array.from(buckets.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => parseInt(a.label) - parseInt(b.label)),
    phones: phones.map((p, i) => {
      const base = isShop ? toShopView(p) : (p.toJSON() as any);
      return { ...base, daysUnsold: withAge[i].days };
    }),
  });
}

// ---- Shop (Zahed) side ----

// Only non-hidden, available phones. Owner's internal cost breakdown is stripped.
export async function getShopUnsoldPhones(req: AuthRequest, res: Response) {
  const phones = await Phone.find({
    status: "available",
    hidden: false,
    ...searchFilter(req.query.q),
  })
    .populate("owner", "name")
    .sort({ createdAt: -1 });
  res.json({ phones: phones.map(toShopView) });
}

// Shop: click-through detail for Day/Week/Month/Year Sale + Sold Phone page. Searchable.
export async function getShopSoldPhonesInRange(req: AuthRequest, res: Response) {
  const { period } = req.params; // "day" | "week" | "month" | "year" | "all"
  const now = new Date();
  let start: Date | null = null;
  if (period === "day") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (period === "week") start = startOfWeek(now);
  else if (period === "month") start = startOfMonth(now);
  else if (period === "year") start = startOfYear(now);

  const phones = await Phone.find({
    status: "sold",
    ...(start ? { soldAt: { $gte: start } } : {}),
    ...searchFilter(req.query.q),
  })
    .populate("owner", "name")
    .sort({ soldAt: -1 });

  res.json({ phones: phones.map(toShopView) });
}

export async function markSold(req: AuthRequest, res: Response) {
  // Customer details are entirely optional -- only soldPrice is required to mark a sale.
  const { soldPrice, customer } = req.body;
  if (!soldPrice) return res.status(400).json({ message: "soldPrice is required" });

  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });

  phone.status = "sold";
  phone.soldPrice = Number(soldPrice);
  phone.soldAt = new Date();
  const cleanCustomer = sanitizeCustomer(customer);
  if (cleanCustomer) phone.customer = cleanCustomer as any;
  await phone.save();

  // Sold for less than the shop handover price -> automatically record it as a loss for
  // the owner (comes out of available profit first, then the investment pool -- same rule
  // as an Issue-page write-off). Shows up in "Total Loss" and its breakdown immediately.
  const shortfall = saleShortfall(phone);
  if (shortfall > 0) {
    const { availableProfit } = await getProfitAndInvestmentSummary(String(phone.owner));
    const profitPortion = Math.min(shortfall, availableProfit);
    const investmentPortion = shortfall - profitPortion;
    await LedgerEntry.create({
      owner: phone.owner,
      type: "loss",
      amount: shortfall,
      note: SALE_LOSS_NOTE,
      phone: phone._id,
      profitPortion,
      investmentPortion,
      recordedBy: req.user!.id,
    });
    broadcastChange("ledger");
  }

  broadcastChange("phones");
  res.json({ phone });
}

// Shop: single sold (or any) phone, in the shop-safe shape -- used by the Invoice print page.
export async function getShopPhoneById(req: AuthRequest, res: Response) {
  const phone = await Phone.findById(req.params.id).populate("owner", "name");
  if (!phone) return res.status(404).json({ message: "Phone not found" });
  res.json({ phone: toShopView(phone) });
}

// Shop: "Invoice Edit" -- update/replace the customer details on an already-sold phone.
// Every field is optional; sending an empty value clears it (e.g. correcting a typo, or
// filling in details that weren't captured at sale time).
export async function updateSoldCustomer(req: AuthRequest, res: Response) {
  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });
  if (phone.status !== "sold") {
    return res.status(400).json({ message: "Only a sold phone's invoice can be edited" });
  }

  phone.customer = sanitizeCustomer(req.body.customer ?? req.body) as any;
  await phone.save();

  broadcastChange("phones");
  res.json({ phone: toShopView(phone) });
}

export async function cancelSold(req: AuthRequest, res: Response) {
  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });

  phone.status = "available";
  phone.soldPrice = undefined;
  phone.soldAt = undefined;
  phone.customer = undefined;
  await phone.save();

  // Undo any auto-recorded "sold below handover price" loss tied to this sale, so
  // canceling a mis-click doesn't leave a phantom loss on the owner's books.
  const removed = await LedgerEntry.deleteMany({ phone: phone._id, type: "loss", note: SALE_LOSS_NOTE });
  if (removed.deletedCount) broadcastChange("ledger");

  broadcastChange("phones");
  res.json({ phone });
}

export async function reportIssue(req: AuthRequest, res: Response) {
  const { description } = req.body;
  if (!description) return res.status(400).json({ message: "description is required" });

  const phone = await Phone.findById(req.params.id);
  if (!phone) return res.status(404).json({ message: "Phone not found" });

  phone.status = "issue";
  phone.issueDescription = description;
  phone.issueHistory.push({ description, createdAt: new Date() });
  await phone.save();

  broadcastChange("phones");
  res.json({ phone });
}

export async function searchByImei(req: AuthRequest, res: Response) {
  const { imei } = req.query;
  if (!imei) return res.status(400).json({ message: "imei query param required" });

  const phone = await Phone.findOne({ imei: String(imei).trim() }).populate("owner", "name");
  if (!phone) return res.status(404).json({ message: "No phone found with this IMEI" });

  res.json({ phone: req.user!.role === "shop" ? toShopView(phone) : phone });
}
