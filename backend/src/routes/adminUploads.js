const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { requireAuth } = require("../auth/jwt");
const { getOrCreatePool } = require("../db/pool");
const { ALLOWED_UPLOAD_MODULES, getCloudinaryFolder } = require("../utils/uploadFolders");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

async function requireAdmin(pool, userId) {
  const [rows] = await pool.query(
    `SELECT role FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1`,
    [userId]
  );
  return (rows || []).length > 0;
}

// POST /api/admin/uploads/:module
// Uses separate Cloudinary folders by module:
// hpc-alumni/profile, hpc-alumni/elections, hpc-alumni/achievements, etc.
router.post("/uploads/:module", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const moduleName = String(req.params.module || "").toLowerCase();
    if (!ALLOWED_UPLOAD_MODULES.has(moduleName)) {
      return res.status(400).json({
        ok: false,
        error: `Unsupported module "${moduleName}"`,
        allowed_modules: Array.from(ALLOWED_UPLOAD_MODULES),
      });
    }

    // Keep profile uploads available to authenticated users.
    // Other modules are admin-only.
    if (moduleName !== "profile") {
      const isAdmin = await requireAdmin(pool, req.auth.userId);
      if (!isAdmin) return res.status(403).json({ ok: false, error: "Admin only for this module" });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Missing file (field name: file)" });
    }

    const folder = getCloudinaryFolder(moduleName);
    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;
    const resourceType = req.file.mimetype.startsWith("image/") ? "image" : "raw";

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    return res.status(200).json({
      ok: true,
      module: moduleName,
      folder,
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      bytes: result.bytes,
      format: result.format,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Upload failed" });
  }
});

module.exports = router;

