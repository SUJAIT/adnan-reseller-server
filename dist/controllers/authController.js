"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.logout = logout;
exports.me = me;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const COOKIE_NAME = "token";
const isProd = process.env.NODE_ENV === "production";
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await User_1.default.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const match = await bcryptjs_1.default.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: "30d" });
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
    }
    catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
    }
}
async function logout(_req, res) {
    res.clearCookie(COOKIE_NAME).json({ message: "Logged out" });
}
async function me(req, res) {
    if (!req.user)
        return res.status(401).json({ message: "Not authenticated" });
    const user = await User_1.default.findById(req.user.id).select("-password");
    if (!user)
        return res.status(401).json({ message: "Not authenticated" });
    // IMPORTANT: shape must match the /login response exactly ({ id, name, email, role }).
    // A raw Mongoose doc serializes with "_id", not "id" -- if this ever drifts, every
    // "is this my phone?" check on the frontend (ownerId === user.id) silently breaks after
    // a page reload, even though it works right after logging in (Edit/Delete buttons on
    // "All Phone" disappear on refresh).
    res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
}
