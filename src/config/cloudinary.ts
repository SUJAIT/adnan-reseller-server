import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// One dynamic storage: routes to a different Cloudinary folder depending on
// which form field the file came in on ("images" -> phone photos folder,
// "nidImage" -> a separate NID folder). This lets a single multer instance
// handle both file types in one multipart form (used by the "Add Phone" form).
const dynamicStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const isNid = file.fieldname === "nidImage";
    return {
      folder: isNid ? "phone-business/nid" : "phone-business/phones",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: isNid ? 1600 : 1200, crop: "limit" }],
    };
  },
});

export const upload = multer({ storage: dynamicStorage });
export { cloudinary };
