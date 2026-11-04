import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { addExpense, getMyExpenses, getMyLedger, getProfitSummary } from "../controllers/ledgerController";

const router = Router();

router.use(requireAuth, requireRole("owner"));

router.post("/expense", addExpense);
router.get("/expenses", getMyExpenses); // "My Expenses" page
router.get("/", getMyLedger); // full history (expenses + losses + repairs)
router.get("/summary", getProfitSummary);

export default router;
