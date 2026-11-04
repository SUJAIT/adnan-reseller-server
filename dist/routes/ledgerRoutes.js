"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const ledgerController_1 = require("../controllers/ledgerController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, (0, auth_1.requireRole)("owner"));
router.post("/expense", ledgerController_1.addExpense);
router.get("/expenses", ledgerController_1.getMyExpenses); // "My Expenses" page
router.get("/", ledgerController_1.getMyLedger); // full history (expenses + losses + repairs)
router.get("/summary", ledgerController_1.getProfitSummary);
exports.default = router;
