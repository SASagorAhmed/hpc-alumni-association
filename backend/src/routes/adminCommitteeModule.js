const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getOrCreatePool } = require("../db/pool");
const { requireAuth } = require("../auth/jwt");
const { DEFAULT_COMMITTEE_POSTS } = require("../constants/committeeDefaults");
const { inferBoardSectionFromTitle } = require("../utils/inferCommitteeBoardSection");
const { ensureCommitteePostsBoardSectionColumn } = require("../utils/ensureCommitteePostsBoardSection");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

const ALLOWED_BOARD_SECTIONS = new Set([
  "governing_body",
  "executive_committee",
  "committee_heads",
  "committee_members",
]);

function normalizeBoardSection(value) {
  const s = value != null ? String(value).trim() : "";
  if (ALLOWED_BOARD_SECTIONS.has(s)) return s;
  return "committee_members";
}

function extractCloudinaryPublicIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const clean = url.split("?")[0];
  // Example:
  // https://res.cloudinary.com/<cloud>/image/upload/v1712345678/<folder>/<publicId>.<ext>
  const m = clean.match(/\/upload\/v\d+\/(.+?)\.[a-zA-Z0-9]+$/);
  return m?.[1] || null;
}

async function requireAdmin(pool, userId) {
  const [rows] = await pool.query(
    "SELECT id FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
    [userId]
  );
  return (rows || []).length > 0;
}

async function withAdmin(req, res) {
  const pool = getOrCreatePool();
  if (!pool) {
    res.status(503).json({ ok: false, error: "MySQL not configured" });
    return null;
  }
  const ok = await requireAdmin(pool, req.auth.userId);
  if (!ok) {
    res.status(403).json({ ok: false, error: "Admin only" });
    return null;
  }
  return pool;
}

async function withAdminAndBoardSection(req, res) {
  const pool = await withAdmin(req, res);
  if (!pool) return null;
  await ensureCommitteePostsBoardSectionColumn(pool);
  return pool;
}

// ---------- Terms ----------
router.get("/committee/terms", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query(
      "SELECT * FROM committee_terms ORDER BY created_at DESC"
    );
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load terms" });
  }
});

router.post("/committee/terms", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "Term name is required" });
    const description = req.body?.description != null ? String(req.body.description) : null;
    const status = req.body?.status === "published" ? "published" : "draft";
    const id = uuidv4();
    await pool.query(
      `INSERT INTO committee_terms (id, name, description, status, is_current) VALUES (?, ?, ?, ?, 0)`,
      [id, name, description, status]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create term" });
  }
});

router.put("/committee/terms/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const allowed = ["name", "description", "status"];
    const updates = [];
    const vals = [];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) {
        updates.push(`\`${k}\` = ?`);
        let v = req.body[k];
        if (k === "status" && v !== "draft" && v !== "published") {
          return res.status(400).json({ ok: false, error: "Invalid status" });
        }
        vals.push(v);
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "is_current")) {
      if (req.body.is_current) {
        await pool.query("UPDATE committee_terms SET is_current = 0");
        updates.push("`is_current` = ?");
        vals.push(1);
      } else {
        updates.push("`is_current` = ?");
        vals.push(0);
      }
    }
    if (!updates.length) return res.status(400).json({ ok: false, error: "Nothing to update" });
    vals.push(req.params.id);
    await pool.query(`UPDATE committee_terms SET ${updates.join(", ")} WHERE id = ?`, vals);

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update term" });
  }
});

router.delete("/committee/terms/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM committee_terms WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete term" });
  }
});

router.post("/committee/terms/:id/seed-default-posts", requireAuth, async (req, res) => {
  try {
    const pool = await withAdminAndBoardSection(req, res);
    if (!pool) return;
    const termId = req.params.id;
    const [[{ c }]] = await pool.query(
      "SELECT COUNT(*) AS c FROM committee_posts WHERE term_id = ?",
      [termId]
    );
    if (Number(c) > 0) {
      return res.status(409).json({
        ok: false,
        error: "This term already has posts. Delete posts first to re-seed, or add posts manually.",
      });
    }
    let order = 0;
    for (const row of DEFAULT_COMMITTEE_POSTS) {
      const pid = uuidv4();
      await pool.query(
        `INSERT INTO committee_posts (id, term_id, title, allows_multiple, is_highlight, display_order, board_section)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          pid,
          termId,
          row.title,
          row.allows_multiple ? 1 : 0,
          row.is_highlight ? 1 : 0,
          order++,
          normalizeBoardSection(row.board_section),
        ]
      );
    }
    res.status(201).json({ ok: true, count: DEFAULT_COMMITTEE_POSTS.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to seed posts" });
  }
});

/** Set board_section on all posts of a term from each post title (legacy / migration helper). */
router.post("/committee/terms/:id/backfill-board-sections", requireAuth, async (req, res) => {
  try {
    const pool = await withAdminAndBoardSection(req, res);
    if (!pool) return;
    const termId = req.params.id;
    const [posts] = await pool.query(
      "SELECT id, title FROM committee_posts WHERE term_id = ? ORDER BY display_order ASC",
      [termId]
    );
    const list = posts || [];
    for (const p of list) {
      const section = inferBoardSectionFromTitle(p.title);
      await pool.query("UPDATE committee_posts SET board_section = ? WHERE id = ?", [section, p.id]);
    }
    res.status(200).json({ ok: true, updated: list.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to backfill sections" });
  }
});

router.post("/committee/terms/:id/publish", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const termId = req.params.id;
    const setCurrent = Boolean(req.body?.setAsCurrent);
    await pool.query("UPDATE committee_terms SET status = 'published' WHERE id = ?", [termId]);
    if (setCurrent) {
      await pool.query("UPDATE committee_terms SET is_current = 0");
      await pool.query("UPDATE committee_terms SET is_current = 1 WHERE id = ?", [termId]);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to publish" });
  }
});

// ---------- Posts ----------
router.post("/committee/posts", requireAuth, async (req, res) => {
  try {
    const pool = await withAdminAndBoardSection(req, res);
    if (!pool) return;
    const termId = String(req.body?.term_id || "");
    const title = String(req.body?.title || "").trim();
    if (!termId || !title) {
      return res.status(400).json({ ok: false, error: "term_id and title are required" });
    }
    const allowsMultiple = req.body?.allows_multiple !== false ? 1 : 0;
    const isHighlight = req.body?.is_highlight ? 1 : 0;
    const [[{ maxO }]] = await pool.query(
      "SELECT COALESCE(MAX(display_order), -1) + 1 AS maxO FROM committee_posts WHERE term_id = ?",
      [termId]
    );
    const displayOrder = Number(req.body?.display_order ?? maxO);
    const boardSection = normalizeBoardSection(req.body?.board_section);
    const id = uuidv4();
    await pool.query(
      `INSERT INTO committee_posts (id, term_id, title, allows_multiple, is_highlight, display_order, board_section)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, termId, title, allowsMultiple, isHighlight, displayOrder, boardSection]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create post" });
  }
});

router.put("/committee/posts/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdminAndBoardSection(req, res);
    if (!pool) return;
    const allowed = ["title", "allows_multiple", "is_highlight", "display_order", "board_section"];
    const updates = [];
    const vals = [];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) {
        updates.push(`\`${k}\` = ?`);
        let v = req.body[k];
        if (k === "allows_multiple" || k === "is_highlight") v = v ? 1 : 0;
        else if (k === "board_section") v = normalizeBoardSection(v);
        vals.push(v);
      }
    }
    if (!updates.length) return res.status(400).json({ ok: false, error: "Nothing to update" });
    vals.push(req.params.id);
    await pool.query(`UPDATE committee_posts SET ${updates.join(", ")} WHERE id = ?`, vals);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update post" });
  }
});

router.delete("/committee/posts/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM committee_posts WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete post" });
  }
});

router.put("/committee/posts-reorder", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const orders = req.body?.orders;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ ok: false, error: "orders array required" });
    }
    for (const row of orders) {
      if (!row?.id || row.display_order === undefined) continue;
      await pool.query("UPDATE committee_posts SET display_order = ? WHERE id = ?", [
        Number(row.display_order),
        row.id,
      ]);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to reorder" });
  }
});

// ---------- Members (structured) ----------
const MEMBER_FIELDS = [
  "name",
  "designation",
  "category",
  "batch",
  "alumni_id",
  "phone",
  "email",
  "candidate_number",
  "college_name",
  "institution",
  "job_status",
  "profession",
  "location",
  "expertise",
  "about",
  "wishing_message",
  "winner_about",
  "facebook_url",
  "instagram_url",
  "linkedin_url",
  "photo_url",
  "display_order",
  "is_active",
  "term_id",
  "post_id",
];

const FIXED_COLLEGE_NAME = "Hamdard Public Collage";

