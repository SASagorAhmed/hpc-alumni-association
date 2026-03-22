const env = require("../config/env");

const ALLOWED_UPLOAD_MODULES = new Set([
  "profile",
  "elections",
  "achievements",
  "memories",
  "committee",
  "documents",
  "notices",
  "events",
  "candidates",
]);

function getCloudinaryFolder(moduleName) {
  const base = env.cloudinary.folder || "hpc-alumni";
  const normalized = String(moduleName || "").trim().toLowerCase();

  if (!ALLOWED_UPLOAD_MODULES.has(normalized)) {
    throw new Error(
      `Unsupported upload module "${moduleName}". Allowed: ${Array.from(ALLOWED_UPLOAD_MODULES).join(", ")}`
    );
  }

  return `${base}/${normalized}`;
}

module.exports = {
  ALLOWED_UPLOAD_MODULES,
  getCloudinaryFolder,
};

