import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";

const COOKIE_NAME = "token";
const isProd = process.env.NODE_ENV === "production";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    res
      .cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: (err as Error).message });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME).json({ message: "Logged out" });
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  // IMPORTANT: shape must match the /login response exactly ({ id, name, email, role }).
  // A raw Mongoose doc serializes with "_id", not "id" -- if this ever drifts, every
  // "is this my phone?" check on the frontend (ownerId === user.id) silently breaks after
  // a page reload, even though it works right after logging in (Edit/Delete buttons on
  // "All Phone" disappear on refresh).
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
