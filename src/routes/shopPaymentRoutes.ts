import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  getMyUnpaid,
  addPaymentAsOwner,
  getUnpaidByOwners,
  addPaymentAsShop,
  getPaymentHistory,
} from "../controllers/shopPaymentController";

const router = Router();

router.use(requireAuth);

// Owner side
router.get("/mine", requireRole("owner"), getMyUnpaid);
router.post("/mine", requireRole("owner"), addPaymentAsOwner);

// Shop side
router.get("/by-owner", requireRole("shop"), getUnpaidByOwners);
router.post("/by-owner", requireRole("shop"), addPaymentAsShop);

// Shared history
router.get("/history", requireRole("owner", "shop"), getPaymentHistory);

export default router;
