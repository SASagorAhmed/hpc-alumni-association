/**
 * Creates email_otp_challenges if missing (email OTP verification flow).
 */
async function ensureEmailOtpChallengesTable(pool) {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_otp_challenges (
      id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      email VARCHAR(255) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      attempt_count INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY email_otp_challenges_user_email_idx (user_id, email, used_at),
      KEY email_otp_challenges_email_idx (email),
      KEY email_otp_challenges_expires_idx (expires_at),
      CONSTRAINT email_otp_challenges_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}

module.exports = { ensureEmailOtpChallengesTable };
