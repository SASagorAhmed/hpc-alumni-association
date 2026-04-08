const express = require("express");
const { getOrCreatePool } = require("../db/pool");
const { ensureAchievementSettingsRow } = require("../utils/achievementSettings");
const { sanitizeCommitteeMemberForPublic } = require("../utils/publicCommitteeSanitize");
const { ensurePublicWishingMessage } = require("../utils/committeeDefaultWishing");

const router = express.Router();

async function loadStructuredCommittee(pool, termId = null) {
  let term;
  if (termId) {
    const [trows] = await pool.query("SELECT * FROM committee_terms WHERE id = ? LIMIT 1", [termId]);
    term = trows?.[0];
    if (!term || term.status !== "published") return null;
  } else {
    let [rows] = await pool.query(
      `SELECT * FROM committee_terms WHERE status = 'published' AND is_current = 1 LIMIT 1`
    );
    if (!rows?.length) {
      [rows] = await pool.query(
        `SELECT * FROM committee_terms WHERE status = 'published' ORDER BY updated_at DESC LIMIT 1`
      );
    }
    term = rows?.[0];
    if (!term) return null;
  }

  const [posts] = await pool.query(
    `SELECT * FROM committee_posts WHERE term_id = ? ORDER BY display_order ASC`,
    [term.id]
  );
  const [members] = await pool.query(
    `SELECT * FROM committee_members
     WHERE term_id = ? AND is_active = 1
     ORDER BY display_order ASC`,
    [term.id]
  );
  const postsWith = posts.map((p) => ({
    ...p,
    members: members
      .filter((m) => m.post_id === p.id)
      .map((m) => {
        const base = sanitizeCommitteeMemberForPublic(m);
        const wishing = ensurePublicWishingMessage(base, p.title, p.board_section);
        return { ...base, wishing_message: wishing };
      }),
  }));
  return { term, posts: postsWith };
}

/** Published committee for alumni UI (structured by term → posts → members) */
router.get("/committee/active", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    try {
      const data = await loadStructuredCommittee(pool);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(200).json(null);
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load committee" });
  }
});

/** Historical / list: published terms only */
router.get("/committee/terms", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query(
      `SELECT id, name, description, is_current, created_at, updated_at
       FROM committee_terms WHERE status = 'published'
       ORDER BY is_current DESC, updated_at DESC`
    );
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to list terms" });
  }
});

router.get("/committee/terms/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const data = await loadStructuredCommittee(pool, req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: "Not found" });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load term" });
  }
});

router.get("/committee-members", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const activeOnly = String(req.query.active || "").toLowerCase() === "true";
    const [rows] = await pool.query(
      `SELECT id, term_id, post_id, name, designation, category, batch, alumni_id, candidate_number,
              college_name, institution, job_status, profession, about, wishing_message, winner_about,
              photo_url, display_order, is_active, created_at, updated_at
       FROM committee_members
       ${activeOnly ? "WHERE is_active = true" : ""}
       ORDER BY category ASC, display_order ASC`
    );
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load committee members" });
  }
});

