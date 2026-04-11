const { ensureProfileBirthdayColumn } = require("./ensureProfileBirthdayColumn");
const { ensureProfileNicknameUniShortColumns } = require("./ensureProfileNicknameUniShortColumns");
const { ensureProfileEditAuditTable } = require("./ensureProfileEditAuditTable");

async function ensureProfileReviewNoteColumn(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN profile_review_note TEXT NULL");
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (!/Duplicate column name/i.test(msg)) throw e;
  }
}

async function ensureProfileDirectoryVisibleColumn(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN directory_visible TINYINT(1) NOT NULL DEFAULT 1");
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (!/Duplicate column name/i.test(msg)) throw e;
  }
}

async function ensureAdminUserPerfIndexes(pool) {
  const indexStatements = [
    "CREATE INDEX idx_user_roles_user_role ON user_roles (user_id, role)",
    "CREATE INDEX idx_profiles_created_at ON profiles (created_at)",
  ];
  for (const sql of indexStatements) {
    try {
      await pool.query(sql);
    } catch (err) {
      const msg = String(err?.message || err);
      if (!/Duplicate key name|already exists/i.test(msg)) throw err;
    }
  }
}

async function ensureAdminUserManagementReady(pool) {
  if (!pool) return;
  await ensureProfileReviewNoteColumn(pool);
  await ensureProfileDirectoryVisibleColumn(pool);
  await ensureProfileBirthdayColumn(pool);
  await ensureProfileNicknameUniShortColumns(pool);
  await ensureProfileEditAuditTable(pool);
  await ensureAdminUserPerfIndexes(pool);
}

module.exports = { ensureAdminUserManagementReady };

