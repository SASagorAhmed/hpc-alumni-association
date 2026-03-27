const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { ensureAchievementSettingsRow } = require("../utils/achievementSettings");
const { getOrCreatePool } = require("../db/pool");
const { requireAuth } = require("../auth/jwt");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

function extractCloudinaryPublicIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const clean = url.split("?")[0];
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
  const isAdmin = await requireAdmin(pool, req.auth.userId);
  if (!isAdmin) {
    res.status(403).json({ ok: false, error: "Admin only" });
    return null;
  }
  return pool;
}

/** Safe DATETIME for MySQL (avoids invalid ISO / timezone surprises on date-only strings). */
function normalizeAchievementDateTime(value) {
  if (value == null || value === "") return null;
  const s = typeof value === "string" ? value.trim() : String(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function nullableTrim(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

const BANNER_TEXT_MAX_WORDS = 30;

function wordCount(s) {
  if (s == null || s === "") return 0;
  const t = String(s).trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/** Returns error message or null */
function validateAchievementBannerWordLimits(fields) {
  const map = [
    ["achievement_title", fields.achievement_title],
    ["message", fields.message],
    ["banner_photo_batch_text", fields.banner_photo_batch_text],
    ["banner_photo_tagline", fields.banner_photo_tagline],
    ["banner_congratulations_text", fields.banner_congratulations_text],
  ];
  for (const [key, val] of map) {
    if (val != null && wordCount(val) > BANNER_TEXT_MAX_WORDS) {
      return `${key.replace(/_/g, " ")} must be at most ${BANNER_TEXT_MAX_WORDS} words`;
    }
  }
  return null;
}

async function ensureAchievementBannerOverlayColumns(pool) {
  const fragments = [
    "ADD COLUMN `banner_photo_batch_text` TEXT NULL",
    "ADD COLUMN `banner_photo_tagline` TEXT NULL",
    "ADD COLUMN `banner_congratulations_text` VARCHAR(120) NULL",
    "ADD COLUMN `banner_theme` VARCHAR(32) NULL DEFAULT 'default'",
  ];
  for (const frag of fragments) {
    try {
      await pool.query(`ALTER TABLE achievements ${frag}`);
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      if (!/Duplicate column name/i.test(msg)) throw e;
    }
  }
}

function normalizeAchievementBannerTheme(raw) {
  const theme = String(raw ?? "").trim().toLowerCase();
  if (theme === "theme2" || theme === "tomato") return "theme2";
  return "default";
}

function achievementInsertRow(body, id) {
  const b = body || {};
  const name = String(b.name || "").trim();
  const achievement_title = String(b.achievement_title || "").trim();
  return {
    id,
    name,
    batch: nullableTrim(b.batch),
    photo_url: nullableTrim(b.photo_url),
    achievement_title,
    institution: nullableTrim(b.institution),
    message: nullableTrim(b.message),
    tag: nullableTrim(b.tag),
    location: nullableTrim(b.location),
    achievement_date: normalizeAchievementDateTime(b.achievement_date),
    start_date: normalizeAchievementDateTime(b.start_date),
    end_date: normalizeAchievementDateTime(b.end_date),
    display_order: Number.isFinite(Number(b.display_order)) ? Math.floor(Number(b.display_order)) : 0,
    is_active: b.is_active === false || b.is_active === 0 || b.is_active === "0" ? 0 : 1,
    is_pinned: b.is_pinned === true || b.is_pinned === 1 || b.is_pinned === "1" ? 1 : 0,
    banner_photo_batch_text: nullableTrim(b.banner_photo_batch_text),
    banner_photo_tagline: nullableTrim(b.banner_photo_tagline),
    banner_congratulations_text: nullableTrim(b.banner_congratulations_text),
    banner_theme: normalizeAchievementBannerTheme(b.banner_theme),
  };
}

/** Partial update: only keys present in body (supports toggles that send one field). */
function achievementUpdatePatch(body) {
  const b = body || {};
  const patch = {};
  if ("name" in b) patch.name = String(b.name || "").trim();
  if ("achievement_title" in b) patch.achievement_title = String(b.achievement_title || "").trim();
  if ("batch" in b) patch.batch = nullableTrim(b.batch);
  if ("photo_url" in b) patch.photo_url = nullableTrim(b.photo_url);
  if ("institution" in b) patch.institution = nullableTrim(b.institution);
  if ("message" in b) patch.message = nullableTrim(b.message);
  if ("tag" in b) patch.tag = nullableTrim(b.tag);
  if ("location" in b) patch.location = nullableTrim(b.location);
  if ("achievement_date" in b) patch.achievement_date = normalizeAchievementDateTime(b.achievement_date);
  if ("start_date" in b) patch.start_date = normalizeAchievementDateTime(b.start_date);
  if ("end_date" in b) patch.end_date = normalizeAchievementDateTime(b.end_date);
  if ("display_order" in b) {
    patch.display_order = Number.isFinite(Number(b.display_order)) ? Math.floor(Number(b.display_order)) : 0;
  }
  if ("is_active" in b) {
    patch.is_active = b.is_active === false || b.is_active === 0 || b.is_active === "0" ? 0 : 1;
  }
  if ("is_pinned" in b) {
    patch.is_pinned = b.is_pinned === true || b.is_pinned === 1 || b.is_pinned === "1" ? 1 : 0;
  }
  if ("banner_photo_batch_text" in b) patch.banner_photo_batch_text = nullableTrim(b.banner_photo_batch_text);
  if ("banner_photo_tagline" in b) patch.banner_photo_tagline = nullableTrim(b.banner_photo_tagline);
  if ("banner_congratulations_text" in b) patch.banner_congratulations_text = nullableTrim(b.banner_congratulations_text);
  if ("banner_theme" in b) patch.banner_theme = normalizeAchievementBannerTheme(b.banner_theme);
  return patch;
}

router.get("/users", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT * FROM profiles ORDER BY created_at DESC");
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load users" });
  }
});

router.put("/landing-content/:sectionKey", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const sectionKey = req.params.sectionKey;
    const content = req.body?.content;
    if (!content) return res.status(400).json({ ok: false, error: "Missing content" });

    const [existing] = await pool.query("SELECT id FROM landing_content WHERE section_key = ? LIMIT 1", [sectionKey]);
    if ((existing || []).length) {
      await pool.query(
        "UPDATE landing_content SET content = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE section_key = ?",
        [JSON.stringify(content), req.auth.userId, sectionKey]
      );
    } else {
      await pool.query(
        "INSERT INTO landing_content (id, section_key, content, updated_by) VALUES (?, ?, ?, ?)",
        [uuidv4(), sectionKey, JSON.stringify(content), req.auth.userId]
      );
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to save landing content" });
  }
});

router.delete("/landing-content/:sectionKey", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM landing_content WHERE section_key = ?", [req.params.sectionKey]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete landing content" });
  }
});

