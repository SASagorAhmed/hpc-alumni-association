const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { ensureAchievementSettingsRow } = require("../utils/achievementSettings");
const { ensureProfileEditAuditTable } = require("../utils/ensureProfileEditAuditTable");
const { ensureProfileBirthdayColumn } = require("../utils/ensureProfileBirthdayColumn");
const { ensureProfileNicknameUniShortColumns } = require("../utils/ensureProfileNicknameUniShortColumns");
const { getOrCreatePool } = require("../db/pool");
const { requireAuth, verifyJwt } = require("../auth/jwt");
const cloudinary = require("../config/cloudinary");
const { getCloudinaryFolder } = require("../utils/uploadFolders");

const router = express.Router();

function extractCloudinaryPublicIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const clean = url.split("?")[0];
  // https://res.cloudinary.com/<cloud>/image/upload/v1712345678/<folder>/<publicId>.<ext>
  const m = clean.match(/\/upload\/v\d+\/(.+?)\.[a-zA-Z0-9]+$/);
  return m?.[1] || null;
}

async function deleteCloudinaryImageByUrl(url) {
  const publicId = extractCloudinaryPublicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (_e) {
    // Best effort cleanup; do not block DB writes/deletes.
  }
}

function collectPublicIdsFromRows(rows, keys, outSet) {
  for (const row of rows || []) {
    for (const key of keys) {
      const v = row?.[key];
      const pid = extractCloudinaryPublicIdFromUrl(v);
      if (pid) outSet.add(pid);
    }
  }
}

async function getReferencedCloudinaryImagePublicIds(pool) {
  const referenced = new Set();

  const [profileRows] = await pool.query("SELECT photo FROM profiles WHERE photo IS NOT NULL AND TRIM(photo) <> ''");
  collectPublicIdsFromRows(profileRows, ["photo"], referenced);

  const [achievementRows] = await pool.query(
    "SELECT photo_url FROM achievements WHERE photo_url IS NOT NULL AND TRIM(photo_url) <> ''"
  );
  collectPublicIdsFromRows(achievementRows, ["photo_url"], referenced);

  const [committeeRows] = await pool.query(
    "SELECT photo_url FROM committee_members WHERE photo_url IS NOT NULL AND TRIM(photo_url) <> ''"
  );
  collectPublicIdsFromRows(committeeRows, ["photo_url"], referenced);

  const [memoryRows] = await pool.query(
    "SELECT photo_url FROM memories WHERE photo_url IS NOT NULL AND TRIM(photo_url) <> ''"
  );
  collectPublicIdsFromRows(memoryRows, ["photo_url"], referenced);

  const [candidateRows] = await pool.query(
    "SELECT photo_url FROM candidates WHERE photo_url IS NOT NULL AND TRIM(photo_url) <> ''"
  );
  collectPublicIdsFromRows(candidateRows, ["photo_url"], referenced);

  const [eventRows] = await pool.query(
    "SELECT banner_url FROM events WHERE banner_url IS NOT NULL AND TRIM(banner_url) <> ''"
  );
  collectPublicIdsFromRows(eventRows, ["banner_url"], referenced);

  const [noticeRows] = await pool.query(
    "SELECT image_url FROM notices WHERE image_url IS NOT NULL AND TRIM(image_url) <> ''"
  );
  collectPublicIdsFromRows(noticeRows, ["image_url"], referenced);

  return referenced;
}

async function listCloudinaryImagePublicIdsByPrefix(prefix) {
  const out = new Set();
  let nextCursor = undefined;
  do {
    const resp = await cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix,
      max_results: 500,
      next_cursor: nextCursor,
    });
    for (const r of resp?.resources || []) {
      if (r?.public_id) out.add(r.public_id);
    }
    nextCursor = resp?.next_cursor;
  } while (nextCursor);
  return out;
}

async function listManagedCloudinaryImagePublicIds() {
  const managed = new Set();
  const prefixes = [
    getCloudinaryFolder("profile"),
    getCloudinaryFolder("achievements"),
    getCloudinaryFolder("memories"),
    getCloudinaryFolder("committee"),
    getCloudinaryFolder("events"),
    getCloudinaryFolder("notices"),
    getCloudinaryFolder("candidates"),
  ];
  const seenPrefix = new Set();
  for (const p of prefixes) {
    const prefix = String(p || "").trim();
    if (!prefix || seenPrefix.has(prefix)) continue;
    seenPrefix.add(prefix);
    const ids = await listCloudinaryImagePublicIdsByPrefix(prefix);
    for (const id of ids) managed.add(id);
  }
  return managed;
}

