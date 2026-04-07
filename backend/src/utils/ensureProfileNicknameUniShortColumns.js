/**
 * Adds `profiles.nickname` and `profiles.university_short_name` when missing.
 * Nickname is the locked display name (set at registration, same as full name).
 * University short name is required at registration but editable later.
 */
async function ensureProfileNicknameUniShortColumns(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN nickname VARCHAR(200) NULL AFTER name");
  } catch (e) {
    const msg = String(e?.message || "");
    const code = e?.code ?? e?.errno;
    if (String(code) !== "1060" && !msg.toLowerCase().includes("duplicate column")) {
      console.error("[profiles] ensure nickname column:", msg.slice(0, 200));
    }
  }
  try {
    await pool.query(
      "ALTER TABLE profiles ADD COLUMN university_short_name VARCHAR(100) NULL AFTER university"
    );
  } catch (e) {
    const msg = String(e?.message || "");
    const code = e?.code ?? e?.errno;
    if (String(code) !== "1060" && !msg.toLowerCase().includes("duplicate column")) {
      console.error("[profiles] ensure university_short_name column:", msg.slice(0, 200));
    }
  }
  try {
    await pool.query(
      `UPDATE profiles SET nickname = TRIM(name) WHERE (nickname IS NULL OR nickname = '') AND name IS NOT NULL AND TRIM(name) <> ''`
    );
  } catch (e) {
    console.error("[profiles] backfill nickname:", String(e?.message || e).slice(0, 200));
  }
}

module.exports = { ensureProfileNicknameUniShortColumns };
