"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./config/db");
const realtime_1 = require("./realtime");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const phoneRoutes_1 = __importDefault(require("./routes/phoneRoutes"));
const investmentRoutes_1 = __importDefault(require("./routes/investmentRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const shopPaymentRoutes_1 = __importDefault(require("./routes/shopPaymentRoutes"));
const ledgerRoutes_1 = __importDefault(require("./routes/ledgerRoutes"));
const app = (0, express_1.default)();
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000").split(",");
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes_1.default);
app.use("/api/phones", phoneRoutes_1.default);
app.use("/api/investments", investmentRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/shop-payments", shopPaymentRoutes_1.default);
app.use("/api/ledger", ledgerRoutes_1.default);
// central error handler (e.g. multer file errors, duplicate IMEI, etc.)
app.use((err, _req, res, _next) => {
    console.error(err);
    if (err?.code === 11000) {
        return res.status(409).json({ message: "Duplicate value (e.g. IMEI already exists)" });
    }
    res.status(err?.status || 500).json({ message: err?.message || "Server error" });
});
const server = http_1.default.createServer(app);
(0, realtime_1.initRealtime)(server, allowedOrigins);
const PORT = process.env.PORT || 5000;
(0, db_1.connectDB)()
    .then(() => {
    server.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
})
    .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
});
