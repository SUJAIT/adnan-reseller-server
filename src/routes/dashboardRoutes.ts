import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { getOwnerDashboard, getShopDashboard } from "../controllers/dashboardController";

const router = Router();

router.use(requireAuth);

router.get("/owner", requireRole("owner"), getOwnerDashboard);
router.get("/shop", requireRole("shop"), getShopDashboard);

export default router;
