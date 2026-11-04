"use strict";
// import { Router } from "express";
// import { requireAuth, requireRole } from "../middleware/auth";
// import { upload } from "../config/cloudinary";
// import {
//   addPhone,
//   getAllPhonesOwnerView,
//   getSoldPhones,
//   getIssuePhones,
//   toggleHidden,
//   updatePhone,
//   deletePhone,
//   getShopUnsoldPhones,
//   markSold,
//   cancelSold,
//   reportIssue,
//   searchByImei,
//   getMyPhones,
//   getPhonesBoughtInRange,
//   getAddingAverageBreakdown,
//   getServiceCostBreakdown,
//   getShopSoldPhonesInRange,
//   reportLoss,
//   issueFix,
//   getPhoneById,
//   getLongTimeUnsoldPhones,
// } from "../controllers/phoneController";
Object.defineProperty(exports, "__esModule", { value: true });
// const router = Router();
// router.use(requireAuth);
// // Owner-only routes
// // "images" = up to 8 phone photos, "nidImage" = optional seller NID photo
// router.post(
//   "/",
//   requireRole("owner"),
//   upload.fields([
//     { name: "images", maxCount: 8 },
//     { name: "nidImage", maxCount: 1 },
//   ]),
//   addPhone
// );
// router.get("/all", requireRole("owner"), getAllPhonesOwnerView);
// router.get("/mine", requireRole("owner"), getMyPhones); // "Total Phone" route
// router.get("/buying/:period", requireRole("owner"), getPhonesBoughtInRange); // week | month
// router.get("/adding-average", requireRole("owner"), getAddingAverageBreakdown); // Total Mobile Adding Average detail table
// router.get("/service-cost", requireRole("owner"), getServiceCostBreakdown);
// router.get("/sold", requireRole("owner", "shop"), getSoldPhones);
// router.get("/issues", requireRole("owner", "shop"), getIssuePhones);
// router.get("/long-time-unsold", requireRole("owner", "shop"), getLongTimeUnsoldPhones); // Long Time Unsold Phone
// router.get("/:id", requireRole("owner"), getPhoneById); // must stay after the literal GET routes above
// router.patch("/:id/hide", requireRole("owner"), toggleHidden);
// router.patch(
//   "/:id",
//   requireRole("owner"),
//   upload.fields([
//     { name: "images", maxCount: 8 },
//     { name: "nidImage", maxCount: 1 },
//   ]),
//   updatePhone
// );
// router.delete("/:id", requireRole("owner"), deletePhone);
// router.post("/:id/loss", requireRole("owner"), reportLoss); // Issue page -> "Loss"
// router.post("/:id/issue-fix", requireRole("owner"), issueFix); // Issue page -> "Issue Fix"
// // Shop-only routes
// router.get("/shop/unsold", requireRole("shop"), getShopUnsoldPhones);
// router.get("/shop/sold/:period", requireRole("shop"), getShopSoldPhonesInRange); // week|month|year|all
// router.patch("/:id/sold", requireRole("shop"), markSold);
// router.patch("/:id/cancel-sold", requireRole("shop"), cancelSold);
// router.patch("/:id/issue", requireRole("shop"), reportIssue);
// router.get("/search/imei", requireRole("owner", "shop"), searchByImei);
// export default router;
//New Update :8/18/26
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const cloudinary_1 = require("../config/cloudinary");
const phoneController_1 = require("../controllers/phoneController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// Owner-only routes
// "images" = up to 8 phone photos, "nidImage" = optional seller NID photo
router.post("/", (0, auth_1.requireRole)("owner"), cloudinary_1.upload.fields([
    { name: "images", maxCount: 8 },
    { name: "nidImage", maxCount: 1 },
]), phoneController_1.addPhone);
router.get("/all", (0, auth_1.requireRole)("owner"), phoneController_1.getAllPhonesOwnerView);
router.get("/mine", (0, auth_1.requireRole)("owner"), phoneController_1.getMyPhones); // "Total Phone" route
router.get("/buying/:period", (0, auth_1.requireRole)("owner"), phoneController_1.getPhonesBoughtInRange); // week | month
router.get("/adding-average", (0, auth_1.requireRole)("owner"), phoneController_1.getAddingAverageBreakdown); // Total Mobile Adding Average detail table
router.get("/service-cost", (0, auth_1.requireRole)("owner"), phoneController_1.getServiceCostBreakdown);
router.get("/sold", (0, auth_1.requireRole)("owner", "shop"), phoneController_1.getSoldPhones);
router.get("/issues", (0, auth_1.requireRole)("owner", "shop"), phoneController_1.getIssuePhones);
router.get("/long-time-unsold", (0, auth_1.requireRole)("owner", "shop"), phoneController_1.getLongTimeUnsoldPhones); // Long Time Unsold Phone
router.get("/:id", (0, auth_1.requireRole)("owner"), phoneController_1.getPhoneById); // must stay after the literal GET routes above
router.patch("/:id/hide", (0, auth_1.requireRole)("owner"), phoneController_1.toggleHidden);
router.patch("/:id", (0, auth_1.requireRole)("owner"), cloudinary_1.upload.fields([
    { name: "images", maxCount: 8 },
    { name: "nidImage", maxCount: 1 },
]), phoneController_1.updatePhone);
router.delete("/:id", (0, auth_1.requireRole)("owner"), phoneController_1.deletePhone);
router.post("/:id/loss", (0, auth_1.requireRole)("owner"), phoneController_1.reportLoss); // Issue page -> "Loss"
router.post("/:id/issue-fix", (0, auth_1.requireRole)("owner"), phoneController_1.issueFix); // Issue page -> "Issue Fix"
// Shop-only routes
router.get("/shop/unsold", (0, auth_1.requireRole)("shop"), phoneController_1.getShopUnsoldPhones);
router.get("/shop/sold/:period", (0, auth_1.requireRole)("shop"), phoneController_1.getShopSoldPhonesInRange); // week|month|year|all
router.get("/shop/:id", (0, auth_1.requireRole)("shop"), phoneController_1.getShopPhoneById); // single phone (Invoice print page)
router.patch("/:id/sold", (0, auth_1.requireRole)("shop"), phoneController_1.markSold);
router.patch("/:id/invoice", (0, auth_1.requireRole)("shop"), phoneController_1.updateSoldCustomer); // Invoice Edit — customer details
router.patch("/:id/cancel-sold", (0, auth_1.requireRole)("shop"), phoneController_1.cancelSold);
router.patch("/:id/issue", (0, auth_1.requireRole)("shop"), phoneController_1.reportIssue);
router.get("/search/imei", (0, auth_1.requireRole)("owner", "shop"), phoneController_1.searchByImei);
exports.default = router;
