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
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload } from "../config/cloudinary";
import {
  addPhone,
  getAllPhonesOwnerView,
  getSoldPhones,
  getIssuePhones,
  toggleHidden,
  updatePhone,
  deletePhone,
  getShopUnsoldPhones,
  markSold,
  cancelSold,
  reportIssue,
  searchByImei,
  getMyPhones,
  getPhonesBoughtInRange,
  getAddingAverageBreakdown,
  getServiceCostBreakdown,
  getShopSoldPhonesInRange,
  reportLoss,
  issueFix,
  getPhoneById,
  getLongTimeUnsoldPhones,
  getShopPhoneById,
  updateSoldCustomer,
} from "../controllers/phoneController";

const router = Router();

router.use(requireAuth);

// Owner-only routes
// "images" = up to 8 phone photos, "nidImage" = optional seller NID photo
router.post(
  "/",
  requireRole("owner"),
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "nidImage", maxCount: 1 },
  ]),
  addPhone
);
router.get("/all", requireRole("owner"), getAllPhonesOwnerView);
router.get("/mine", requireRole("owner"), getMyPhones); // "Total Phone" route
router.get("/buying/:period", requireRole("owner"), getPhonesBoughtInRange); // week | month
router.get("/adding-average", requireRole("owner"), getAddingAverageBreakdown); // Total Mobile Adding Average detail table
router.get("/service-cost", requireRole("owner"), getServiceCostBreakdown);
router.get("/sold", requireRole("owner", "shop"), getSoldPhones);
router.get("/issues", requireRole("owner", "shop"), getIssuePhones);
router.get("/long-time-unsold", requireRole("owner", "shop"), getLongTimeUnsoldPhones); // Long Time Unsold Phone
router.get("/:id", requireRole("owner"), getPhoneById); // must stay after the literal GET routes above
router.patch("/:id/hide", requireRole("owner"), toggleHidden);
router.patch(
  "/:id",
  requireRole("owner"),
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "nidImage", maxCount: 1 },
  ]),
  updatePhone
);
router.delete("/:id", requireRole("owner"), deletePhone);
router.post("/:id/loss", requireRole("owner"), reportLoss); // Issue page -> "Loss"
router.post("/:id/issue-fix", requireRole("owner"), issueFix); // Issue page -> "Issue Fix"

// Shop-only routes
router.get("/shop/unsold", requireRole("shop"), getShopUnsoldPhones);
router.get("/shop/sold/:period", requireRole("shop"), getShopSoldPhonesInRange); // week|month|year|all
router.get("/shop/:id", requireRole("shop"), getShopPhoneById); // single phone (Invoice print page)
router.patch("/:id/sold", requireRole("shop"), markSold);
router.patch("/:id/invoice", requireRole("shop"), updateSoldCustomer); // Invoice Edit — customer details
router.patch("/:id/cancel-sold", requireRole("shop"), cancelSold);
router.patch("/:id/issue", requireRole("shop"), reportIssue);
router.get("/search/imei", requireRole("owner", "shop"), searchByImei);

export default router;
