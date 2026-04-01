/** Adds `profiles.birthday` when missing (migration on first use). */
async function ensureProfileBirthdayColumn(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN `birthday` DATE NULL AFTER `blood_group`");
  } catch (e) {
    const msg = String(e?.message || "");
    const code = e?.code ?? e?.errno;
    if (String(code) === "1060" || msg.toLowerCase().includes("duplicate column")) return;
    console.error("[profiles] ensure birthday column:", msg.slice(0, 200));
  }
}

module.exports = { ensureProfileBirthdayColumn };
