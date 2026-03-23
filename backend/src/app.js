const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const env = require("./config/env");
const { getOrCreatePool } = require("./db/pool");
const { healthRoute } = require("./routes/health");
const authRoutes = require("./routes/auth");
const { configureGooglePassport } = require("./auth/google");
const publicLandingRoutes = require("./routes/publicLanding");
const publicNoticesEventsRoutes = require("./routes/publicNoticesEvents");
const publicDirectoryRoutes = require("./routes/publicDirectory");
const adminDocumentsRoutes = require("./routes/adminDocuments");
const adminUploadsRoutes = require("./routes/adminUploads");
const publicContentRoutes = require("./routes/publicContent");
const adminContentRoutes = require("./routes/adminContent");
const adminCommitteeModuleRoutes = require("./routes/adminCommitteeModule");

const app = express();

const allowedOrigins = String(env.frontendOrigin || "")
  .split(",")
  .map((v) => v.trim().replace(/\/$/, ""))
  .filter(Boolean);

const vercelAppOriginPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (curl, server-to-server, health checks)
    if (!origin) return callback(null, true);
    const normalized = String(origin).trim().replace(/\/$/, "");
    if (allowedOrigins.includes(normalized) || vercelAppOriginPattern.test(normalized)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Backend is running.",
    developedBy: "Sagor Ahmed, A Proud Alumni of HPC.",
  });
});

// Healthcheck (supports both /health and /api/health)
app.get(["/health", "/api/health"], healthRoute());
app.use("/api/auth", authRoutes);
app.use("/api/public", publicLandingRoutes);
app.use("/api/public", publicNoticesEventsRoutes);
app.use("/api/public", publicDirectoryRoutes);
app.use("/api/public", publicContentRoutes);
app.use("/api/admin", adminDocumentsRoutes);
app.use("/api/admin", adminUploadsRoutes);
app.use("/api/admin", adminContentRoutes);
app.use("/api/admin", adminCommitteeModuleRoutes);

// Configure Google OAuth strategy.
configureGooglePassport();

// Basic DB connectivity check (supports /db-health and /api/db-health)
app.get(["/db-health", "/api/db-health"], async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) {
      return res.status(503).json({ ok: false, error: "MySQL not configured" });
    }

    const timeoutMs = 12000;
    const [rows] = await Promise.race([
      pool.query("SELECT 1 AS ok"),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`DB check timed out after ${timeoutMs}ms`)), timeoutMs)),
    ]);
    return res.status(200).json({ ok: true, db: rows?.[0]?.ok ?? 1 });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message, hint: "Check DB host/port, SSL cert, and Aiven trusted sources." });
  }
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-unused-vars
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal Server Error" });
});

module.exports = app;
