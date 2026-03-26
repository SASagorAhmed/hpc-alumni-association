const app = require("./app");
const env = require("./config/env");
const { getOrCreatePool } = require("./db/pool");
const { ensureCommitteePostsBoardSectionColumn } = require("./utils/ensureCommitteePostsBoardSection");
const cloudinary = require("./config/cloudinary");
const nodemailer = require("nodemailer");

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
        await ensureCommitteePostsBoardSectionColumn(pool).catch((err) =>
          console.warn("[startup] committee_posts.board_section ensure:", err.message || err)
        );
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

app.listen(env.port, () => {
  console.log(`[backend] Listening on port ${env.port}`);
});
