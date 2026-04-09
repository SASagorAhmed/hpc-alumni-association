/**
 * Ensure notice email text template table exists.
 */
async function ensureNoticeEmailTemplateTable(pool) {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notice_email_template_config (
      id TINYINT NOT NULL DEFAULT 1,
      urgent_template_json JSON NOT NULL,
      normal_template_json JSON NOT NULL,
      updated_by CHAR(36) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_notice_email_template_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensureNoticeEmailTemplateTable };
