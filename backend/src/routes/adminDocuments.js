const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { getOrCreatePool } = require("../db/pool");
const { requireAuth } = require("../auth/jwt");
const { v4: uuidv4 } = require("uuid");
const { getCloudinaryFolder } = require("../utils/uploadFolders");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function parseBool(v, fallback = false) {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

async function requireAdmin(pool, userId) {
  const [rows] = await pool.query(`SELECT role FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1`, [userId]);
  return (rows || []).length > 0;
}

async function uploadToCloudinary(file, { folder, resourceType } = {}) {
  const base64 = file.buffer.toString("base64");
  const dataUri = `data:${file.mimetype};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: folder || getCloudinaryFolder("documents"),
    resource_type: resourceType || "auto",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
}

// POST /api/admin/documents (multipart)
router.post(
  "/documents",
  requireAuth,
  async (req, res, next) => {
    try {
      const pool = getOrCreatePool();
      if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
      const isAdmin = await requireAdmin(pool, req.auth.userId);
      if (!isAdmin) return res.status(403).json({ ok: false, error: "Admin only" });
      req._pool = pool;
      return next();
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message || "Auth failed" });
    }
  },
  upload.single("file"),
  async (req, res) => {
    try {
      const pool = req._pool;
      if (!req.file) return res.status(400).json({ ok: false, error: "Missing file" });

      const {
        category,
        title,
        description,
        visibility,
        published,
        pinned,
      } = req.body || {};

      if (!category || !title) return res.status(400).json({ ok: false, error: "Missing category or title" });

      const { secure_url } = await uploadToCloudinary(req.file, {
        folder: getCloudinaryFolder("documents"),
        resourceType: req.file.mimetype.startsWith("image/") ? "image" : "raw",
      });

      const docId = uuidv4();

      await pool.query(
        `INSERT INTO documents
          (id, category, title, description, file_url, file_name, file_type, file_size, visibility, published, pinned, uploaded_by)
         VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          category,
          title,
          description || null,
          secure_url,
          req.file.originalname || null,
          req.file.mimetype || null,
          req.file.size || null,
          visibility || "public",
          parseBool(published, false),
          parseBool(pinned, false),
          req.auth.userId,
        ]
      );

      return res.status(201).json({ ok: true, id: docId, file_url: secure_url });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message || "Failed to upload document" });
    }
  }
);

// PUT /api/admin/documents/:id (multipart; file optional)
router.put(
  "/documents/:id",
  requireAuth,
  async (req, res, next) => {
    try {
      const pool = getOrCreatePool();
      if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
      const isAdmin = await requireAdmin(pool, req.auth.userId);
      if (!isAdmin) return res.status(403).json({ ok: false, error: "Admin only" });
      req._pool = pool;
      return next();
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message || "Auth failed" });
    }
  },
  upload.single("file"),
  async (req, res) => {
    try {
      const pool = req._pool;
      const { id } = req.params;

      const {
        category,
        title,
        description,
        visibility,
        published,
        pinned,
      } = req.body || {};

      const updates = {
        category: category || null,
        title: title || null,
        description: description || null,
        visibility: visibility || "public",
        published: parseBool(published, false),
        pinned: parseBool(pinned, false),
      };

      // If a file is provided, upload and set file fields.
      if (req.file) {
        const { secure_url } = await uploadToCloudinary(req.file, {
          folder: getCloudinaryFolder("documents"),
          resourceType: req.file.mimetype.startsWith("image/") ? "image" : "raw",
        });
        updates.file_url = secure_url;
        updates.file_name = req.file.originalname || null;
        updates.file_type = req.file.mimetype || null;
        updates.file_size = req.file.size || null;
      }

      // Build update query dynamically.
      const fields = [];
      const values = [];

      const pushField = (key, value) => {
        fields.push(`\`${key}\` = ?`);
        values.push(value);
      };

      Object.entries(updates).forEach(([k, v]) => pushField(k, v));

      const sql = `UPDATE documents SET ${fields.join(", ")} WHERE id = ?`;
      values.push(id);

      await pool.query(sql, values);

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message || "Failed to update document" });
    }
  }
);

// PATCH /api/admin/documents/:id (JSON; no upload)
router.patch("/documents/:id", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const isAdmin = await requireAdmin(pool, req.auth.userId);
    if (!isAdmin) return res.status(403).json({ ok: false, error: "Admin only" });

    const { published, pinned } = req.body || {};
    const fields = [];
    const values = [];

    if (published !== undefined) {
      fields.push("published = ?");
      values.push(parseBool(published, false));
    }

    if (pinned !== undefined) {
      fields.push("pinned = ?");
      values.push(parseBool(pinned, false));
    }

    if (fields.length === 0) {
      return res.status(400).json({ ok: false, error: "Nothing to update" });
    }

    const sql = `UPDATE documents SET ${fields.join(", ")} WHERE id = ?`;
    values.push(req.params.id);
    await pool.query(sql, values);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to update document" });
  }
});

// GET /api/admin/documents (admin listing)
router.get("/documents", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const isAdmin = await requireAdmin(pool, req.auth.userId);
    if (!isAdmin) return res.status(403).json({ ok: false, error: "Admin only" });

    const publishedOnly = req.query.publishedOnly ? String(req.query.publishedOnly).toLowerCase() === "true" : false;

    const [rows] = await pool.query(
      `SELECT
        id,
        title,
        description,
        category,
        file_url,
        file_name,
        file_type,
        file_size,
        visibility,
        published,
        pinned,
        uploaded_by,
        created_at,
        updated_at
      FROM documents
      ${publishedOnly ? "WHERE published = true" : ""}
      ORDER BY pinned DESC, created_at DESC`
    );

    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load documents" });
  }
});

// DELETE /api/admin/documents/:id
router.delete("/documents/:id", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    const isAdmin = await requireAdmin(pool, req.auth.userId);
    if (!isAdmin) return res.status(403).json({ ok: false, error: "Admin only" });

    await pool.query(`DELETE FROM documents WHERE id = ?`, [req.params.id]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to delete document" });
  }
});

module.exports = router;