router.patch("/users/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const allowed = ["verified", "approved", "blocked", "profile_pending"];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (!entries.length) return res.status(400).json({ ok: false, error: "Nothing to update" });
    const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
    const values = entries.map(([, v]) => v);
    await pool.query(`UPDATE profiles SET ${setClause} WHERE id = ?`, [...values, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update user" });
  }
});

// Admin: hard-delete a user + profile.
// Important: this deletes the Cloudinary photo first (best-effort), then deletes `users` row
// (profiles + roles cascade via foreign keys).
router.delete("/users/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = req.params.id;

    const [profileRows] = await pool.query("SELECT photo FROM profiles WHERE id = ? LIMIT 1", [id]);
    const photoUrl = profileRows?.[0]?.photo || null;

    if (photoUrl) {
      const publicId = extractCloudinaryPublicIdFromUrl(photoUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        } catch (_e) {
          // Best effort: deletion should still continue even if cloudinary delete fails.
        }
      }
    }

    const [del] = await pool.query("DELETE FROM users WHERE id = ? LIMIT 1", [id]);
    // mysql2 returns an OkPacket array; affectedRows is available on first element.
    const affected = del?.affectedRows ?? del?.[0]?.affectedRows;
    if (!affected) return res.status(404).json({ ok: false, error: "User not found" });

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete user" });
  }
});

router.get("/committee-members", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT * FROM committee_members ORDER BY display_order ASC");
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load committee" });
  }
});

router.post("/committee-members", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = uuidv4();
    await pool.query("INSERT INTO committee_members SET ?", [{ id, ...req.body }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create member" });
  }
});

router.put("/committee-members/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("UPDATE committee_members SET ? WHERE id = ?", [req.body, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update member" });
  }
});

router.delete("/committee-members/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM committee_members WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete member" });
  }
});

router.get("/achievements", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT * FROM achievements ORDER BY display_order ASC");
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load achievements" });
  }
});

router.post("/achievements", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureAchievementBannerOverlayColumns(pool);
    const id = uuidv4();
    const row = achievementInsertRow(req.body, id);
    if (!row.name || !row.achievement_title) {
      return res.status(400).json({ ok: false, error: "name and achievement_title are required" });
    }
    const wcErr = validateAchievementBannerWordLimits(row);
    if (wcErr) return res.status(400).json({ ok: false, error: wcErr });
    await pool.query("INSERT INTO achievements SET ?", row);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    console.error("[admin] POST /achievements", e);
    res.status(500).json({ ok: false, error: e.message || "Failed to create achievement" });
  }
});

router.put("/achievements/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureAchievementBannerOverlayColumns(pool);
    const patch = achievementUpdatePatch(req.body);
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ ok: false, error: "No fields to update" });
    }
    const wcErr = validateAchievementBannerWordLimits(patch);
    if (wcErr) return res.status(400).json({ ok: false, error: wcErr });
    await pool.query("UPDATE achievements SET ? WHERE id = ?", [patch, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[admin] PUT /achievements/:id", e);
    res.status(500).json({ ok: false, error: e.message || "Failed to update achievement" });
  }
});

