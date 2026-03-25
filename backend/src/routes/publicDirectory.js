const express = require("express");
const { getOrCreatePool } = require("../db/pool");

const router = express.Router();

// GET /api/public/directory/alumni
// Visibility rules:
// - verified = true OR approved = true (some deployments only set `verified`)
// - blocked is false (or NULL)
router.get("/directory/alumni", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

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

