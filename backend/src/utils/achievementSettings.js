const { v4: uuidv4 } = require("uuid");

/**
 * Ensure a single achievement_settings row exists (banner defaults on).
 */
async function ensureAchievementSettingsRow(pool) {
  const [rows] = await pool.query("SELECT * FROM achievement_settings LIMIT 1");
  if (rows?.[0]) return rows[0];
  const id = uuidv4();
  await pool.query("INSERT INTO achievement_settings SET ?", {
    id,
    banner_enabled: 1,
    slide_duration: 4,
    max_display_count: null,
  });
  const [again] = await pool.query("SELECT * FROM achievement_settings WHERE id = ?", [id]);
  return again[0];
}

module.exports = { ensureAchievementSettingsRow };
