const { v4: uuidv4 } = require("uuid");
const { ensureEmailGovernanceTables } = require("../utils/ensureEmailGovernanceTables");
const { DEFAULT_PROVIDER, reserveQuota } = require("../notices/quotaManager");

const DEFAULT_LIMIT = 300;

const EMAIL_TYPES = Object.freeze({
  AUTH_VERIFY: "auth_verify",
  AUTH_RESET: "auth_reset",
  AUTH_LOGIN_OTP: "auth_login_otp",
  NOTICE_PUBLISH: "notice_publish",
  NOTICE_CAMPAIGN: "notice_campaign",
  NOTIFICATION: "notification",
});

const EMAIL_STATUS = Object.freeze({
  SENT: "sent",
  FAILED: "failed",
  BLOCKED_LIMIT: "blocked_limit",
  QUEUED_NEXT_DAY: "queued_next_day",
});

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDailyLimit(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.floor(n);
}

function getGlobalDailyLimit() {
  return normalizeDailyLimit(process.env.GLOBAL_EMAIL_DAILY_LIMIT || process.env.NOTICE_EMAIL_DAILY_LIMIT || DEFAULT_LIMIT);
}

async function logEmailAudit(pool, payload = {}) {
  await ensureEmailGovernanceTables(pool);
  await pool.query(
    `INSERT INTO email_audit_log
      (id, quota_date, provider, email_type, status, recipient_email, recipient_user_id, initiated_by,
       notice_id, campaign_id, counted_against_quota, reason, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      String(payload.quota_date || getTodayDateKey()),
      String(payload.provider || DEFAULT_PROVIDER),
      String(payload.email_type || EMAIL_TYPES.NOTIFICATION),
      String(payload.status || EMAIL_STATUS.FAILED),
      payload.recipient_email ? String(payload.recipient_email).trim().toLowerCase() : null,
      payload.recipient_user_id || null,
      payload.initiated_by || null,
      payload.notice_id || null,
      payload.campaign_id || null,
      payload.counted_against_quota ? 1 : 0,
      payload.reason ? String(payload.reason).slice(0, 4000) : null,
      payload.meta_json ? JSON.stringify(payload.meta_json) : null,
    ]
  );
}

async function reserveGlobalQuota(pool, requestedCount) {
  return reserveQuota(pool, {
    requestedCount: Math.max(Number(requestedCount || 0), 0),
    provider: DEFAULT_PROVIDER,
    limit: getGlobalDailyLimit(),
  });
}

async function sendGovernedEmail({ pool, transporter, mailOptions, emailType, initiatedBy, recipientEmail, recipientUserId, noticeId, campaignId }) {
  if (!pool) throw new Error("DB pool is required for governed email send");
  if (!transporter) throw new Error("SMTP transporter is required for governed email send");

  const recipient = String(recipientEmail || "").trim().toLowerCase();
  const subject = String(mailOptions?.subject || "").trim();
  if (!recipient) throw new Error("Recipient email is required");

  const reserve = await reserveGlobalQuota(pool, 1);
  if (Number(reserve?.reserved_count || 0) < 1) {
    await logEmailAudit(pool, {
      email_type: emailType,
      status: EMAIL_STATUS.BLOCKED_LIMIT,
      recipient_email: recipient,
      recipient_user_id: recipientUserId || null,
      initiated_by: initiatedBy || null,
      notice_id: noticeId || null,
      campaign_id: campaignId || null,
      counted_against_quota: false,
      reason: "Global daily email limit reached",
      meta_json: subject ? { subject } : undefined,
    });
    return { ok: false, status: EMAIL_STATUS.BLOCKED_LIMIT, reason: "Daily email limit reached" };
  }

  try {
    await transporter.sendMail(mailOptions);
    await logEmailAudit(pool, {
      email_type: emailType,
      status: EMAIL_STATUS.SENT,
      recipient_email: recipient,
      recipient_user_id: recipientUserId || null,
      initiated_by: initiatedBy || null,
      notice_id: noticeId || null,
      campaign_id: campaignId || null,
      counted_against_quota: true,
      meta_json: subject ? { subject } : undefined,
    });
    return { ok: true, status: EMAIL_STATUS.SENT };
  } catch (error) {
    await logEmailAudit(pool, {
      email_type: emailType,
      status: EMAIL_STATUS.FAILED,
      recipient_email: recipient,
      recipient_user_id: recipientUserId || null,
      initiated_by: initiatedBy || null,
      notice_id: noticeId || null,
      campaign_id: campaignId || null,
      counted_against_quota: true,
      reason: error?.message || "send failed",
      meta_json: subject ? { subject } : undefined,
    });
    return { ok: false, status: EMAIL_STATUS.FAILED, reason: error?.message || "send failed" };
  }
}

module.exports = {
  EMAIL_TYPES,
  EMAIL_STATUS,
  getGlobalDailyLimit,
  reserveGlobalQuota,
  logEmailAudit,
  sendGovernedEmail,
};