function getManagedFolderModuleEntries() {
  const out = [];
  const seen = new Set();
  const pairs = [
    ["profile", getCloudinaryFolder("profile")],
    ["achievements", getCloudinaryFolder("achievements")],
    ["memories", getCloudinaryFolder("memories")],
    ["committee", getCloudinaryFolder("committee")],
    ["events", getCloudinaryFolder("events")],
    ["notices", getCloudinaryFolder("notices")],
    ["candidates", getCloudinaryFolder("candidates")],
  ];
  for (const [module, rawFolder] of pairs) {
    const folder = String(rawFolder || "").trim();
    if (!folder || seen.has(folder)) continue;
    seen.add(folder);
    out.push({ module, folder });
  }
  return out;
}

function folderFromPublicId(publicId, fallbackFolder) {
  const id = String(publicId || "").trim();
  if (!id) return String(fallbackFolder || "").trim();
  const idx = id.lastIndexOf("/");
  if (idx <= 0) return String(fallbackFolder || "").trim();
  return id.slice(0, idx);
}

function groupOrphans(entries) {
  const byModule = {};
  const byFolder = {};
  for (const entry of entries) {
    const module = String(entry.module || "unknown");
    const folder = String(entry.folder || "unknown");
    if (!byModule[module]) byModule[module] = [];
    if (!byFolder[folder]) byFolder[folder] = [];
    byModule[module].push(entry);
    byFolder[folder].push(entry);
  }
  return { byModule, byFolder };
}

const ORPHAN_JOB_TTL_MS = 15 * 60 * 1000;
const orphanCleanupJobs = new Map();

function writeSseEvent(res, eventName, data) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function cleanupOldOrphanJobs() {
  const now = Date.now();
  for (const [id, job] of orphanCleanupJobs.entries()) {
    const createdMs = Date.parse(job.created_at || "");
    if (!Number.isFinite(createdMs)) continue;
    if (now - createdMs > ORPHAN_JOB_TTL_MS) {
      orphanCleanupJobs.delete(id);
    }
  }
}

function createOrphanCleanupJob({ apply, userId }) {
  cleanupOldOrphanJobs();
  const id = uuidv4();
  const job = {
    id,
    user_id: userId,
    apply,
    mode: apply ? "delete" : "scan",
    status: "queued",
    phase: "queued",
    progress: 0,
    referenced_count: 0,
    managed_count: 0,
    orphan_count: 0,
    deleted_count: 0,
    delete_error_count: 0,
    current_chunk: 0,
    total_chunks: 0,
    created_at: new Date().toISOString(),
    completed_at: null,
    error: null,
    result: null,
    subscribers: new Set(),
  };
  orphanCleanupJobs.set(id, job);
  return job;
}

function progressPayload(job) {
  return {
    job_id: job.id,
    mode: job.mode,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    referenced_count: job.referenced_count,
    managed_count: job.managed_count,
    orphan_count: job.orphan_count,
    deleted_count: job.deleted_count,
    delete_error_count: job.delete_error_count,
    current_chunk: job.current_chunk,
    total_chunks: job.total_chunks,
  };
}

function broadcastJobEvent(job, eventName, payload) {
  for (const res of job.subscribers) {
    try {
      writeSseEvent(res, eventName, payload);
    } catch (_e) {
      // ignore broken stream clients
    }
  }
}

function updateOrphanJob(job, patch) {
  Object.assign(job, patch);
  broadcastJobEvent(job, "progress", progressPayload(job));
}

function finalizeOrphanJob(job, result) {
  job.status = "completed";
  job.phase = "finalizing";
  job.progress = 100;
  job.completed_at = new Date().toISOString();
  job.result = result;
  broadcastJobEvent(job, "progress", progressPayload(job));
  broadcastJobEvent(job, "result", result);
  for (const res of job.subscribers) {
    try {
      res.end();
    } catch (_e) {
      // ignore
    }
  }
  job.subscribers.clear();
}

function failOrphanJob(job, errorMessage) {
  job.status = "failed";
  job.error = errorMessage;
  job.completed_at = new Date().toISOString();
  broadcastJobEvent(job, "error", { ok: false, job_id: job.id, error: errorMessage });
  for (const res of job.subscribers) {
    try {
      res.end();
    } catch (_e) {
      // ignore
    }
  }
  job.subscribers.clear();
}