async function ensureCommitteeDropdownTables(pool) {
  // If the user hasn't applied `schema.sql` changes yet, these tables may be missing.
  // Create them on-demand to keep the admin dropdown UI functional.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profession_options (
      id CHAR(36) NOT NULL,
      value VARCHAR(200) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY profession_options_value_unique (value)
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_status_options (
      id CHAR(36) NOT NULL,
      value VARCHAR(200) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY job_status_options_value_unique (value)
    ) ENGINE=InnoDB
  `);

  const seeded = ["Student", "Job Holder", "Business", "Freelancer", "Unemployed"];
  for (const v of seeded) {
    await pool.query(
      `
        INSERT INTO job_status_options (id, value)
        SELECT UUID(), ?
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM job_status_options WHERE value = ? LIMIT 1
        )
      `,
      [v, v]
    );
  }
}

async function ensureCommitteeMemberColumns(pool) {
  // This keeps admin CRUD working even if `schema.sql` wasn't applied yet.
  const additions = [
    "ALTER TABLE committee_members ADD COLUMN facebook_url TEXT NULL",
    "ALTER TABLE committee_members ADD COLUMN instagram_url TEXT NULL",
    "ALTER TABLE committee_members ADD COLUMN linkedin_url TEXT NULL",
    "ALTER TABLE committee_members ADD COLUMN college_name TEXT NULL",
    "ALTER TABLE committee_members ADD COLUMN wishing_message TEXT NULL",
    "ALTER TABLE committee_members ADD COLUMN winner_about TEXT NULL",
  ];

  for (const stmt of additions) {
    try {
      await pool.query(stmt);
    } catch (e) {
      // Ignore “duplicate column” errors.
      const msg = String(e?.message || "");
      const code = e?.code ?? e?.errno;
      if (String(code) === "1060" || msg.toLowerCase().includes("duplicate column")) continue;
      // If someone disabled ALTER permission, we still want the app to fail loudly later.
      // However, we keep it non-fatal here for partial schema states.
      console.error("[admin][schema] ensure committee_members columns failed:", msg.slice(0, 200));
    }
  }
}

async function getCommitteeMemberColumnSet(pool) {
  const [rows] = await pool.query("SHOW COLUMNS FROM committee_members");
  return new Set((rows || []).map((r) => String(r.Field || "").toLowerCase()));
}

function pruneUnknownMemberColumns(obj, allowedColumnSet) {
  if (!obj || typeof obj !== "object") return obj;
  for (const k of Object.keys(obj)) {
    if (!allowedColumnSet.has(String(k).toLowerCase())) {
      delete obj[k];
    }
  }
  return obj;
}

function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** President / highlight post: 50 words. Other posts: 40 words. About winner: 250 words. */
async function getWishingMaxWordsForPost(pool, postId) {
  if (!postId) return 40;
  const [rows] = await pool.query(
    "SELECT is_highlight, title FROM committee_posts WHERE id = ? LIMIT 1",
    [postId]
  );
  const p = rows?.[0];
  if (!p) return 40;
  const title = String(p.title || "");
  const highlight = p.is_highlight === 1 || p.is_highlight === true;
  if (highlight || /সভাপতি|president/i.test(title)) return 50;
  return 40;
}

function assertMemberTextLimits(payload, wishingMessageMaxWords = 50) {
  const limits = { wishing_message: wishingMessageMaxWords, winner_about: 250 };
  for (const key of Object.keys(limits)) {
    if (!Object.prototype.hasOwnProperty.call(payload || {}, key)) continue;
    const val = payload?.[key];
    if (val == null || val === "") continue;
    const max = limits[key];
    if (wordCount(val) > max) {
      const err = new Error(`reduce word, max ${max}`);
      err.code = "MAX_WORDS";
      err.maxWords = max;
      throw err;
    }
  }
}

// ---------- Profession / Job Status Options ----------
// Used by the Admin committee member form dropdowns.
router.get("/committee/profession-options", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeDropdownTables(pool);
    const [rows] = await pool.query("SELECT id, value FROM profession_options ORDER BY value ASC");
    const [distinct] = await pool.query(
      "SELECT DISTINCT profession AS value FROM committee_members WHERE profession IS NOT NULL AND TRIM(profession) <> ''"
    );
    const persisted = new Map((rows || []).map((r) => [r.value, r.id]));
    const merged = (rows || []).map((r) => ({ id: r.id, value: r.value, persisted: true }));
    for (const d of distinct || []) {
      if (persisted.has(d.value)) continue;
      merged.push({ id: `seed-${d.value}`, value: d.value, persisted: false });
    }
    res.status(200).json(merged);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load profession options" });
  }
});

router.post("/committee/profession-options", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeDropdownTables(pool);
    const value = String(req.body?.value || "").trim();
    if (!value) return res.status(400).json({ ok: false, error: "value is required" });
    const id = uuidv4();
    await pool.query("INSERT INTO profession_options (id, value) VALUES (?, ?)", [id, value]);
    res.status(201).json({ ok: true, id, value });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create profession option" });
  }
});

router.put("/committee/profession-options/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeDropdownTables(pool);
    const value = String(req.body?.value || "").trim();
    if (!value) return res.status(400).json({ ok: false, error: "value is required" });
    await pool.query("UPDATE profession_options SET value = ? WHERE id = ?", [value, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update profession option" });
  }
});

router.delete("/committee/profession-options/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeDropdownTables(pool);
    await pool.query("DELETE FROM profession_options WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete profession option" });
  }
});

router.get("/committee/job-status-options", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeDropdownTables(pool);
    const [rows] = await pool.query("SELECT id, value FROM job_status_options ORDER BY value ASC");
    const [distinct] = await pool.query(
      "SELECT DISTINCT job_status AS value FROM committee_members WHERE job_status IS NOT NULL AND TRIM(job_status) <> ''"
    );
    const persisted = new Map((rows || []).map((r) => [r.value, r.id]));
    const merged = (rows || []).map((r) => ({ id: r.id, value: r.value, persisted: true }));
    for (const d of distinct || []) {
      if (persisted.has(d.value)) continue;
      merged.push({ id: `seed-${d.value}`, value: d.value, persisted: false });
    }
    res.status(200).json(merged);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load job status options" });
  }
});

router.post("/committee/job-status-options", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeDropdownTables(pool);
    const value = String(req.body?.value || "").trim();
    if (!value) return res.status(400).json({ ok: false, error: "value is required" });
    const id = uuidv4();
    await pool.query("INSERT INTO job_status_options (id, value) VALUES (?, ?)", [id, value]);
    res.status(201).json({ ok: true, id, value });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create job status option" });
  }
});

router.put("/committee/job-status-options/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeDropdownTables(pool);
    const value = String(req.body?.value || "").trim();
    if (!value) return res.status(400).json({ ok: false, error: "value is required" });
    await pool.query("UPDATE job_status_options SET value = ? WHERE id = ?", [value, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update job status option" });
  }
});

router.delete("/committee/job-status-options/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeDropdownTables(pool);
    await pool.query("DELETE FROM job_status_options WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete job status option" });
  }
});

async function assertPostAllowsAnotherMember(pool, postId, excludeMemberId = null) {
  const [posts] = await pool.query(
    "SELECT allows_multiple FROM committee_posts WHERE id = ? LIMIT 1",
    [postId]
  );
  const post = posts?.[0];
  if (!post) throw new Error("Post not found");
  if (post.allows_multiple) return;
  let sql = "SELECT COUNT(*) AS c FROM committee_members WHERE post_id = ? AND is_active = 1";
  const params = [postId];
  if (excludeMemberId) {
    sql += " AND id <> ?";
    params.push(excludeMemberId);
  }
  const [[{ c }]] = await pool.query(sql, params);
  if (Number(c) >= 1) {
    const err = new Error("This post only allows one active member. Remove or deactivate the existing member first.");
    err.code = "SINGLE_SEAT";
    throw err;
  }
}

router.post("/committee/members", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeMemberColumns(pool);
    const memberCols = await getCommitteeMemberColumnSet(pool);
    const termId = req.body?.term_id || null;
    const postId = req.body?.post_id || null;
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "Name is required" });
    if (!termId || !postId) {
      return res.status(400).json({ ok: false, error: "term_id and post_id are required" });
    }

    const [posts] = await pool.query(
      `SELECT cp.* FROM committee_posts cp JOIN committee_terms ct ON ct.id = cp.term_id WHERE cp.id = ? AND cp.term_id = ?`,
      [postId, termId]
    );
    if (!posts?.length) {
      return res.status(400).json({ ok: false, error: "Post does not belong to this term" });
    }
    const post = posts[0];
    await assertPostAllowsAnotherMember(pool, postId);

    const id = uuidv4();
    const designation = String(req.body?.designation || post.title || "").trim() || post.title;
    const category = String(req.body?.category || "executive");

    const row = { id, term_id: termId, post_id: postId, name, designation, category };
    for (const f of MEMBER_FIELDS) {
      if (f === "id" || f === "term_id" || f === "post_id" || f === "name" || f === "designation" || f === "category")
        continue;
      if (Object.prototype.hasOwnProperty.call(req.body || {}, f)) {
        row[f] = req.body[f];
      }
    }

    // Executive team fields: college name fixed; address/location, expertise, and about removed.
    row.college_name = FIXED_COLLEGE_NAME;
    row.location = null;
    row.expertise = null;
    row.about = null;
    const wishingMax = await getWishingMaxWordsForPost(pool, postId);
    assertMemberTextLimits(row, wishingMax);
    if (row.display_order === undefined) {
      const [[{ maxO }]] = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) + 1 AS maxO FROM committee_members WHERE post_id = ?",
        [postId]
      );
      row.display_order = Number(maxO);
    }
    if (row.is_active === undefined) row.is_active = 1;
    else row.is_active = row.is_active ? 1 : 0;

    Object.keys(row).forEach((k) => {
      if (row[k] === undefined) delete row[k];
    });
    pruneUnknownMemberColumns(row, memberCols);

    await pool.query("INSERT INTO committee_members SET ?", [row]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    if (e.code === "SINGLE_SEAT") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "MAX_WORDS" || e.code === "MAX_250_WORDS") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    res.status(500).json({ ok: false, error: e.message || "Failed to create member" });
  }
});

router.put("/committee/members/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const memberId = req.params.id;
    await ensureCommitteeMemberColumns(pool);
    const memberCols = await getCommitteeMemberColumnSet(pool);

    const [existingRows] = await pool.query("SELECT * FROM committee_members WHERE id = ? LIMIT 1", [
      memberId,
    ]);
    const existing = existingRows?.[0];
    if (!existing) return res.status(404).json({ ok: false, error: "Member not found" });

    const nextPostId = Object.prototype.hasOwnProperty.call(req.body || {}, "post_id")
      ? req.body.post_id
      : existing.post_id;
    const nextActive = Object.prototype.hasOwnProperty.call(req.body || {}, "is_active")
      ? Boolean(req.body.is_active)
      : Boolean(existing.is_active);

    const postChanged = String(nextPostId || "") !== String(existing.post_id || "");
    const wasInactive = !existing.is_active;
    if (nextPostId && nextActive && (postChanged || wasInactive)) {
      await assertPostAllowsAnotherMember(pool, nextPostId, memberId);
    }

    const patch = {};
    for (const f of MEMBER_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, f)) {
        patch[f] = req.body[f];
      }
    }

    // Enforce executive team field rules server-side.
    patch.college_name = FIXED_COLLEGE_NAME;
    patch.location = null;
    patch.expertise = null;
    patch.about = null;
    const wishingMax = await getWishingMaxWordsForPost(pool, nextPostId);
    assertMemberTextLimits(patch, wishingMax);
    pruneUnknownMemberColumns(patch, memberCols);

    const oldPhotoUrl = existing.photo_url;
    const photoWasProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "photo_url");
    const nextPhotoUrl = photoWasProvided ? req.body.photo_url : existing.photo_url;

    await pool.query("UPDATE committee_members SET ? WHERE id = ?", [patch, memberId]);

    // If admin changed photo_url, delete the previous Cloudinary asset.
    if (photoWasProvided && oldPhotoUrl && oldPhotoUrl !== nextPhotoUrl) {
      const oldPublicId = extractCloudinaryPublicIdFromUrl(oldPhotoUrl);
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" });
        } catch (e) {
          console.error("[admin] Failed to delete old committee member photo", e?.message || e);
        }
      }
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    if (e.code === "SINGLE_SEAT") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "MAX_WORDS" || e.code === "MAX_250_WORDS") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    res.status(500).json({ ok: false, error: e.message || "Failed to update member" });
  }
});

router.delete("/committee/members/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM committee_members WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete member" });
  }
});

// Term detail: posts + all members (admin)
router.get("/committee/terms/:id/full", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const termId = req.params.id;
    const [termRows] = await pool.query("SELECT * FROM committee_terms WHERE id = ? LIMIT 1", [termId]);
    const term = termRows?.[0];
    if (!term) return res.status(404).json({ ok: false, error: "Term not found" });
    const [posts] = await pool.query(
      "SELECT * FROM committee_posts WHERE term_id = ? ORDER BY display_order ASC",
      [termId]
    );
    const [members] = await pool.query(
      "SELECT * FROM committee_members WHERE term_id = ? ORDER BY post_id, display_order ASC",
      [termId]
    );
    const postsWith = posts.map((p) => ({
      ...p,
      members: members.filter((m) => m.post_id === p.id),
    }));
    res.status(200).json({ term, posts: postsWith });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load term" });
  }
});

module.exports = router;
