/**
 * Ensure notice email campaign tracking tables exist.
 */
async function ensureNoticeEmailCampaignTables(pool) {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notice_email_campaigns (
      id CHAR(36) NOT NULL,
      notice_id CHAR(36) NOT NULL,
      created_by CHAR(36) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
      include_admins TINYINT(1) NOT NULL DEFAULT 1,
      send_mode VARCHAR(12) NOT NULL DEFAULT 'individual',
      filter_snapshot_json JSON NULL,
      total_selected INT NOT NULL DEFAULT 0,
      total_eligible_verified INT NOT NULL DEFAULT 0,
      sent_count INT NOT NULL DEFAULT 0,
      failed_count INT NOT NULL DEFAULT 0,
      pending_count INT NOT NULL DEFAULT 0,
      skipped_count INT NOT NULL DEFAULT 0,
      daily_limit INT NOT NULL DEFAULT 300,
      quota_available_at_start INT NOT NULL DEFAULT 0,
      quota_used_by_campaign INT NOT NULL DEFAULT 0,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notice_email_campaigns_notice (notice_id),
      KEY idx_notice_email_campaigns_status (status),
      KEY idx_notice_email_campaigns_created (created_at),
      CONSTRAINT fk_notice_email_campaign_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
      CONSTRAINT fk_notice_email_campaign_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notice_email_recipients (
      id CHAR(36) NOT NULL,
      campaign_id CHAR(36) NOT NULL,
      notice_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      email VARCHAR(255) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      sent_at DATETIME NULL,
      failed_reason TEXT NULL,
      counted_against_quota TINYINT(1) NOT NULL DEFAULT 0,
      batch_no INT NOT NULL DEFAULT 0,
      attempt_count INT NOT NULL DEFAULT 0,
      last_attempt_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_notice_email_recipient_unique (campaign_id, user_id, email),
      KEY idx_notice_email_recipients_campaign_status (campaign_id, status),
      KEY idx_notice_email_recipients_notice (notice_id),
      CONSTRAINT fk_notice_email_recipients_campaign FOREIGN KEY (campaign_id) REFERENCES notice_email_campaigns(id) ON DELETE CASCADE,
      CONSTRAINT fk_notice_email_recipients_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
      CONSTRAINT fk_notice_email_recipients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_daily_quota (
      quota_date DATE NOT NULL,
      provider VARCHAR(24) NOT NULL,
      limit_count INT NOT NULL DEFAULT 300,
      sent_count INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (quota_date, provider)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensureNoticeEmailCampaignTables };
