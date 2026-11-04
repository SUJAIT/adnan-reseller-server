import { Schema, model, Document } from "mongoose";
import { UserRole } from "../types";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole; // "owner" -> Sujait & Avi, "shop" -> Zahed
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["owner", "shop"], required: true },
  },
  { timestamps: true }
);

export default model<IUser>("User", userSchema);
