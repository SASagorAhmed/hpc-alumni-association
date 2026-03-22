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
const cloudinary = require("./config/cloudinary");
const nodemailer = require("nodemailer");

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

// Configure Google OAuth strategy at startup.
configureGooglePassport();

async function printStartupConnectionStatus() {
  console.log("[startup] Checking service connections...");

  // MySQL status
  try {
    const pool = getOrCreatePool();
    if (!pool) {
      console.warn("[startup] MySQL(Aiven): NOT CONFIGURED");
    } else {
      const [rows] = await pool.query("SELECT 1 AS ok");
      if (rows?.[0]?.ok === 1) {
        console.log("[startup] MySQL(Aiven): CONNECTED");
      } else {
        console.warn("[startup] MySQL(Aiven): NOT CONNECTED");
      }
    }
  } catch (e) {
    console.warn(`[startup] MySQL(Aiven): NOT CONNECTED (${e.message || e})`);
  }

  // Cloudinary status
  try {
    if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
      console.warn("[startup] Cloudinary: NOT CONFIGURED");
    } else {
      await cloudinary.api.ping();
      console.log("[startup] Cloudinary: CONNECTED");
    }
  } catch (e) {
    console.warn(`[startup] Cloudinary: NOT CONNECTED (${e.message || e})`);
  }

  // SMTP status
  try {
    if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
      console.warn("[startup] SMTP: NOT CONFIGURED");
    } else {
      const transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: Number(env.smtp.port) === 465,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass,
        },
      });
      await transporter.verify();
      console.log("[startup] SMTP: CONNECTED");
    }
  } catch (e) {
    console.warn(`[startup] SMTP: NOT CONNECTED (${e.message || e})`);
  }

  // Google OAuth status (config-level check)
  if (env.google.clientId && env.google.clientSecret && env.google.callbackUrl) {
    console.log("[startup] Google OAuth: CONFIGURED");
  } else {
    console.warn("[startup] Google OAuth: NOT CONFIGURED");
  }
}

printStartupConnectionStatus().catch((e) => {
  console.warn("[startup] Connection status check failed:", e.message || e);
});

// Basic DB connectivity check (useful for debugging)
app.get("/db-health", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) {
      return res.status(503).json({ ok: false, error: "MySQL not configured" });
    }

    const [rows] = await pool.query("SELECT 1 AS ok");
    res.status(200).json({ ok: true, db: rows?.[0]?.ok ?? 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-unused-vars
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal Server Error" });
});

app.listen(env.port, () => {
  console.log(`[backend] Listening on port ${env.port}`);
});


