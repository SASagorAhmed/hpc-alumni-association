const { getOrCreatePool } = require("../db/pool");

/**
 * Adds committee_posts.board_section when missing (older DBs before migration).
 * Safe to call repeatedly; no-op if column or table is absent.
 */
async function ensureCommitteePostsBoardSectionColumn(pool) {
  const p = pool || getOrCreatePool();
  if (!p) return;

  const [tables] = await p.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'committee_posts'`
  );
  if (!Number(tables?.[0]?.c)) return;

  const [cols] = await p.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'committee_posts'
       AND COLUMN_NAME = 'board_section'`
  );
  if (Number(cols?.[0]?.c) > 0) return;

  try {
    await p.query(
      `ALTER TABLE \`committee_posts\` ADD COLUMN \`board_section\` VARCHAR(40) NULL AFTER \`display_order\``
    );
    console.log("[committee] Added column committee_posts.board_section");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") return;
    if (String(e.message || "").toLowerCase().includes("duplicate column")) return;
    throw e;
  }
}

module.exports = { ensureCommitteePostsBoardSectionColumn };
