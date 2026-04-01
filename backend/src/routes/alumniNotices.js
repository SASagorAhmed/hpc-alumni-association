const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getOrCreatePool } = require("../db/pool");
const { requireAuth } = require("../auth/jwt");
const { ensureNoticeReadsTable } = require("../utils/ensureNoticeReadsTable");

const router = express.Router();

/**
 * Audience clause for alumni: show everything EXCEPT admin-only notices.
 * Handles nulls, empty strings, and any non-admin value.
 */
function alumniAudienceClause() {
  return `(
    audience IS NULL
    OR TRIM(audience) = ''
    OR LOWER(TRIM(audience)) != 'admin'
  )`;
}

function noticeExpiryClause() {
  return `(expiry_date IS NULL OR expiry_date > NOW())`;
}

/** Silently ensure the notice_reads table exists without aborting the request on failure. */
async function safeEnsureReadsTable(pool) {
  try {
    await ensureNoticeReadsTable(pool);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * GET /api/alumni/notices
 * Returns published, non-expired, non-admin-only notices.
 * Each row includes `is_read` (0/1) based on notice_reads for the current user.
 * Query params:
 *   limit  — default 200 (full list)  |  pass limit=10 for notification bell
 */
router.get("/notices", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const userId = req.auth.userId;
    const limit = Math.min(parseInt(req.query.limit || "200", 10) || 200, 500);
    const readsReady = await safeEnsureReadsTable(pool);

    let rows;
    if (readsReady) {
      [rows] = await pool.query(
        `SELECT
            n.id, n.title, n.content, n.summary, n.notice_type,
            n.urgent, n.pinned, n.show_top_bar, n.audience,
            n.expiry_date, n.external_link, n.linked_document_id,
            n.attachment_url, n.attachment_type, n.image_url,
            n.created_at, n.updated_at,
            CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END AS is_read
          FROM notices n
          LEFT JOIN notice_reads nr ON nr.notice_id = n.id AND nr.user_id = ?
          WHERE n.published = 1
            AND ${noticeExpiryClause()}
            AND ${alumniAudienceClause()}
          ORDER BY n.pinned DESC, n.urgent DESC, n.created_at DESC
          LIMIT ?`,
        [userId, limit]
      );
    } else {
      // notice_reads table unavailable — return notices without is_read (all unread)
      [rows] = await pool.query(
        `SELECT
            id, title, content, summary, notice_type,
            urgent, pinned, show_top_bar, audience,
            expiry_date, external_link, linked_document_id,
            attachment_url, attachment_type, image_url,
            created_at, updated_at, 0 AS is_read
          FROM notices
          WHERE published = 1
            AND ${noticeExpiryClause()}
            AND ${alumniAudienceClause()}
          ORDER BY pinned DESC, urgent DESC, created_at DESC
          LIMIT ?`,
        [limit]
      );
    }

    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load notices" });
  }
});

/**
 * GET /api/alumni/notices/unread-count
 * Fast count of unread notices for the bell badge (no full payload).
 */
router.get("/notices/unread-count", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const userId = req.auth.userId;
    const readsReady = await safeEnsureReadsTable(pool);

    let unread = 0;
    if (readsReady) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS unread
          FROM notices n
          LEFT JOIN notice_reads nr ON nr.notice_id = n.id AND nr.user_id = ?
          WHERE n.published = 1
            AND ${noticeExpiryClause()}
            AND ${alumniAudienceClause()}
            AND nr.id IS NULL`,
        [userId]
      );
      unread = Number(rows?.[0]?.unread ?? 0);
    } else {
      // If reads table unavailable, count all visible notices as "unread"
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt
          FROM notices
          WHERE published = 1
            AND ${noticeExpiryClause()}
            AND ${alumniAudienceClause()}`
      );
      unread = Number(rows?.[0]?.cnt ?? 0);
    }

    return res.status(200).json({ unread });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to count unread" });
  }
});

/**
 * GET /api/alumni/notices/:id
 * Single notice detail — only if published, not expired, non-admin audience.
 */
router.get("/notices/:id", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const userId = req.auth.userId;
    const readsReady = await safeEnsureReadsTable(pool);

    let rows;
    if (readsReady) {
      [rows] = await pool.query(
        `SELECT
            n.id, n.title, n.content, n.summary, n.notice_type,
            n.urgent, n.pinned, n.show_top_bar, n.audience,
            n.expiry_date, n.external_link, n.linked_document_id,
            n.attachment_url, n.attachment_type, n.image_url,
            n.created_at, n.updated_at,
            CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END AS is_read
          FROM notices n
          LEFT JOIN notice_reads nr ON nr.notice_id = n.id AND nr.user_id = ?
          WHERE n.published = 1 AND n.id = ?
            AND ${noticeExpiryClause()}
            AND ${alumniAudienceClause()}
          LIMIT 1`,
        [userId, req.params.id]
      );
    } else {
      [rows] = await pool.query(
        `SELECT
            id, title, content, summary, notice_type,
            urgent, pinned, show_top_bar, audience,
            expiry_date, external_link, linked_document_id,
            attachment_url, attachment_type, image_url,
            created_at, updated_at, 0 AS is_read
          FROM notices
          WHERE published = 1 AND id = ?
            AND ${noticeExpiryClause()}
            AND ${alumniAudienceClause()}
          LIMIT 1`,
        [req.params.id]
      );
    }

    return res.status(200).json((rows || [])[0] || null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load notice" });
  }
});

/**
 * POST /api/alumni/notices/:id/read
 * Mark a notice as read for the current user (INSERT IGNORE).
 */
router.post("/notices/:id/read", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const readsReady = await safeEnsureReadsTable(pool);
    if (!readsReady) return res.status(200).json({ ok: true }); // best effort

    const userId = req.auth.userId;
    const noticeId = req.params.id;

    await pool.query(
      `INSERT IGNORE INTO notice_reads (id, notice_id, user_id) VALUES (?, ?, ?)`,
      [uuidv4(), noticeId, userId]
    );

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true }); // never fail a read-mark
  }
});

/**
 * POST /api/alumni/notices/read-all
 * Mark all current visible notices as read for the user.
 */
router.post("/notices/read-all", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const readsReady = await safeEnsureReadsTable(pool);
    if (!readsReady) return res.status(200).json({ ok: true, marked: 0 });

    const userId = req.auth.userId;

    const [unread] = await pool.query(
      `SELECT n.id
        FROM notices n
        LEFT JOIN notice_reads nr ON nr.notice_id = n.id AND nr.user_id = ?
        WHERE n.published = 1
          AND ${noticeExpiryClause()}
          AND ${alumniAudienceClause()}
          AND nr.id IS NULL`,
      [userId]
    );

    if (unread?.length) {
      const values = unread.map((r) => [uuidv4(), r.id, userId]);
      await pool.query(
        `INSERT IGNORE INTO notice_reads (id, notice_id, user_id) VALUES ?`,
        [values]
      );
    }

    return res.status(200).json({ ok: true, marked: unread?.length ?? 0 });
  } catch (e) {
    return res.status(200).json({ ok: true, marked: 0 }); // never fail
  }
});

module.exports = router;
