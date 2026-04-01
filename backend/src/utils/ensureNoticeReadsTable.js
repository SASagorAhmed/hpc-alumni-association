/**
 * Ensures the notice_reads table exists (idempotent).
 * Tracks which notices a given user has already read — used for bell badge counts.
 */
async function ensureNoticeReadsTable(pool) {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`notice_reads\` (
      \`id\`        CHAR(36)  NOT NULL,
      \`notice_id\` CHAR(36)  NOT NULL,
      \`user_id\`   CHAR(36)  NOT NULL,
      \`read_at\`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`notice_reads_notice_user_uq\` (\`notice_id\`, \`user_id\`),
      KEY \`notice_reads_user_idx\` (\`user_id\`),
      CONSTRAINT \`notice_reads_notice_fk\`
        FOREIGN KEY (\`notice_id\`) REFERENCES \`notices\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`notice_reads_user_fk\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}

module.exports = { ensureNoticeReadsTable };
