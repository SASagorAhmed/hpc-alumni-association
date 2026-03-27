/**
 * Creates password_reset_tokens if missing (forgot-password flow).
 */
async function ensurePasswordResetTokensTable(pool) {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY password_reset_tokens_token_unique (token),
      KEY password_reset_tokens_user_id_idx (user_id),
      CONSTRAINT password_reset_tokens_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}

module.exports = { ensurePasswordResetTokensTable };
