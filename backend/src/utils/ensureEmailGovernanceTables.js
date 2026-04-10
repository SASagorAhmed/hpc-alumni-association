/**
 * Ensure global email governance tables exist.
 */
async function ensureEmailGovernanceTables(pool) {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_audit_log (
      id CHAR(36) NOT NULL,
      quota_date DATE NOT NULL,
      provider VARCHAR(24) NOT NULL DEFAULT 'brevo',
      email_type VARCHAR(32) NOT NULL,
      status VARCHAR(24) NOT NULL,
      recipient_email VARCHAR(255) NULL,
      recipient_user_id CHAR(36) NULL,
      initiated_by CHAR(36) NULL,
      notice_id CHAR(36) NULL,
      campaign_id CHAR(36) NULL,
      counted_against_quota TINYINT(1) NOT NULL DEFAULT 0,
      reason TEXT NULL,
      meta_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_email_audit_date (quota_date),
      KEY idx_email_audit_date_type (quota_date, email_type),
      KEY idx_email_audit_date_status (quota_date, status),
      KEY idx_email_audit_recipient (recipient_email),
      KEY idx_email_audit_campaign (campaign_id),
      CONSTRAINT fk_email_audit_recipient_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_email_audit_initiated_by FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensureEmailGovernanceTables };

