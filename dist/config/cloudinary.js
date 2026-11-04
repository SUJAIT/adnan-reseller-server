"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinary = exports.upload = void 0;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// One dynamic storage: routes to a different Cloudinary folder depending on
// which form field the file came in on ("images" -> phone photos folder,
// "nidImage" -> a separate NID folder). This lets a single multer instance
// handle both file types in one multipart form (used by the "Add Phone" form).
const dynamicStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: async (_req, file) => {
        const isNid = file.fieldname === "nidImage";
        return {
            folder: isNid ? "phone-business/nid" : "phone-business/phones",
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
            transformation: [{ width: isNid ? 1600 : 1200, crop: "limit" }],
        };
    },
});
exports.upload = (0, multer_1.default)({ storage: dynamicStorage });
