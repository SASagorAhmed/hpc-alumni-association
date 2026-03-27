const { getOrCreatePool } = require("../db/pool");

/**
 * One-time style fix: legacy seeded titles used "সেক্রেটারি"; canonical is "মহাসচিব".
 * Idempotent UPDATEs — safe on every startup; no-op when already renamed.
 */
async function renameCommitteeSecretaryPostTitles(pool) {
  const p = pool || getOrCreatePool();
  if (!p) return;

  const [tables] = await p.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'committee_posts'`
  );
  if (!Number(tables?.[0]?.c)) return;

  const pairs = [
    ["সেক্রেটারি", "মহাসচিব"],
    ["সাধারণ সম্পাদক / সেক্রেটারি", "সাধারণ সম্পাদক / মহাসচিব"],
  ];

  let total = 0;
  for (const [fromTitle, toTitle] of pairs) {
    const [r] = await p.query("UPDATE committee_posts SET title = ? WHERE title = ?", [toTitle, fromTitle]);
    total += Number(r?.affectedRows) || 0;
  }

  if (total > 0) {
    console.log(`[committee] Renamed legacy secretary committee post title(s) to মহাসচিব (${total} row(s))`);
  }
}

module.exports = { renameCommitteeSecretaryPostTitles };
