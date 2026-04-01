const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getOrCreatePool } = require("../db/pool");
const { requireAuth } = require("../auth/jwt");
const { DEFAULT_COMMITTEE_POSTS } = require("../constants/committeeDefaults");
const { inferBoardSectionFromTitle } = require("../utils/inferCommitteeBoardSection");
const { ensureCommitteePostsBoardSectionColumn } = require("../utils/ensureCommitteePostsBoardSection");
const { ensureAdminCommitteeDesignationColumn } = require("../utils/ensureAdminCommitteeDesignation");
const cloudinary = require("../config/cloudinary");
const { winnerAboutFromProfileBio } = require("../utils/syncCommitteePhotoFromProfile");
const {
  buildGoverningDefaultWishing,
  buildOtherSectionsDefaultWishing,
} = require("../utils/committeeDefaultWishing");

const router = express.Router();

function normalizeAlumniIdKey(raw) {
  const t = String(raw || "")
    .trim()
    .replace(/\s+/g, "");
  if (!t) return "";
  const c0 = t.charAt(0);
  const rest = t.slice(1);
  return (/^[a-zA-Z]$/.test(c0) ? c0.toUpperCase() : c0) + rest;
}

async function recomputeAdminCommitteeDesignationForAlumniId(pool, rawAlumniId) {
  const key = normalizeAlumniIdKey(rawAlumniId);
  if (!key) return;
  await ensureAdminCommitteeDesignationColumn(pool);
  const [profiles] = await pool.query(
    `SELECT id, registration_number FROM profiles
     WHERE TRIM(COALESCE(registration_number,'')) = ?
        OR UPPER(TRIM(COALESCE(registration_number,''))) = UPPER(?)`,
    [key, key]
  );
  const profileRow = profiles?.[0];
  if (!profileRow) return;
  const reg =
    profileRow.registration_number != null ? String(profileRow.registration_number).trim() : key;

  const [agg] = await pool.query(
    `SELECT GROUP_CONCAT(DISTINCT cp.title ORDER BY cp.display_order ASC SEPARATOR ' · ') AS titles
     FROM committee_members cm
     INNER JOIN committee_posts cp ON cp.id = cm.post_id
     INNER JOIN committee_terms ct ON ct.id = cm.term_id
     WHERE ct.is_current = 1
       AND ct.status = 'published'
       AND COALESCE(cm.is_active, 1) = 1
       AND (
         TRIM(cm.alumni_id) = ?
         OR UPPER(TRIM(cm.alumni_id)) = UPPER(?)
       )`,
    [reg, reg]
  );
  const label = agg?.[0]?.titles ? String(agg[0].titles).trim() : null;
  await pool.query("UPDATE profiles SET admin_committee_designation = ? WHERE id = ?", [label, profileRow.id]);
}

async function refreshAllCommitteeDesignationsFromCurrentTerm(pool) {
  await ensureAdminCommitteeDesignationColumn(pool);
  await pool.query("UPDATE profiles SET admin_committee_designation = NULL");
  const [rows] = await pool.query(
    `SELECT DISTINCT TRIM(cm.alumni_id) AS aid
     FROM committee_members cm
     INNER JOIN committee_terms ct ON ct.id = cm.term_id
     INNER JOIN committee_posts cp ON cp.id = cm.post_id
     WHERE ct.is_current = 1
       AND ct.status = 'published'
       AND COALESCE(cm.is_active, 1) = 1
       AND cm.alumni_id IS NOT NULL
       AND TRIM(cm.alumni_id) <> ''`
  );
  for (const r of rows || []) {
    await recomputeAdminCommitteeDesignationForAlumniId(pool, r.aid);
  }
}

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

async function deleteCloudinaryImageByUrl(url) {
  const publicId = extractCloudinaryPublicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (e) {
    console.error("[admin] Failed Cloudinary cleanup", e?.message || e);
  }
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

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "is_current")) {
      await refreshAllCommitteeDesignationsFromCurrentTerm(pool);
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update term" });
  }
});

router.delete("/committee/terms/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [memberRows] = await pool.query("SELECT photo_url FROM committee_members WHERE term_id = ?", [req.params.id]);
    for (const m of memberRows || []) {
      await deleteCloudinaryImageByUrl(m?.photo_url || null);
    }
    await pool.query("DELETE FROM committee_terms WHERE id = ?", [req.params.id]);
    await refreshAllCommitteeDesignationsFromCurrentTerm(pool);
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
      await refreshAllCommitteeDesignationsFromCurrentTerm(pool);
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
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "title")) {
      await refreshAllCommitteeDesignationsFromCurrentTerm(pool);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update post" });
  }
});

router.delete("/committee/posts/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const postId = req.params.id;
    const [memberRows] = await pool.query(
      "SELECT photo_url, alumni_id FROM committee_members WHERE post_id = ?",
      [postId]
    );
    const alumniIds = new Set();
    for (const m of memberRows || []) {
      await deleteCloudinaryImageByUrl(m?.photo_url || null);
      if (m?.alumni_id) alumniIds.add(String(m.alumni_id).trim());
    }
    await pool.query("DELETE FROM committee_members WHERE post_id = ?", [postId]);
    await pool.query("DELETE FROM committee_posts WHERE id = ?", [postId]);
    for (const aid of alumniIds) {
      await recomputeAdminCommitteeDesignationForAlumniId(pool, aid);
    }
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

/** First trimmed non-empty string from profile-like columns (import / display fallbacks). */
function firstNonEmptyTrimmedString(...candidates) {
  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return null;
}

function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Wishing message: 50 words max (all posts). About winner: 250 words. */
async function getWishingMaxWordsForPost() {
  return 50;
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
    const [optRows] = await pool.query("SELECT id, value FROM profession_options ORDER BY value ASC");
    const [cmRows] = await pool.query(
      "SELECT DISTINCT TRIM(profession) AS value FROM committee_members WHERE profession IS NOT NULL AND TRIM(profession) <> ''"
    );
    const [profRows] = await pool.query(
      "SELECT DISTINCT TRIM(profession) AS value FROM profiles WHERE profession IS NOT NULL AND TRIM(profession) <> ''"
    );
    const [jtRows] = await pool.query(
      "SELECT DISTINCT TRIM(job_title) AS value FROM profiles WHERE job_title IS NOT NULL AND TRIM(job_title) <> ''"
    );

    const merged = [];
    const seen = new Set();

    for (const r of optRows || []) {
      const v = String(r.value ?? "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      merged.push({ id: r.id, value: v, persisted: true });
    }

    function addDistinct(rows, idPrefix) {
      for (const d of rows || []) {
        const v = String(d.value ?? "").trim();
        if (!v || seen.has(v)) continue;
        seen.add(v);
        merged.push({ id: `${idPrefix}-${v}`, value: v, persisted: false });
      }
    }

    addDistinct(cmRows, "cm");
    addDistinct(profRows, "alumni");
    addDistinct(jtRows, "title");

    merged.sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: "base" }));
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

/** Default import message is ~43 words plus name and post title; allow headroom for long Bangla names/titles. */
const IMPORT_CONGRATULATIONS_WORD_CEILING = 75;

/**
 * For the import congratulations text only: use English for the post title (Bangla → EN via public API; English titles unchanged).
 */
