import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { addInvestment, getMyInvestments, deleteInvestment } from "../controllers/investmentController";

const router = Router();

router.use(requireAuth, requireRole("owner"));

router.post("/", addInvestment);
router.get("/", getMyInvestments);
router.delete("/:id", deleteInvestment);

export default router;
