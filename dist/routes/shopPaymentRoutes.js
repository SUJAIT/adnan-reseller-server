"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const shopPaymentController_1 = require("../controllers/shopPaymentController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// Owner side
router.get("/mine", (0, auth_1.requireRole)("owner"), shopPaymentController_1.getMyUnpaid);
router.post("/mine", (0, auth_1.requireRole)("owner"), shopPaymentController_1.addPaymentAsOwner);
// Shop side
router.get("/by-owner", (0, auth_1.requireRole)("shop"), shopPaymentController_1.getUnpaidByOwners);
router.post("/by-owner", (0, auth_1.requireRole)("shop"), shopPaymentController_1.addPaymentAsShop);
// Shared history
router.get("/history", (0, auth_1.requireRole)("owner", "shop"), shopPaymentController_1.getPaymentHistory);
exports.default = router;