router.get("/committee-members/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query(
      `SELECT id, term_id, post_id, name, designation, category, batch, alumni_id, candidate_number,
              college_name, institution, job_status, profession, about, wishing_message, winner_about,
              photo_url, display_order, is_active, created_at, updated_at
       FROM committee_members WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    return res.status(200).json(rows?.[0] || null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load member" });
  }
});

router.get("/achievement-settings", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query("SELECT * FROM achievement_settings LIMIT 1");
    return res.status(200).json(rows?.[0] || null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load settings" });
  }
});

/** Omit location from public payloads (privacy). */
function achievementForPublic(row) {
  if (!row || typeof row !== "object") return row;
  const { location: _loc, ...rest } = row;
  return rest;
}

router.get("/achievements", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const activeOnly = String(req.query.active || "").toLowerCase() === "true";
    const [rows] = await pool.query(
      `SELECT * FROM achievements
       ${activeOnly ? "WHERE IFNULL(is_active, 1) = 1" : ""}
       ORDER BY is_pinned DESC, display_order ASC`
    );
    const list = (rows || []).map(achievementForPublic);
    return res.status(200).json(list);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load achievements" });
  }
});

router.get("/achievements/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query(
      "SELECT * FROM achievements WHERE id = ? AND IFNULL(is_active, 1) = 1 LIMIT 1",
      [req.params.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Achievement not found" });
    }
    return res.status(200).json(achievementForPublic(rows[0]));
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load achievement" });
  }
});

router.get("/memories", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const publishedOnly = String(req.query.published || "").toLowerCase() === "true";
    const [rows] = await pool.query(
      `SELECT * FROM memories
       ${publishedOnly ? "WHERE published = true" : ""}
       ORDER BY display_order ASC, created_at DESC`
    );
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load memories" });
  }
});

router.get("/memories/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query(
      "SELECT * FROM memories WHERE id = ? AND published = true LIMIT 1",
      [req.params.id]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ ok: false, error: "Memory not found" });
    return res.status(200).json(rows[0]);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load memory" });
  }
});

router.get("/members/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query("SELECT * FROM committee_members WHERE id = ? LIMIT 1", [req.params.id]);
    return res.status(200).json(rows?.[0] || null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load member detail" });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query(
      `SELECT id, title, description, category, file_url, file_name, file_type, file_size, visibility, published, pinned, uploaded_by, created_at, updated_at
       FROM documents
       WHERE published = true
       ORDER BY pinned DESC, created_at DESC`
    );
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load documents" });
  }
});

router.get("/elections", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query("SELECT * FROM elections ORDER BY created_at DESC");
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load elections" });
  }
});

router.get("/elections/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query("SELECT * FROM elections WHERE id = ? LIMIT 1", [req.params.id]);
    return res.status(200).json(rows?.[0] || null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load election" });
  }
});

router.get("/elections/:id/posts", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query("SELECT * FROM election_posts WHERE election_id = ? ORDER BY display_order ASC", [req.params.id]);
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load election posts" });
  }
});

/**
 * GET /api/public/committee/member/:id
 * Public fields always returned. Sensitive fields (phone, email, social links,
 * location, expertise) only returned when the requester is a logged-in + admin-verified user.
 */
router.get("/committee/member/:id", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const [rows] = await pool.query(
      `SELECT cm.*, ct.name AS term_name, cp.title AS post_title, cp.board_section AS board_section
       FROM committee_members cm
       LEFT JOIN committee_terms ct ON ct.id = cm.term_id
       LEFT JOIN committee_posts cp ON cp.id = cm.post_id
       WHERE cm.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows || rows.length === 0)
      return res.status(404).json({ ok: false, error: "Member not found" });

    const m = rows[0];

    // Check if requester is an admin-verified user (profiles.verified)
    let isVerified = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const { verifyJwt } = require("../auth/jwt");
        const payload = verifyJwt(authHeader.split(" ")[1]);
        const userId = payload.sub;
        // profiles primary key is user id (see auth.js uses `WHERE id = ?`)
        const [pRows] = await pool.query(
          "SELECT verified FROM profiles WHERE id = ? LIMIT 1",
          [userId]
        );
        isVerified = pRows?.[0]?.verified === 1 || pRows?.[0]?.verified === true;
      } catch (_) {
        // Invalid token — treat as unauthenticated
      }
    }

    const wishingResolved = ensurePublicWishingMessage(
      { name: m.name, wishing_message: m.wishing_message },
      m.post_title,
      m.board_section
    );

    // Always public
    const publicData = {
      id: m.id,
      name: m.name,
      designation: m.designation,
      category: m.category,
      batch: m.batch,
      alumni_id: m.alumni_id,
      college_name: m.college_name,
      institution: m.institution,
      job_status: m.job_status,
      profession: m.profession,
      about: m.about,
      wishing_message: wishingResolved,
      winner_about: m.winner_about,
      photo_url: m.photo_url,
      display_order: m.display_order,
      term_name: m.term_name,
      post_title: m.post_title,
      board_section: m.board_section ?? null,
    };

    // Only for admin-verified users
    const sensitiveData = isVerified
      ? {
          phone: m.phone,
          email: m.email,
          location: m.location,
          expertise: m.expertise,
          facebook_url: m.facebook_url,
          instagram_url: m.instagram_url,
          linkedin_url: m.linkedin_url,
        }
      : {};

    // Keep response key name for frontend compatibility
    return res.status(200).json({ ...publicData, ...sensitiveData, isApproved: isVerified });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load member" });
  }
});

router.get("/elections/:id/candidates", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query("SELECT * FROM candidates WHERE election_id = ? ORDER BY candidate_number ASC, created_at ASC", [req.params.id]);
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load candidates" });
  }
});

router.get("/elections/:id/votes", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query(
      "SELECT id, election_id, post_id, candidate_id, created_at FROM votes WHERE election_id = ?",
      [req.params.id]
    );
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load votes" });
  }
});

router.get("/elections/:id/winners", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query("SELECT * FROM election_winners WHERE election_id = ?", [req.params.id]);
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load winners" });
  }
});

module.exports = router;