async function runOrphanCleanupJob(job, pool) {
  try {
    updateOrphanJob(job, { status: "running", phase: "collecting_referenced", progress: 3 });
    const referenced = await getReferencedCloudinaryImagePublicIds(pool);
    updateOrphanJob(job, { referenced_count: referenced.size, progress: 15 });

    const folderEntries = getManagedFolderModuleEntries();
    const managedEntries = [];
    const seenPublicIds = new Set();
    updateOrphanJob(job, { phase: "listing_managed", progress: 16 });
    for (let i = 0; i < folderEntries.length; i += 1) {
      const entry = folderEntries[i];
      const ids = await listCloudinaryImagePublicIdsByPrefix(entry.folder);
      for (const publicId of ids) {
        if (seenPublicIds.has(publicId)) continue;
        seenPublicIds.add(publicId);
        managedEntries.push({
          module: entry.module,
          folder: folderFromPublicId(publicId, entry.folder),
          public_id: publicId,
          status: job.apply ? "pending_delete" : "will_delete",
        });
      }
      const ratio = folderEntries.length > 0 ? (i + 1) / folderEntries.length : 1;
      const progress = 16 + Math.round(ratio * 39); // up to ~55
      updateOrphanJob(job, { managed_count: managedEntries.length, progress: Math.min(55, progress) });
    }

    updateOrphanJob(job, { phase: "diffing_orphans", progress: 56 });
    const orphanEntries = managedEntries.filter((x) => !referenced.has(x.public_id));
    updateOrphanJob(job, { orphan_count: orphanEntries.length, progress: 70 });

    let deletedCount = 0;
    let deleteErrors = 0;
    if (job.apply && orphanEntries.length > 0) {
      const totalChunks = Math.ceil(orphanEntries.length / 100);
      updateOrphanJob(job, { phase: "deleting_chunks", total_chunks: totalChunks, current_chunk: 0, progress: 70 });
      for (let i = 0; i < orphanEntries.length; i += 100) {
        const chunkEntries = orphanEntries.slice(i, i + 100);
        const chunk = chunkEntries.map((x) => x.public_id);
        const chunkIndex = Math.floor(i / 100) + 1;
        try {
          const result = await cloudinary.api.delete_resources(chunk, {
            resource_type: "image",
            type: "upload",
          });
          const deletedMap = result?.deleted || {};
          for (const item of chunkEntries) {
            const status = String(deletedMap[item.public_id] || "error");
            item.status = status;
            if (status === "deleted") deletedCount += 1;
            else if (status !== "not_found") deleteErrors += 1;
          }
        } catch (_e) {
          for (const item of chunkEntries) item.status = "error";
          deleteErrors += chunkEntries.length;
        }
        const ratio = totalChunks > 0 ? chunkIndex / totalChunks : 1;
        const progress = 70 + Math.round(ratio * 25); // up to ~95
        updateOrphanJob(job, {
          deleted_count: deletedCount,
          delete_error_count: deleteErrors,
          current_chunk: chunkIndex,
          progress: Math.min(95, progress),
        });
      }
    }

    updateOrphanJob(job, { phase: "finalizing", progress: 96 });
    const grouped = groupOrphans(orphanEntries);
    const payload = {
      ok: true,
      job_id: job.id,
      dry_run: !job.apply,
      referenced_count: referenced.size,
      managed_count: managedEntries.length,
      orphan_count: orphanEntries.length,
      deleted_count: deletedCount,
      delete_error_count: deleteErrors,
      sample_orphans: orphanEntries.map((x) => x.public_id).slice(0, 30),
      orphans_flat: orphanEntries,
      orphans_by_module: grouped.byModule,
      orphans_by_folder: grouped.byFolder,
    };
    finalizeOrphanJob(job, payload);
  } catch (e) {
    failOrphanJob(job, e?.message || "Failed to cleanup Cloudinary orphans");
  }
}

function parseSseToken(req) {
  const token = String(req.query.token || "").trim();
  if (!token) return null;
  try {
    const payload = verifyJwt(token);
    const userId = String(payload?.sub || "").trim();
    return userId || null;
  } catch (_e) {
    return null;
  }
}

async function requireAdmin(pool, userId) {
  const [rows] = await pool.query(
    "SELECT id FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
    [userId]
  );
  return (rows || []).length > 0;
}

const PRIMARY_ADMIN_EMAIL = String(process.env.PRIMARY_ADMIN_EMAIL || "sagormimmarriage@gmail.com")
  .trim()
  .toLowerCase();

async function userHasAdminRole(pool, userId) {
  const [rows] = await pool.query(
    "SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
    [userId]
  );
  return (rows || []).length > 0;
}

async function getUserEmailNormalized(pool, userId) {
  const [rows] = await pool.query("SELECT email FROM users WHERE id = ? LIMIT 1", [userId]);
  return String(rows?.[0]?.email || "")
    .trim()
    .toLowerCase();
}

