const express = require("express");
const { getOrCreatePool } = require("../db/pool");

const router = express.Router();

function toInt(v, fallback) {
  const n = v === undefined || v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ----------------------------
// Notices
// ----------------------------

// GET /api/public/notices/top
router.get("/notices/top", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const [rows] = await pool.query(
      `SELECT id, title, summary, urgent
       FROM notices
       WHERE published = true AND show_top_bar = true
       ORDER BY urgent DESC, pinned DESC, created_at DESC
       LIMIT 1`
    );

    return res.status(200).json((rows || [])[0] || null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load top notice" });
  }
});

// GET /api/public/notices?limit=10
router.get("/notices", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const limit = toInt(req.query.limit, 10);

    const [rows] = await pool.query(
      `SELECT
          id,
          title,
          content,
          summary,
          notice_type,
          urgent,
          pinned,
          show_top_bar,
          audience,
          expiry_date,
          external_link,
          linked_document_id,
          attachment_url,
          attachment_type,
          image_url,
          created_at
        FROM notices
        WHERE published = true
        ORDER BY pinned DESC, urgent DESC, created_at DESC
        LIMIT ?`,
      [limit]
    );

    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load notices" });
  }
});

// GET /api/public/notices/:id
router.get("/notices/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const [rows] = await pool.query(
      `SELECT
        id,
        title,
        content,
        summary,
        notice_type,
        urgent,
        pinned,
        show_top_bar,
        audience,
        expiry_date,
        external_link,
        linked_document_id,
        attachment_url,
        attachment_type,
        image_url,
        created_at,
        updated_at
      FROM notices
      WHERE published = true AND id = ?
      LIMIT 1`,
      [req.params.id]
    );

    return res.status(200).json((rows || [])[0] || null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load notice" });
  }
});

// ----------------------------
// Events
// ----------------------------

// GET /api/public/events?limit=10
router.get("/events", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const limit = toInt(req.query.limit, 10);
    const status = req.query.status ? String(req.query.status) : "published";

    const [rows] = await pool.query(
      `SELECT
          id,
          title,
          description,
          event_date,
          start_time,
          end_time,
          location,
          online_link,
          form_link,
          banner_url,
          status,
          published,
          created_at,
          updated_at
        FROM events
        WHERE status = ?
        ORDER BY event_date ASC, start_time ASC
        LIMIT ?`,
      [status, limit]
    );

    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load events" });
  }
});

// GET /api/public/events/:id
router.get("/events/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const [rows] = await pool.query(
      `SELECT
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        location,
        online_link,
        form_link,
        banner_url,
        status,
        published,
        created_at,
        updated_at
      FROM events
      WHERE status = 'published' AND id = ?
      LIMIT 1`,
      [req.params.id]
    );

    return res.status(200).json((rows || [])[0] || null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load event" });
  }
});

module.exports = router;