async function translatePostTitleToEnglishForWishing(postTitle) {
  const raw = String(postTitle || "").trim();
  if (!raw) return "Member";

  const hasBengali = /[\u0980-\u09FF]/.test(raw);
  const hasLatinLetters = /[a-zA-Z]/.test(raw);
  if (!hasBengali && hasLatinLetters) return raw;

  const doFetch = async (langpair) => {
    const q = encodeURIComponent(raw.slice(0, 500));
    const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${langpair}`;
    const signal =
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(12000)
        : undefined;
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const out = data?.responseData?.translatedText;
    if (typeof out !== "string") return null;
    const t = out.trim();
    if (
      !t ||
      /^MYMEMORY WARNING/i.test(t) ||
      /PLEASE SELECT TWO DISTINCT LANGUAGES/i.test(t) ||
      /^QUERY LENGTH LIMIT EXCEEDED/i.test(t)
    ) {
      return null;
    }
    return t;
  };

  try {
    const bnEn = await doFetch("bn|en");
    if (bnEn) return bnEn;
    const autoEn = await doFetch("auto|en");
    if (autoEn) return autoEn;
  } catch (_e) {
    /* use original */
  }
  return raw;
}

function parseProfileSocialLinks(profile) {
  let fb = null;
  let ig = null;
  let li = null;
  const raw = profile?.social_links;
  if (!raw) return { fb, ig, li };
  let o = raw;
  if (typeof raw === "string") {
    try {
      o = JSON.parse(raw);
    } catch {
      return { fb, ig, li };
    }
  }
  if (o && typeof o === "object") {
    fb = o.facebook || null;
    ig = o.instagram || null;
    li = o.linkedin || null;
  }
  return {
    fb: fb ? String(fb).trim() : null,
    ig: ig ? String(ig).trim() : null,
    li: li ? String(li).trim() : null,
  };
}

/**
 * Create a committee seat from a verified alumni profile (Alumni ID = profiles.registration_number).
 */
router.post("/committee/posts/:postId/import-from-alumni", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureCommitteeMemberColumns(pool);
    await ensureAdminCommitteeDesignationColumn(pool);
    const memberCols = await getCommitteeMemberColumnSet(pool);
    const postId = req.params.postId;
    const termId = String(req.body?.term_id || "").trim();
    const rawAlumni = String(req.body?.alumni_id || "").trim();
    const key = normalizeAlumniIdKey(rawAlumni);
    if (!termId || !postId || !key) {
      return res.status(400).json({ ok: false, error: "term_id, post in URL, and alumni_id are required" });
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

    const [profRows] = await pool.query(
      `SELECT p.*, u.email AS user_email FROM profiles p
       INNER JOIN users u ON u.id = p.id
       WHERE TRIM(COALESCE(p.registration_number,'')) = ?
          OR UPPER(TRIM(COALESCE(p.registration_number,''))) = UPPER(?)`,
      [key, key]
    );
    const profile = profRows?.[0];
    if (!profile) {
      return res.status(404).json({ ok: false, error: "No alumni profile found for this Alumni ID." });
    }

    const regNum = profile.registration_number != null ? String(profile.registration_number).trim() : key;
    const social = parseProfileSocialLinks(profile);

    const id = uuidv4();
    const name = String(profile.name || "").trim() || "Alumni";
    const designation = String(post.title || "").trim() || "Member";
    const boardSection = normalizeBoardSection(post.board_section);
    let wishingMessage = null;
    if (boardSection === "governing_body") {
      const postTitleEn = await translatePostTitleToEnglishForWishing(designation);
      wishingMessage = buildGoverningDefaultWishing(name, postTitleEn);
    } else if (
      boardSection === "executive_committee" ||
      boardSection === "committee_heads" ||
      boardSection === "committee_members"
    ) {
      const postTitleEn = await translatePostTitleToEnglishForWishing(designation);
      wishingMessage = buildOtherSectionsDefaultWishing(name, postTitleEn);
    }

    const row = {
      id,
      term_id: termId,
      post_id: postId,
      name,
      designation,
      category: "executive",
      batch: profile.batch != null ? String(profile.batch) : null,
      alumni_id: regNum,
      phone: profile.phone != null ? String(profile.phone) : null,
      email: profile.user_email != null ? String(profile.user_email) : null,
      profession: firstNonEmptyTrimmedString(profile.profession, profile.job_title),
      job_status: profile.job_status != null ? String(profile.job_status) : null,
      institution: profile.university != null ? String(profile.university) : null,
      photo_url: profile.photo != null ? String(profile.photo) : null,
      facebook_url: social.fb || null,
      instagram_url: social.ig || null,
      linkedin_url: social.li || null,
      college_name: FIXED_COLLEGE_NAME,
      location: null,
      expertise: null,
      about: null,
      wishing_message: wishingMessage,
      winner_about: winnerAboutFromProfileBio(profile.bio),
      candidate_number: null,
      is_active: 1,
    };

    const [[{ maxO }]] = await pool.query(
      "SELECT COALESCE(MAX(display_order), -1) + 1 AS maxO FROM committee_members WHERE post_id = ?",
      [postId]
    );
    row.display_order = Number(maxO);

    const wishingMax = await getWishingMaxWordsForPost();
    const wishingLimit = wishingMessage ? Math.max(wishingMax, IMPORT_CONGRATULATIONS_WORD_CEILING) : wishingMax;
    assertMemberTextLimits(row, wishingLimit);
    pruneUnknownMemberColumns(row, memberCols);

    await pool.query("INSERT INTO committee_members SET ?", [row]);
    await recomputeAdminCommitteeDesignationForAlumniId(pool, regNum);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    if (e.code === "SINGLE_SEAT") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "MAX_WORDS" || e.code === "MAX_250_WORDS") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    res.status(500).json({ ok: false, error: e.message || "Failed to import member" });
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
    const wishingMax = await getWishingMaxWordsForPost();
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
    if (row.alumni_id) {
      await recomputeAdminCommitteeDesignationForAlumniId(pool, String(row.alumni_id));
    }
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
    const wishingMax = await getWishingMaxWordsForPost();
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

    const toRecompute = new Set();
    if (existing.alumni_id) toRecompute.add(String(existing.alumni_id).trim());
    if (Object.prototype.hasOwnProperty.call(patch || {}, "alumni_id")) {
      const v = patch.alumni_id;
      if (v) toRecompute.add(String(v).trim());
    }
    for (const aid of toRecompute) {
      if (aid) await recomputeAdminCommitteeDesignationForAlumniId(pool, aid);
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
    const [rows] = await pool.query(
      "SELECT photo_url, alumni_id FROM committee_members WHERE id = ? LIMIT 1",
      [req.params.id]
    );
    const alumniId = rows?.[0]?.alumni_id;
    await deleteCloudinaryImageByUrl(rows?.[0]?.photo_url || null);
    await pool.query("DELETE FROM committee_members WHERE id = ?", [req.params.id]);
    if (alumniId) await recomputeAdminCommitteeDesignationForAlumniId(pool, String(alumniId));
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