router.delete("/achievements/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM achievements WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete achievement" });
  }
});

router.get("/achievement-settings", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const row = await ensureAchievementSettingsRow(pool);
    res.status(200).json(row);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load settings" });
  }
});

router.put("/achievement-settings/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const b = req.body || {};
    const patch = {};
    if ("banner_enabled" in b) {
      patch.banner_enabled =
        b.banner_enabled === true || b.banner_enabled === 1 || b.banner_enabled === "1" ? 1 : 0;
    }
    if ("slide_duration" in b) {
      const n = Math.floor(Number(b.slide_duration));
      patch.slide_duration = Number.isFinite(n) && n >= 2 && n <= 300 ? n : 4;
    }
    if ("max_display_count" in b) {
      const v = b.max_display_count;
      if (v === null || v === undefined || v === "") patch.max_display_count = null;
      else {
        const n = Math.floor(Number(v));
        patch.max_display_count = Number.isFinite(n) && n >= 0 ? n : null;
      }
    }
    if ("banner_theme" in b) {
      const raw = String(b.banner_theme || "").trim().toLowerCase();
      patch.banner_theme = raw === "theme2" || raw === "tomato" ? "theme2" : "default";
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ ok: false, error: "No valid fields to update" });
    }
    await pool.query("UPDATE achievement_settings SET ? WHERE id = ?", [patch, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[admin] PUT /achievement-settings/:id", e);
    res.status(500).json({ ok: false, error: e.message || "Failed to update settings" });
  }
});

router.get("/memories", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT * FROM memories ORDER BY display_order ASC, created_at DESC");
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load memories" });
  }
});

router.post("/memories", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = uuidv4();
    await pool.query("INSERT INTO memories SET ?", [{ id, ...req.body }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create memory" });
  }
});

router.put("/memories/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("UPDATE memories SET ? WHERE id = ?", [req.body, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update memory" });
  }
});

router.delete("/memories/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM memories WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete memory" });
  }
});

router.get("/events", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT * FROM events ORDER BY created_at DESC");
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load events" });
  }
});

router.post("/events", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = uuidv4();
    await pool.query("INSERT INTO events SET ?", [{ id, ...req.body, created_by: req.auth.userId }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create event" });
  }
});

router.put("/events/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("UPDATE events SET ? WHERE id = ?", [req.body, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update event" });
  }
});

router.delete("/events/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM events WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete event" });
  }
});

router.get("/notices", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT * FROM notices ORDER BY pinned DESC, created_at DESC");
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load notices" });
  }
});

router.post("/notices", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = uuidv4();
    await pool.query("INSERT INTO notices SET ?", [{ id, ...req.body, created_by: req.auth.userId }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create notice" });
  }
});

router.put("/notices/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("UPDATE notices SET ? WHERE id = ?", [req.body, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update notice" });
  }
});

router.delete("/notices/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM notices WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete notice" });
  }
});

router.get("/elections", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT * FROM elections ORDER BY created_at DESC");
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load elections" });
  }
});

router.post("/elections", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = uuidv4();
    await pool.query("INSERT INTO elections SET ?", [{ id, ...req.body, created_by: req.auth.userId }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create election" });
  }
});

router.put("/elections/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("UPDATE elections SET ? WHERE id = ?", [req.body, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update election" });
  }
});

router.delete("/elections/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM elections WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete election" });
  }
});

router.post("/election-posts", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = uuidv4();
    await pool.query("INSERT INTO election_posts SET ?", [{ id, ...req.body }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create post" });
  }
});

router.put("/election-posts/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("UPDATE election_posts SET ? WHERE id = ?", [req.body, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update post" });
  }
});

router.delete("/election-posts/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM election_posts WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete post" });
  }
});

router.post("/candidates", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const id = uuidv4();
    await pool.query("INSERT INTO candidates SET ?", [{ id, ...req.body }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to create candidate" });
  }
});

router.put("/candidates/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("UPDATE candidates SET ? WHERE id = ?", [req.body, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update candidate" });
  }
});

router.delete("/candidates/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM candidates WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to delete candidate" });
  }
});

router.post("/votes", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const id = uuidv4();
    await pool.query("INSERT INTO votes SET ?", [{ id, ...req.body, voter_id: req.auth.userId }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to cast vote" });
  }
});

router.get("/elections/:id/my-votes", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const [rows] = await pool.query(
      "SELECT * FROM votes WHERE election_id = ? AND voter_id = ?",
      [req.params.id, req.auth.userId]
    );
    res.status(200).json(rows || []);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load user votes" });
  }
});

router.post("/winners", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = uuidv4();
    await pool.query("INSERT INTO election_winners SET ?", [{ id, ...req.body }]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to declare winner" });
  }
});

router.delete("/winners/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await pool.query("DELETE FROM election_winners WHERE id = ?", [req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to remove winner" });
  }
});

module.exports = router;

