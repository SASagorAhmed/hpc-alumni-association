/**
 * Stores self-service profile field changes for admins (who / when / what).
 */
async function ensureProfileEditAuditTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_edit_audit (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      profile_id CHAR(36) NOT NULL,
      edited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      field_key VARCHAR(64) NOT NULL,
      old_value TEXT NULL,
      new_value TEXT NULL,
      PRIMARY KEY (id),
      KEY idx_profile_edit_audit_profile_time (profile_id, edited_at),
      CONSTRAINT profile_edit_audit_profile_fk
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensureProfileEditAuditTable };
