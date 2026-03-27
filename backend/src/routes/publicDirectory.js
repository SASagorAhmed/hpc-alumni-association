const express = require("express");
const { getOrCreatePool } = require("../db/pool");

const router = express.Router();

async function ensureProfileFacultyColumn(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN faculty VARCHAR(32) NULL AFTER department");
  } catch (e) {
    const msg = String(e?.message || "");
    const code = e?.code ?? e?.errno;
    if (String(code) === "1060" || msg.toLowerCase().includes("duplicate column")) return;
    console.error("[publicDirectory] ensure profile faculty column:", msg.slice(0, 200));
  }
}

// GET /api/public/directory/alumni
// Visibility rules:
// - verified = true OR approved = true (some deployments only set `verified`)
// - blocked is false (or NULL)
router.get("/directory/alumni", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    await ensureProfileFacultyColumn(pool);

    const [rows] = await pool.query(
      `SELECT
        id,
        name,
        photo,
        batch,
        roll,
        gender,
        blood_group,
        department,
        faculty,
        university,
        job_status,
        job_title,
        company,
        phone,
        address,
        bio,
        additional_info,
        profession,
        session,
        passing_year,
        college_name,
        registration_number,
        created_at,
        social_links
      FROM profiles
      WHERE (verified = true OR approved = true)
        AND (blocked = false OR blocked IS NULL)
      ORDER BY name ASC`
    );

    const normalized = (rows || []).map((r) => {
      if (typeof r.social_links === "string") {
        try {
          return { ...r, social_links: JSON.parse(r.social_links) };
        } catch (_e) {
          return r;
        }
      }
      return r;
    });

    return res.status(200).json(normalized);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load directory" });
  }
});

module.exports = router;

