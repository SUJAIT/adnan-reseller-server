import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import { initRealtime } from "./realtime";

import authRoutes from "./routes/authRoutes";
import phoneRoutes from "./routes/phoneRoutes";
import investmentRoutes from "./routes/investmentRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import shopPaymentRoutes from "./routes/shopPaymentRoutes";
import ledgerRoutes from "./routes/ledgerRoutes";

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000").split(",");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/phones", phoneRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/shop-payments", shopPaymentRoutes);
app.use("/api/ledger", ledgerRoutes);

// central error handler (e.g. multer file errors, duplicate IMEI, etc.)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err?.code === 11000) {
    return res.status(409).json({ message: "Duplicate value (e.g. IMEI already exists)" });
  }
  res.status(err?.status || 500).json({ message: err?.message || "Server error" });
});

const server = http.createServer(app);
initRealtime(server, allowedOrigins);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