function mapProfileRowWithAdminFlag(row) {
  if (!row) return row;
  const { admin_role_count: _arc, ...rest } = row;
  return {
    ...rest,
    is_admin: Number(_arc || 0) > 0,
  };
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
/** Longer limit for the main congratulations body (`message`) shown in the banner animation. */
const BANNER_MESSAGE_MAX_WORDS = 100;

function wordCount(s) {
  if (s == null || s === "") return 0;
  const t = String(s).trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/** Returns error message or null */
function validateAchievementBannerWordLimits(fields) {
  const shortKeys = [
    ["achievement_title", fields.achievement_title],
    ["banner_photo_batch_text", fields.banner_photo_batch_text],
    ["banner_photo_tagline", fields.banner_photo_tagline],
    ["banner_congratulations_text", fields.banner_congratulations_text],
  ];
  for (const [key, val] of shortKeys) {
    if (val != null && wordCount(val) > BANNER_TEXT_MAX_WORDS) {
      return `${key.replace(/_/g, " ")} must be at most ${BANNER_TEXT_MAX_WORDS} words`;
    }
  }
  if (fields.message != null && wordCount(fields.message) > BANNER_MESSAGE_MAX_WORDS) {
    return `message must be at most ${BANNER_MESSAGE_MAX_WORDS} words`;
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

async function ensureAchievementDetailPageColumns(pool) {
  const fragments = [
    "ADD COLUMN `alumni_ref_id` VARCHAR(128) NULL",
    "ADD COLUMN `section` TEXT NULL",
    "ADD COLUMN `session` TEXT NULL",
    "ADD COLUMN `department` TEXT NULL",
    "ADD COLUMN `university` TEXT NULL",
    "ADD COLUMN `about` TEXT NULL",
    "ADD COLUMN `profession` TEXT NULL",
    "ADD COLUMN `achievement_details` TEXT NULL",
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

async function ensureProfileReviewNoteColumn(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN profile_review_note TEXT NULL");
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (!/Duplicate column name/i.test(msg)) throw e;
  }
}

async function ensureProfileDirectoryVisibleColumn(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN directory_visible TINYINT(1) NOT NULL DEFAULT 1");
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (!/Duplicate column name/i.test(msg)) throw e;
  }
}

function normalizeAchievementBannerTheme(raw) {
  const theme = String(raw ?? "").trim().toLowerCase();
  if (theme === "theme2" || theme === "tomato") return "theme2";
  if (theme === "theme3") return "theme3";
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
    alumni_ref_id: nullableTrim(b.alumni_ref_id),
    section: nullableTrim(b.section),
    session: nullableTrim(b.session),
    department: nullableTrim(b.department),
    university: nullableTrim(b.university),
    about: nullableTrim(b.about),
    profession: nullableTrim(b.profession),
    achievement_details: nullableTrim(b.achievement_details),
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
  if ("alumni_ref_id" in b) patch.alumni_ref_id = nullableTrim(b.alumni_ref_id);
  if ("section" in b) patch.section = nullableTrim(b.section);
  if ("session" in b) patch.session = nullableTrim(b.session);
  if ("department" in b) patch.department = nullableTrim(b.department);
  if ("university" in b) patch.university = nullableTrim(b.university);
  if ("about" in b) patch.about = nullableTrim(b.about);
  if ("profession" in b) patch.profession = nullableTrim(b.profession);
  if ("achievement_details" in b) patch.achievement_details = nullableTrim(b.achievement_details);
  return patch;
}

router.get("/users", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureProfileReviewNoteColumn(pool);
    await ensureProfileDirectoryVisibleColumn(pool);
    await ensureProfileBirthdayColumn(pool);
    await ensureProfileNicknameUniShortColumns(pool);
    const [rows] = await pool.query(
      `SELECT p.*, u.email, u.email_verified,
        (SELECT COUNT(*) FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS admin_role_count
       FROM profiles p
       LEFT JOIN users u ON u.id = p.id
       ORDER BY p.created_at DESC`
    );
    res.status(200).json((rows || []).map((r) => mapProfileRowWithAdminFlag(r)));
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load users" });
  }
});

router.get("/users/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureProfileReviewNoteColumn(pool);
    await ensureProfileDirectoryVisibleColumn(pool);
    await ensureProfileBirthdayColumn(pool);
    await ensureProfileNicknameUniShortColumns(pool);
    await ensureProfileEditAuditTable(pool);
    const [rows] = await pool.query(
      `SELECT p.*, u.email, u.email_verified,
        (SELECT COUNT(*) FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS admin_role_count
       FROM profiles p
       LEFT JOIN users u ON u.id = p.id
       WHERE p.id = ?
       LIMIT 1`,
      [req.params.id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ ok: false, error: "User not found" });
    const [auditRows] = await pool.query(
      `SELECT id, edited_at, field_key, old_value, new_value
       FROM profile_edit_audit WHERE profile_id = ? ORDER BY edited_at DESC, id DESC LIMIT 200`,
      [req.params.id]
    );
    const payload = mapProfileRowWithAdminFlag(row);
    payload.profile_edit_history = (auditRows || []).map((r) => ({
      id: r.id,
      editedAt:
        r.edited_at instanceof Date ? r.edited_at.toISOString() : r.edited_at ? String(r.edited_at) : "",
      fieldKey: r.field_key,
      oldValue: r.old_value,
      newValue: r.new_value,
    }));
    res.status(200).json(payload);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load user profile" });
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
    await ensureProfileReviewNoteColumn(pool);
    await ensureProfileDirectoryVisibleColumn(pool);
    const allowed = [
      "verified",
      "approved",
      "blocked",
      "profile_pending",
      "profile_review_note",
      "directory_visible",
    ];
    let entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (!entries.length) return res.status(400).json({ ok: false, error: "Nothing to update" });

    if (req.params.id === req.auth.userId) {
      entries = entries.filter(([k]) => k === "directory_visible");
      if (!entries.length) {
        return res.status(403).json({
          ok: false,
          error: "You cannot verify, block, or approve your own account from User Management.",
        });
      }
    }

    const normalized = entries.map(([k, v]) => {
      if (k === "directory_visible") {
        const on = v === true || v === 1 || v === "1" || v === "true";
        return [k, on ? 1 : 0];
      }
      return [k, v];
    });

    const setClause = normalized.map(([k]) => `\`${k}\` = ?`).join(", ");
    const values = normalized.map(([, v]) => v);
    await pool.query(`UPDATE profiles SET ${setClause} WHERE id = ?`, [...values, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update user" });
  }
});

// Admin: hard-delete a user + profile.
// Important: this deletes the Cloudinary photo first (best-effort), then deletes `users` row
// (profiles + roles cascade via foreign keys).
// List administrator accounts (admin UI).
router.get("/admins", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.email_verified AS email_verified, p.name AS name
       FROM user_roles ur
       INNER JOIN users u ON u.id = ur.user_id
       LEFT JOIN profiles p ON p.id = u.id
       WHERE ur.role = 'admin'
       ORDER BY u.email ASC`
    );
    res.status(200).json({ ok: true, admins: rows || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load admins" });
  }
});

// Grant admin role to an existing alumni account (by email).
router.post("/admins/grant", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const email = String(req.body?.email || "")
      .toLowerCase()
      .trim();
    if (!email) return res.status(400).json({ ok: false, error: "Email is required" });

    const [users] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    const user = users?.[0];
    if (!user) return res.status(404).json({ ok: false, error: "No user found with that email" });

    const [profiles] = await pool.query(`SELECT id FROM profiles WHERE id = ? LIMIT 1`, [user.id]);
    if (!profiles?.[0]) {
      return res.status(400).json({ ok: false, error: "That account has no profile; only registered alumni can be admins" });
    }

    const [existing] = await pool.query(
      `SELECT id FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1`,
      [user.id]
    );
    if (existing?.length) {
      await pool.query(`UPDATE profiles SET directory_visible = 1 WHERE id = ?`, [user.id]);
      return res.status(200).json({ ok: true, message: "This account is already an administrator", alreadyAdmin: true });
    }

    await pool.query(`INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`, [uuidv4(), user.id]);
    await pool.query(`UPDATE profiles SET directory_visible = 1 WHERE id = ?`, [user.id]);
    return res.status(201).json({ ok: true, message: "Administrator access granted", userId: user.id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to grant admin" });
  }
});

router.delete("/users/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const id = req.params.id;

    if (id === req.auth.userId) {
      return res.status(403).json({
        ok: false,
        error: "You cannot delete your own account from User Management.",
      });
    }

    const [urows] = await pool.query("SELECT email FROM users WHERE id = ? LIMIT 1", [id]);
    const email = String(urows?.[0]?.email || "")
      .trim()
      .toLowerCase();
    if (email === PRIMARY_ADMIN_EMAIL) {
      return res.status(403).json({
        ok: false,
        error: "The primary administrator account cannot be deleted.",
      });
    }
    if (await userHasAdminRole(pool, id)) {
      const actorEmail = await getUserEmailNormalized(pool, req.auth.userId);
      if (actorEmail !== PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({
          ok: false,
          error: "Only the primary administrator can remove other administrator accounts.",
        });
      }
    }

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
    const [rows] = await pool.query("SELECT photo_url FROM committee_members WHERE id = ? LIMIT 1", [req.params.id]);
    const existing = rows?.[0] || null;
    const hadPhoto = Object.prototype.hasOwnProperty.call(req.body || {}, "photo_url");
    const nextPhotoUrl = hadPhoto ? nullableTrim(req.body?.photo_url) : existing?.photo_url;
    await pool.query("UPDATE committee_members SET ? WHERE id = ?", [req.body, req.params.id]);
    if (hadPhoto && existing?.photo_url && existing.photo_url !== nextPhotoUrl) {
      await deleteCloudinaryImageByUrl(existing.photo_url);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update member" });
  }
});

router.delete("/committee-members/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT photo_url FROM committee_members WHERE id = ? LIMIT 1", [req.params.id]);
    await deleteCloudinaryImageByUrl(rows?.[0]?.photo_url || null);
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

/**
 * Lookup a registered alumni by Alumni ID (profiles.registration_number) to prefill achievement banner fields.
 */
router.get("/achievements/alumni-profile", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const key = String(req.query.alumni_id || "").trim();
    if (!key) {
      return res.status(400).json({ ok: false, error: "alumni_id is required" });
    }
    const [profRows] = await pool.query(
      `SELECT p.name, p.batch, p.photo, p.university, p.company, p.registration_number, p.profession, p.college_name,
              p.department, p.session, p.faculty, p.bio, p.additional_info
       FROM profiles p
       WHERE TRIM(COALESCE(p.registration_number,'')) = ?
          OR UPPER(TRIM(COALESCE(p.registration_number,''))) = UPPER(?)`,
      [key, key]
    );
    const profile = profRows?.[0];
    if (!profile) {
      return res.status(404).json({ ok: false, error: "No alumni profile found for this Alumni ID." });
    }
    const regNum =
      profile.registration_number != null ? String(profile.registration_number).trim() : key;
    const bio = profile.bio != null ? String(profile.bio).trim() : "";
    const addl = profile.additional_info != null ? String(profile.additional_info).trim() : "";
    const aboutCombined = [bio, addl].filter(Boolean).join("\n\n") || null;
    res.status(200).json({
      ok: true,
      profile: {
        name: profile.name != null ? String(profile.name).trim() : "",
        batch: profile.batch != null ? String(profile.batch).trim() : null,
        photo_url: profile.photo != null ? String(profile.photo).trim() || null : null,
        institution: profile.company != null ? String(profile.company).trim() || null : null,
        registration_number: regNum,
        profession: profile.profession != null ? String(profile.profession).trim() || null : null,
        college_name: profile.college_name != null ? String(profile.college_name).trim() || null : null,
        department: profile.department != null ? String(profile.department).trim() || null : null,
        session: profile.session != null ? String(profile.session).trim() || null : null,
        section: profile.faculty != null ? String(profile.faculty).trim() || null : null,
        university: profile.university != null ? String(profile.university).trim() || null : null,
        about: aboutCombined,
      },
    });
  } catch (e) {
    console.error("[admin] GET /achievements/alumni-profile", e);
    res.status(500).json({ ok: false, error: e.message || "Failed to load profile" });
  }
});

router.post("/achievements", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    await ensureAchievementBannerOverlayColumns(pool);
    await ensureAchievementDetailPageColumns(pool);
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
    await ensureAchievementDetailPageColumns(pool);
    const [existingRows] = await pool.query("SELECT photo_url FROM achievements WHERE id = ? LIMIT 1", [req.params.id]);
    const existing = existingRows?.[0] || null;
    const patch = achievementUpdatePatch(req.body);
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ ok: false, error: "No fields to update" });
    }
    const wcErr = validateAchievementBannerWordLimits(patch);
    if (wcErr) return res.status(400).json({ ok: false, error: wcErr });
    await pool.query("UPDATE achievements SET ? WHERE id = ?", [patch, req.params.id]);
    if (Object.prototype.hasOwnProperty.call(patch, "photo_url")) {
      const nextPhotoUrl = patch.photo_url;
      if (existing?.photo_url && existing.photo_url !== nextPhotoUrl) {
        await deleteCloudinaryImageByUrl(existing.photo_url);
      }
    }
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
    const [rows] = await pool.query("SELECT photo_url FROM achievements WHERE id = ? LIMIT 1", [req.params.id]);
    await deleteCloudinaryImageByUrl(rows?.[0]?.photo_url || null);
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
      if (raw === "theme2" || raw === "tomato") patch.banner_theme = "theme2";
      else if (raw === "theme3") patch.banner_theme = "theme3";
      else patch.banner_theme = "default";
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

/**
 * Admin-only Cloudinary orphan cleanup.
 * - apply=false (default): dry run
 * - apply=true: delete orphaned image resources
 */
router.post("/cloudinary/cleanup-orphans/start", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const apply = req.body?.apply === true || req.body?.apply === 1 || req.body?.apply === "1";
    const job = createOrphanCleanupJob({ apply, userId: req.auth.userId });
    runOrphanCleanupJob(job, pool);
    return res.status(202).json({
      ok: true,
      job_id: job.id,
      mode: job.mode,
      status: job.status,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to start Cloudinary cleanup job" });
  }
});

router.get("/cloudinary/cleanup-orphans/stream/:jobId", async (req, res) => {
  try {
    const userId = parseSseToken(req);
    if (!userId) return res.status(401).json({ ok: false, error: "Missing or invalid token" });
    req.auth = { userId };
    const pool = await withAdmin(req, res);
    if (!pool) return;

    const jobId = String(req.params.jobId || "").trim();
    const job = orphanCleanupJobs.get(jobId);
    if (!job) return res.status(404).json({ ok: false, error: "Cleanup job not found" });
    if (job.user_id !== userId) return res.status(403).json({ ok: false, error: "Forbidden" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    writeSseEvent(res, "progress", progressPayload(job));
    if (job.status === "completed" && job.result) {
      writeSseEvent(res, "result", job.result);
      return res.end();
    }
    if (job.status === "failed") {
      writeSseEvent(res, "error", { ok: false, job_id: job.id, error: job.error || "Cleanup failed" });
      return res.end();
    }

    job.subscribers.add(res);
    req.on("close", () => {
      job.subscribers.delete(res);
      try {
        res.end();
      } catch (_e) {
        // ignore
      }
    });
    return undefined;
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to stream cleanup progress" });
  }
});

router.post("/cloudinary/cleanup-orphans", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;

    const apply = req.body?.apply === true || req.body?.apply === 1 || req.body?.apply === "1";
    const referenced = await getReferencedCloudinaryImagePublicIds(pool);
    const managed = await listManagedCloudinaryImagePublicIds();
    const orphans = [...managed].filter((pid) => !referenced.has(pid));

    let deleted = 0;
    let deleteErrors = 0;
    if (apply && orphans.length > 0) {
      for (let i = 0; i < orphans.length; i += 100) {
        const chunk = orphans.slice(i, i + 100);
        try {
          const result = await cloudinary.api.delete_resources(chunk, {
            resource_type: "image",
            type: "upload",
          });
          const deletedMap = result?.deleted || {};
          for (const key of Object.keys(deletedMap)) {
            if (deletedMap[key] === "deleted") deleted += 1;
          }
        } catch (_e) {
          deleteErrors += chunk.length;
        }
      }
    }

    res.status(200).json({
      ok: true,
      dry_run: !apply,
      referenced_count: referenced.size,
      managed_count: managed.size,
      orphan_count: orphans.length,
      deleted_count: deleted,
      delete_error_count: deleteErrors,
      sample_orphans: orphans.slice(0, 30),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to cleanup Cloudinary orphans" });
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
    const [existingRows] = await pool.query("SELECT photo_url FROM memories WHERE id = ? LIMIT 1", [req.params.id]);
    const existing = existingRows?.[0] || null;
    const photoWasProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "photo_url");
    const nextPhotoUrl = photoWasProvided ? nullableTrim(req.body?.photo_url) : existing?.photo_url;
    await pool.query("UPDATE memories SET ? WHERE id = ?", [req.body, req.params.id]);
    if (photoWasProvided && existing?.photo_url && existing.photo_url !== nextPhotoUrl) {
      await deleteCloudinaryImageByUrl(existing.photo_url);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update memory" });
  }
});

router.delete("/memories/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT photo_url FROM memories WHERE id = ? LIMIT 1", [req.params.id]);
    await deleteCloudinaryImageByUrl(rows?.[0]?.photo_url || null);
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
    const [existingRows] = await pool.query("SELECT banner_url FROM events WHERE id = ? LIMIT 1", [req.params.id]);
    const existing = existingRows?.[0] || null;
    const hadBanner = Object.prototype.hasOwnProperty.call(req.body || {}, "banner_url");
    const nextBannerUrl = hadBanner ? nullableTrim(req.body?.banner_url) : existing?.banner_url;
    await pool.query("UPDATE events SET ? WHERE id = ?", [req.body, req.params.id]);
    if (hadBanner && existing?.banner_url && existing.banner_url !== nextBannerUrl) {
      await deleteCloudinaryImageByUrl(existing.banner_url);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update event" });
  }
});

router.delete("/events/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT banner_url FROM events WHERE id = ? LIMIT 1", [req.params.id]);
    await deleteCloudinaryImageByUrl(rows?.[0]?.banner_url || null);
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
    const limitParam = parseInt(req.query.limit || "0", 10);
    const limitClause = limitParam > 0 ? ` LIMIT ${limitParam}` : "";
    const [rows] = await pool.query(
      `SELECT * FROM notices ORDER BY pinned DESC, created_at DESC${limitClause}`
    );
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
    const [existingRows] = await pool.query("SELECT image_url FROM notices WHERE id = ? LIMIT 1", [req.params.id]);
    const existing = existingRows?.[0] || null;
    const hadImage = Object.prototype.hasOwnProperty.call(req.body || {}, "image_url");
    const nextImageUrl = hadImage ? nullableTrim(req.body?.image_url) : existing?.image_url;
    await pool.query("UPDATE notices SET ? WHERE id = ?", [req.body, req.params.id]);
    if (hadImage && existing?.image_url && existing.image_url !== nextImageUrl) {
      await deleteCloudinaryImageByUrl(existing.image_url);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update notice" });
  }
});

router.delete("/notices/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT image_url FROM notices WHERE id = ? LIMIT 1", [req.params.id]);
    await deleteCloudinaryImageByUrl(rows?.[0]?.image_url || null);
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
    const [existingRows] = await pool.query("SELECT photo_url FROM candidates WHERE id = ? LIMIT 1", [req.params.id]);
    const existing = existingRows?.[0] || null;
    const hadPhoto = Object.prototype.hasOwnProperty.call(req.body || {}, "photo_url");
    const nextPhotoUrl = hadPhoto ? nullableTrim(req.body?.photo_url) : existing?.photo_url;
    await pool.query("UPDATE candidates SET ? WHERE id = ?", [req.body, req.params.id]);
    if (hadPhoto && existing?.photo_url && existing.photo_url !== nextPhotoUrl) {
      await deleteCloudinaryImageByUrl(existing.photo_url);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to update candidate" });
  }
});

router.delete("/candidates/:id", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const [rows] = await pool.query("SELECT photo_url FROM candidates WHERE id = ? LIMIT 1", [req.params.id]);
    await deleteCloudinaryImageByUrl(rows?.[0]?.photo_url || null);
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

// ─────────────────────────────────────────────────────────────────────────────
// Admin Notifications (bell panel)
// ─────────────────────────────────────────────────────────────────────────────
const { ensureNoticeReadsTable } = require("../utils/ensureNoticeReadsTable");

/**
 * GET /api/admin/notifications
 * Returns admin-targeted notices (audience='admin') with DB is_read, plus
 * live pending-user counts the admin needs to action.
 */
async function safeEnsureReadsTableAdmin(pool) {
  try { await ensureNoticeReadsTable(pool); return true; } catch { return false; }
}

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const readsReady = await safeEnsureReadsTableAdmin(pool);

    const userId = req.auth.userId;
    const limit = Math.min(parseInt(req.query.limit || "10", 10) || 10, 50);

    // Admin-targeted notices with is_read (or fallback without join)
    let noticeRows;
    const adminAudience = `(
      LOWER(TRIM(COALESCE(n.audience,''))) = 'admin'
      OR LOWER(TRIM(COALESCE(n.audience,''))) = 'all'
      OR TRIM(COALESCE(n.audience,'')) = ''
    )`;
    const adminAudienceSimple = `(
      LOWER(TRIM(COALESCE(audience,''))) = 'admin'
      OR LOWER(TRIM(COALESCE(audience,''))) = 'all'
      OR TRIM(COALESCE(audience,'')) = ''
    )`;
    if (readsReady) {
      [noticeRows] = await pool.query(
        `SELECT
            n.id, n.title, n.summary, n.notice_type, n.urgent, n.pinned, n.created_at,
            CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END AS is_read
          FROM notices n
          LEFT JOIN notice_reads nr ON nr.notice_id = n.id AND nr.user_id = ?
          WHERE n.published = 1
            AND ${adminAudience}
            AND (n.expiry_date IS NULL OR n.expiry_date > NOW())
          ORDER BY n.pinned DESC, n.urgent DESC, n.created_at DESC
          LIMIT ?`,
        [userId, limit]
      );
    } else {
      [noticeRows] = await pool.query(
        `SELECT id, title, summary, notice_type, urgent, pinned, created_at, 0 AS is_read
          FROM notices
          WHERE published = 1
            AND ${adminAudienceSimple}
            AND (expiry_date IS NULL OR expiry_date > NOW())
          ORDER BY pinned DESC, urgent DESC, created_at DESC
          LIMIT ?`,
        [limit]
      );
    }

    // Count profiles awaiting admin review
    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM profiles WHERE profile_pending = 1`
    );
    const pendingUsers = Number(pendingRows?.[0]?.cnt ?? 0);

    return res.status(200).json({
      notices: noticeRows || [],
      pending_users: pendingUsers,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load notifications" });
  }
});

/**
 * POST /api/admin/notifications/notices/:id/read
 * Mark a single admin notice as read.
 */
router.post("/notifications/notices/:id/read", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const ready = await safeEnsureReadsTableAdmin(pool);
    if (!ready) return res.status(200).json({ ok: true });

    const userId = req.auth.userId;
    const noticeId = req.params.id;

    await pool.query(
      `INSERT IGNORE INTO notice_reads (id, notice_id, user_id) VALUES (UUID(), ?, ?)`,
      [noticeId, userId]
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to mark as read" });
  }
});

/**
 * POST /api/admin/notifications/notices/read-all
 * Mark all visible admin notices as read.
 */
router.post("/notifications/notices/read-all", requireAuth, async (req, res) => {
  try {
    const pool = await withAdmin(req, res);
    if (!pool) return;
    const ready = await safeEnsureReadsTableAdmin(pool);
    if (!ready) return res.status(200).json({ ok: true, marked: 0 });

    const userId = req.auth.userId;

    const [unread] = await pool.query(
      `SELECT n.id
        FROM notices n
        LEFT JOIN notice_reads nr ON nr.notice_id = n.id AND nr.user_id = ?
        WHERE n.published = TRUE
          AND (
            LOWER(TRIM(COALESCE(n.audience,''))) = 'admin'
            OR LOWER(TRIM(COALESCE(n.audience,'')) ) = 'all'
            OR TRIM(COALESCE(n.audience,'')) = ''
          )
          AND (n.expiry_date IS NULL OR n.expiry_date > NOW())
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
    return res.status(500).json({ ok: false, error: e.message || "Failed to mark all as read" });
  }
});

module.exports = router;

