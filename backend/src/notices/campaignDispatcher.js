const nodemailer = require("nodemailer");
const env = require("../config/env");
const {
  getCampaignById,
  listCampaignRecipients,
  markCampaignSending,
  updateCampaignSummary,
  markRecipientsQueuedNextDay,
  bumpRecipientAttempt,
} = require("./campaignRepository");
const { renderNoticeEmail } = require("./emailTemplate");
const { resolveCurrentPresidentName } = require("./presidentResolver");
const { getNoticeEmailTemplateConfig } = require("./emailTemplateConfig");
const { EMAIL_STATUS, EMAIL_TYPES, logEmailAudit, reserveGlobalQuota } = require("../email/governance");

const SEND_BATCH_SIZE = 20;
const BATCH_DELAY_MS = 450;
const runningCampaigns = new Set();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: Number(env.smtp.port) === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
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

function brandedFromHeader() {
  const address = extractSenderAddress(env.smtp.from) || String(env.smtp.user || "").trim();
  if (!address) return "";
  return `HPC Alumni Association <${address}>`;
}

async function loadNotice(pool, noticeId) {
  const [rows] = await pool.query("SELECT * FROM notices WHERE id = ? LIMIT 1", [noticeId]);
  return rows?.[0] || null;
}

async function dispatchCampaign(pool, campaignId, options = {}) {
  if (runningCampaigns.has(campaignId)) {
    return { ok: false, error: "Campaign already running" };
  }
  runningCampaigns.add(campaignId);

  try {
    const campaign = await getCampaignById(pool, campaignId);
    if (!campaign) return { ok: false, error: "Campaign not found" };

    const notice = await loadNotice(pool, campaign.notice_id);
    if (!notice) return { ok: false, error: "Notice not found" };

    const transporter = createTransporter();
    const from = brandedFromHeader();
    if (!transporter || !from) {
      await updateCampaignSummary(pool, campaignId, {
        sent_count: Number(campaign.sent_count || 0),
        failed_count: Number(campaign.failed_count || 0),
        pending_count: Number(campaign.pending_count || 0),
        skipped_count: Number(campaign.skipped_count || 0),
        quota_used_by_campaign: Number(campaign.quota_used_by_campaign || 0),
        status: "failed",
        completed_at: new Date(),
      });
      return { ok: false, error: "SMTP not configured" };
    }

    await markCampaignSending(pool, campaignId);

    const pendingRows = await listCampaignRecipients(pool, campaignId, "pending");
    const queuedRows = await listCampaignRecipients(pool, campaignId, "queued_next_day");
    const workRows = [...pendingRows, ...(options.includeQueued ? queuedRows : [])];
    const requestedCount = workRows.length;
    if (!requestedCount) {
      await updateCampaignSummary(pool, campaignId, {
        sent_count: Number(campaign.sent_count || 0),
        failed_count: Number(campaign.failed_count || 0),
        pending_count: 0,
        skipped_count: Number(campaign.skipped_count || 0),
        quota_used_by_campaign: Number(campaign.quota_used_by_campaign || 0),
        status: "completed",
        completed_at: new Date(),
      });
      return { ok: true, message: "No pending recipients" };
    }

    const reserve = await reserveGlobalQuota(pool, requestedCount);

    const sendNow = workRows.slice(0, reserve.reserved_count);
    const queuedLater = workRows.slice(reserve.reserved_count);

    if (queuedLater.length) {
      await markRecipientsQueuedNextDay(
        pool,
        campaignId,
        queuedLater.map((r) => r.id)
      );
      for (const recipient of queuedLater) {
        await logEmailAudit(pool, {
          email_type: EMAIL_TYPES.NOTICE_CAMPAIGN,
          status: EMAIL_STATUS.QUEUED_NEXT_DAY,
          recipient_email: recipient.email,
          recipient_user_id: recipient.user_id || null,
          initiated_by: campaign.created_by || null,
          notice_id: campaign.notice_id || null,
          campaign_id: campaign.id,
          counted_against_quota: false,
          reason: "Queued for next day due to daily limit",
          meta_json: { notice_title: noticeTitle },
        });
      }
    }

    let sent = Number(campaign.sent_count || 0);
    let failed = Number(campaign.failed_count || 0);
    const skipped = Number(campaign.skipped_count || 0);
    let quotaUsed = Number(campaign.quota_used_by_campaign || 0);
    const presidentName = await resolveCurrentPresidentName(pool);
    const templateConfig = await getNoticeEmailTemplateConfig(pool);
    const frontendBaseUrl = String(env.frontendOrigin || "").replace(/\/$/, "");
    const noticeTitle = String(notice?.title || "").trim();

    for (let i = 0; i < sendNow.length; i += SEND_BATCH_SIZE) {
      const batch = sendNow.slice(i, i + SEND_BATCH_SIZE);
      const batchNo = Math.floor(i / SEND_BATCH_SIZE) + 1;

      if (campaign.send_mode === "cc" || campaign.send_mode === "bcc") {
        const emails = batch.map((r) => String(r.email || "").trim().toLowerCase()).filter(Boolean);
        const sampleRecipient = { name: "Alumni Member" };
        const rendered = renderNoticeEmail({
          notice,
          recipient: sampleRecipient,
          frontendBaseUrl,
          presidentName,
          templateConfig,
        });
        try {
          const to = campaign.send_mode === "cc" ? emails[0] : from;
          await transporter.sendMail({
            from,
            to,
            cc: campaign.send_mode === "cc" ? emails.slice(1) : undefined,
            bcc: campaign.send_mode === "bcc" ? emails : undefined,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });
          for (const recipient of batch) {
            await bumpRecipientAttempt(pool, recipient.id, {
              status: "sent",
              sent_at: new Date(),
              failed_reason: null,
              counted_against_quota: true,
              batch_no: batchNo,
            });
            sent += 1;
            quotaUsed += 1;
            await logEmailAudit(pool, {
              email_type: EMAIL_TYPES.NOTICE_CAMPAIGN,
              status: EMAIL_STATUS.SENT,
              recipient_email: recipient.email,
              recipient_user_id: recipient.user_id || null,
              initiated_by: campaign.created_by || null,
              notice_id: campaign.notice_id || null,
              campaign_id: campaign.id,
              counted_against_quota: true,
              meta_json: { subject: rendered.subject, notice_title: noticeTitle },
            });
          }
        } catch (err) {
          for (const recipient of batch) {
            await bumpRecipientAttempt(pool, recipient.id, {
              status: "failed",
              sent_at: null,
              failed_reason: err?.message || "send failed",
              counted_against_quota: true,
              batch_no: batchNo,
            });
            failed += 1;
            quotaUsed += 1;
            await logEmailAudit(pool, {
              email_type: EMAIL_TYPES.NOTICE_CAMPAIGN,
              status: EMAIL_STATUS.FAILED,
              recipient_email: recipient.email,
              recipient_user_id: recipient.user_id || null,
              initiated_by: campaign.created_by || null,
              notice_id: campaign.notice_id || null,
              campaign_id: campaign.id,
              counted_against_quota: true,
              reason: err?.message || "send failed",
              meta_json: { subject: rendered.subject, notice_title: noticeTitle },
            });
          }
        }
      } else {
        for (const recipient of batch) {
          const rendered = renderNoticeEmail({
            notice,
            recipient,
            frontendBaseUrl,
            presidentName,
            templateConfig,
          });
          try {
            await transporter.sendMail({
              from,
              to: recipient.email,
              subject: rendered.subject,
              html: rendered.html,
              text: rendered.text,
            });
            await bumpRecipientAttempt(pool, recipient.id, {
              status: "sent",
              sent_at: new Date(),
              failed_reason: null,
              counted_against_quota: true,
              batch_no: batchNo,
            });
            sent += 1;
            quotaUsed += 1;
            await logEmailAudit(pool, {
              email_type: EMAIL_TYPES.NOTICE_CAMPAIGN,
              status: EMAIL_STATUS.SENT,
              recipient_email: recipient.email,
              recipient_user_id: recipient.user_id || null,
              initiated_by: campaign.created_by || null,
              notice_id: campaign.notice_id || null,
              campaign_id: campaign.id,
              counted_against_quota: true,
              meta_json: { subject: rendered.subject, notice_title: noticeTitle },
            });
          } catch (err) {
            await bumpRecipientAttempt(pool, recipient.id, {
              status: "failed",
              sent_at: null,
              failed_reason: err?.message || "send failed",
              counted_against_quota: true,
              batch_no: batchNo,
            });
            failed += 1;
            quotaUsed += 1;
            await logEmailAudit(pool, {
              email_type: EMAIL_TYPES.NOTICE_CAMPAIGN,
              status: EMAIL_STATUS.FAILED,
              recipient_email: recipient.email,
              recipient_user_id: recipient.user_id || null,
              initiated_by: campaign.created_by || null,
              notice_id: campaign.notice_id || null,
              campaign_id: campaign.id,
              counted_against_quota: true,
              reason: err?.message || "send failed",
              meta_json: { subject: rendered.subject, notice_title: noticeTitle },
            });
          }
        }
      }

      const pendingAfterBatch = Math.max(requestedCount - (i + batch.length), 0);
      await updateCampaignSummary(pool, campaignId, {
        sent_count: sent,
        failed_count: failed,
        pending_count: pendingAfterBatch + queuedLater.length,
        skipped_count: skipped,
        quota_used_by_campaign: quotaUsed,
        status: queuedLater.length ? "partially_sent" : "sending",
      });

      if (i + SEND_BATCH_SIZE < sendNow.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const finalPendingRows = await listCampaignRecipients(pool, campaignId);
    const pendingCount = finalPendingRows.filter((r) => r.status === "pending" || r.status === "queued_next_day").length;
    const finalStatus = pendingCount > 0 ? "partially_sent" : "completed";

    await updateCampaignSummary(pool, campaignId, {
      sent_count: sent,
      failed_count: failed,
      pending_count: pendingCount,
      skipped_count: skipped,
      quota_used_by_campaign: quotaUsed,
      status: finalStatus,
      completed_at: finalStatus === "completed" ? new Date() : null,
    });

    return { ok: true, status: finalStatus };
  } finally {
    runningCampaigns.delete(campaignId);
  }
}

function startCampaignDispatchInBackground(pool, campaignId, options) {
  void dispatchCampaign(pool, campaignId, options).catch(() => {});
}

module.exports = {
  dispatchCampaign,
  startCampaignDispatchInBackground,
};
