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

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Backend is running.",
    developedBy: "Sagor Ahmed, A Proud Alumni of HPC.",
  });
});

// Healthcheck
app.get("/health", healthRoute());
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

// Basic DB connectivity check (useful for debugging)
app.get("/db-health", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) {
      return res.status(503).json({ ok: false, error: "MySQL not configured" });
    }

    const [rows] = await pool.query("SELECT 1 AS ok");
    return res.status(200).json({ ok: true, db: rows?.[0]?.ok ?? 1 });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-unused-vars
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal Server Error" });
});

module.exports = app;
