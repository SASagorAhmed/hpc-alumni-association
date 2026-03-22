const express = require("express");
const { getOrCreatePool } = require("../db/pool");

const router = express.Router();

// GET /api/public/landing-content
router.get("/landing-content", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const [rows] = await pool.query(`SELECT section_key, content FROM landing_content`);
    const map = {};
    (rows || []).forEach((r) => {
      if (typeof r.content === "string") {
        try {
          map[r.section_key] = JSON.parse(r.content);
          return;
        } catch (_e) {
          map[r.section_key] = r.content;
          return;
        }
      }
      map[r.section_key] = r.content;
    });

    return res.status(200).json(map);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load landing content" });
  }
});

module.exports = router;

