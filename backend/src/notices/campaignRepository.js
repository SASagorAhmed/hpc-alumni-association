const { v4: uuidv4 } = require("uuid");

async function createCampaign(pool, payload) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO notice_email_campaigns
      (id, notice_id, created_by, status, include_admins, send_mode, filter_snapshot_json,
       total_selected, total_eligible_verified, sent_count, failed_count, pending_count, skipped_count,
       daily_limit, quota_available_at_start, quota_used_by_campaign, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 0, NULL, NULL)`,
    [
      id,
      payload.notice_id,
      payload.created_by,
      payload.status || "queued",
      payload.include_admins ? 1 : 0,
      payload.send_mode || "individual",
      JSON.stringify(payload.filter_snapshot_json || {}),
      payload.total_selected || 0,
      payload.total_eligible_verified || 0,
      payload.pending_count || 0,
      payload.skipped_count || 0,
      payload.daily_limit || 300,
      payload.quota_available_at_start || 0,
    ]
  );
  return id;
}

async function insertCampaignRecipients(pool, rows) {
  if (!rows?.length) return;
  const values = rows.map((r) => [
    uuidv4(),
    r.campaign_id,
    r.notice_id,
    r.user_id,
    r.email,
    r.status || "pending",
    r.failed_reason || null,
    r.batch_no || 0,
  ]);

  await pool.query(
    `INSERT INTO notice_email_recipients
      (id, campaign_id, notice_id, user_id, email, status, failed_reason, batch_no)
     VALUES ?`,
    [values]
  );
}

async function getCampaignById(pool, campaignId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM notice_email_campaigns
     WHERE id = ?
     LIMIT 1`,
    [campaignId]
  );
  return rows?.[0] || null;
}

async function listCampaignHistory(pool, limit = 50) {
  const [rows] = await pool.query(
    `SELECT c.*, n.title AS notice_title
     FROM notice_email_campaigns c
     INNER JOIN notices n ON n.id = c.notice_id
     ORDER BY c.created_at DESC
     LIMIT ?`,
    [Number(limit) || 50]
  );
  return rows || [];
}

async function listCampaignRecipients(pool, campaignId, status) {
  let sql = `SELECT * FROM notice_email_recipients WHERE campaign_id = ?`;
  const params = [campaignId];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at ASC";
  const [rows] = await pool.query(sql, params);
  return rows || [];
}

async function markCampaignSending(pool, campaignId) {
  await pool.query(
    `UPDATE notice_email_campaigns
     SET status = 'sending',
         started_at = IFNULL(started_at, NOW())
     WHERE id = ?`,
    [campaignId]
  );
}

async function updateCampaignSummary(pool, campaignId, payload) {
  await pool.query(
    `UPDATE notice_email_campaigns
     SET sent_count = ?,
         failed_count = ?,
         pending_count = ?,
         skipped_count = ?,
         quota_used_by_campaign = ?,
         status = ?,
         completed_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      payload.sent_count || 0,
      payload.failed_count || 0,
      payload.pending_count || 0,
      payload.skipped_count || 0,
      payload.quota_used_by_campaign || 0,
      payload.status || "sending",
      payload.completed_at || null,
      campaignId,
    ]
  );
}

async function markRecipientsQueuedNextDay(pool, campaignId, recipientIds) {
  if (!recipientIds?.length) return;
  await pool.query(
    `UPDATE notice_email_recipients
     SET status = 'queued_next_day'
     WHERE campaign_id = ?
       AND id IN (${recipientIds.map(() => "?").join(",")})`,
    [campaignId, ...recipientIds]
  );
}

async function bumpRecipientAttempt(pool, recipientId, patch) {
  await pool.query(
    `UPDATE notice_email_recipients
     SET status = ?,
         sent_at = ?,
         failed_reason = ?,
         counted_against_quota = ?,
         batch_no = ?,
         attempt_count = attempt_count + 1,
         last_attempt_at = NOW(),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      patch.status,
      patch.sent_at || null,
      patch.failed_reason || null,
      patch.counted_against_quota ? 1 : 0,
      patch.batch_no || 0,
      recipientId,
    ]
  );
}

module.exports = {
  createCampaign,
  insertCampaignRecipients,
  getCampaignById,
  listCampaignHistory,
  listCampaignRecipients,
  markCampaignSending,
  updateCampaignSummary,
  markRecipientsQueuedNextDay,
  bumpRecipientAttempt,
};
