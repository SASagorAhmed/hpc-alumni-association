const nodemailer = require("nodemailer");
const env = require("../config/env");
const { renderNoticeEmail } = require("./emailTemplate");
const { resolveCurrentPresidentName } = require("./presidentResolver");
const { getNoticeEmailTemplateConfig } = require("./emailTemplateConfig");

const ENABLE_FLAG = "NOTICE_EMAIL_ON_PUBLISH";
const DAILY_LIMIT_FLAG = "NOTICE_EMAIL_DAILY_LIMIT";
const DEFAULT_DAILY_LIMIT = 300;
const SEND_BATCH_SIZE = 20;
const BATCH_DELAY_MS = 350;
const BRAND_SENDER_NAME = "HPC Alumni Association";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isEmailEnabled() {
  return String(process.env[ENABLE_FLAG] || "").trim() === "1";
}

function getDailyLimit() {
  const parsed = Number(process.env[DAILY_LIMIT_FLAG] || DEFAULT_DAILY_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DAILY_LIMIT;
  return Math.floor(parsed);
}

function createTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: Number(env.smtp.port) === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

function extractSenderAddress(rawFrom) {
  const from = String(rawFrom || "").trim();
  if (!from) return "";
  const bracket = from.match(/<([^>]+)>/);
  if (bracket?.[1]) return bracket[1].trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return from;
  return "";
}

function getBrandedFromHeader() {
  const senderAddress = extractSenderAddress(env.smtp.from) || String(env.smtp.user || "").trim();
  if (!senderAddress) return "";
  return `${BRAND_SENDER_NAME} <${senderAddress}>`;
}

function normalizeAudience(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function listEligibleRecipients(pool, audience) {
  const normalizedAudience = normalizeAudience(audience);
  const adminClause =
    normalizedAudience === "admin"
      ? "EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin')"
      : "NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin')";

  const [rows] = await pool.query(
    `SELECT
        u.id AS user_id,
        TRIM(u.email) AS email,
        p.name AS name,
        p.batch AS batch,
        p.department AS department
      FROM users u
      LEFT JOIN profiles p ON p.id = u.id
      WHERE TRIM(COALESCE(u.email,'')) <> ''
        AND (COALESCE(u.email_verified,0) = 1 OR COALESCE(p.verified,0) = 1)
        AND ${adminClause}
      ORDER BY u.email ASC`
  );

  return (rows || [])
    .map((r) => ({
      user_id: r.user_id,
      email: String(r.email || "").trim().toLowerCase(),
      name: r.name,
      batch: r.batch,
      department: r.department,
    }))
    .filter((r) => r.email);
}

function resolveFrontendBaseUrl() {
  return String(env.frontendRedirectOrigin || env.frontendOrigin || "").trim().replace(/\/$/, "");
}

async function sendNoticeEmailForPublishedNotice({ pool, notice }) {
  if (!isEmailEnabled()) {
    return { ok: true, skipped: true, reason: "NOTICE_EMAIL_ON_PUBLISH disabled" };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { ok: false, skipped: true, reason: "SMTP not configured" };
  }
  const fromHeader = getBrandedFromHeader();
  if (!fromHeader) {
    return { ok: false, skipped: true, reason: "SMTP sender identity not configured" };
  }

  const recipients = await listEligibleRecipients(pool, notice?.audience);
  const dailyLimit = getDailyLimit();
  const allowedNow = Math.min(dailyLimit, recipients.length);
  const pending = Math.max(recipients.length - allowedNow, 0);
  const sendNow = recipients.slice(0, allowedNow);

  let sent = 0;
  let failed = 0;
  const failures = [];
  const frontendBaseUrl = resolveFrontendBaseUrl();
  const presidentName = await resolveCurrentPresidentName(pool);
  const templateConfig = await getNoticeEmailTemplateConfig(pool);

  for (let i = 0; i < sendNow.length; i += SEND_BATCH_SIZE) {
    const batch = sendNow.slice(i, i + SEND_BATCH_SIZE);

    await Promise.all(
      batch.map(async (recipient) => {
        try {
          const rendered = renderNoticeEmail({
            notice,
            recipient,
            frontendBaseUrl,
            presidentName,
            templateConfig,
          });

          await transporter.sendMail({
            from: fromHeader,
            to: recipient.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });
          sent += 1;
        } catch (error) {
          failed += 1;
          failures.push({
            email: recipient.email,
            reason: error?.message || "send failed",
          });
        }
      })
    );

    if (i + SEND_BATCH_SIZE < sendNow.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return {
    ok: true,
    skipped: false,
    total_selected: recipients.length,
    sent,
    failed,
    pending,
    quota_limit: dailyLimit,
    quota_remaining_after_dispatch: Math.max(dailyLimit - sent, 0),
    failures,
  };
}

module.exports = {
  sendNoticeEmailForPublishedNotice,
};
