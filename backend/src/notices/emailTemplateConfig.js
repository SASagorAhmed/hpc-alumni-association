const { ensureNoticeEmailTemplateTable } = require("../utils/ensureNoticeEmailTemplateTable");

const TEMPLATE_ROW_ID = 1;

const DEFAULT_VARIANT = Object.freeze({
  subject_template: "[Notice] {{title}}",
  badge_label: "Official Notice",
  greeting_template: "Dear {{recipient_name}},",
  cta_label: "View Full Notice",
  official_line_template: "This is an official communication from {{brand_name}}.",
  issued_label: "Issued",
  portal_label: "Open notices portal",
  sent_by_template: "Sent by {{president_name}}, President",
  office_subtitle: "Office of the President · Official Alumni Communication",
  website_label: "Website",
  facebook_label: "Facebook",
  group_label: "Alumni Group",
});

const DEFAULT_NOTICE_EMAIL_TEMPLATE_CONFIG = Object.freeze({
  urgent: {
    ...DEFAULT_VARIANT,
    subject_template: "[URGENT] {{title}}",
    badge_label: "Urgent Notice",
  },
  normal: {
    ...DEFAULT_VARIANT,
    subject_template: "[Notice] {{title}}",
    badge_label: "Official Notice",
  },
});

function deepCloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_NOTICE_EMAIL_TEMPLATE_CONFIG));
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function sanitizeText(value, maxLen = 300) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.slice(0, maxLen);
}

function sanitizeVariant(rawVariant, defaults) {
  const input = rawVariant && typeof rawVariant === "object" ? rawVariant : {};
  const out = {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    out[key] = sanitizeText(Object.prototype.hasOwnProperty.call(input, key) ? input[key] : defaultValue, 400);
    if (!out[key]) out[key] = defaultValue;
  }
  return out;
}

function validateVariant(variant, label) {
  const errors = [];
  if (!String(variant.subject_template || "").includes("{{title}}")) {
    errors.push(`${label}.subject_template must include {{title}}`);
  }
  if (!String(variant.greeting_template || "").includes("{{recipient_name}}")) {
    errors.push(`${label}.greeting_template must include {{recipient_name}}`);
  }
  if (!String(variant.sent_by_template || "").includes("{{president_name}}")) {
    errors.push(`${label}.sent_by_template must include {{president_name}}`);
  }
  return errors;
}

function mergeWithDefaults(rawConfig) {
  const defaults = deepCloneDefaults();
  const cfg = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
  const urgent = sanitizeVariant(cfg.urgent, defaults.urgent);
  const normal = sanitizeVariant(cfg.normal, defaults.normal);
  return { urgent, normal };
}

async function getNoticeEmailTemplateConfig(pool) {
  await ensureNoticeEmailTemplateTable(pool);
  const [rows] = await pool.query(
    "SELECT urgent_template_json, normal_template_json FROM notice_email_template_config WHERE id = ? LIMIT 1",
    [TEMPLATE_ROW_ID]
  );
  const row = rows?.[0];
  if (!row) return deepCloneDefaults();

  const merged = mergeWithDefaults({
    urgent: parseJsonObject(row.urgent_template_json),
    normal: parseJsonObject(row.normal_template_json),
  });
  return merged;
}

async function saveNoticeEmailTemplateConfig(pool, payload, updatedBy) {
  await ensureNoticeEmailTemplateTable(pool);
  const merged = mergeWithDefaults(payload);

  const errors = [...validateVariant(merged.urgent, "urgent"), ...validateVariant(merged.normal, "normal")];
  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.statusCode = 400;
    throw err;
  }

  await pool.query(
    `INSERT INTO notice_email_template_config (id, urgent_template_json, normal_template_json, updated_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       urgent_template_json = VALUES(urgent_template_json),
       normal_template_json = VALUES(normal_template_json),
       updated_by = VALUES(updated_by)`,
    [TEMPLATE_ROW_ID, JSON.stringify(merged.urgent), JSON.stringify(merged.normal), updatedBy || null]
  );

  // Canonical source of truth: always return what the DB now stores.
  const persisted = await getNoticeEmailTemplateConfig(pool);
  return persisted;
}

async function resetNoticeEmailTemplateConfig(pool, updatedBy) {
  return saveNoticeEmailTemplateConfig(pool, deepCloneDefaults(), updatedBy);
}

module.exports = {
  DEFAULT_NOTICE_EMAIL_TEMPLATE_CONFIG,
  getNoticeEmailTemplateConfig,
  saveNoticeEmailTemplateConfig,
  resetNoticeEmailTemplateConfig,
};
