const env = require("../config/env");
const { DEFAULT_NOTICE_EMAIL_TEMPLATE_CONFIG } = require("./emailTemplateConfig");

const BRAND_NAME = "HPC Alumni Association";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeUrl(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return "";
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toBodyHtml(value) {
  const safe = escapeHtml(String(value || "").trim());
  if (!safe) return "";
  return safe.replace(/\r?\n/g, "<br />");
}

function buildMetaRows({ notice, recipient }) {
  const rows = [];

  const createdAt = formatDateTime(notice.created_at);
  if (createdAt) rows.push(["Published", createdAt]);

  if (recipient?.batch) rows.push(["Batch", String(recipient.batch)]);
  if (recipient?.department) rows.push(["Department", String(recipient.department)]);

  return rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:12px;line-height:18px;vertical-align:top;">${escapeHtml(k)}</td>
          <td style="padding:4px 0;color:#0f172a;font-size:12px;line-height:18px;font-weight:600;vertical-align:top;text-align:right;">${escapeHtml(v)}</td>
        </tr>`
    )
    .join("");
}

function buildNoticeSubject(notice) {
  const prefix = notice?.urgent ? "[URGENT]" : "[Notice]";
  const title = String(notice?.title || "Alumni Notice").trim();
  return `${prefix} ${title}`;
}

function renderTemplateText(template, tokens) {
  const src = String(template || "");
  return src.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key) => String(tokens?.[key] ?? ""));
}

function resolveVariantTemplate(isUrgent, templateConfig) {
  const variantKey = isUrgent ? "urgent" : "normal";
  const defaults = DEFAULT_NOTICE_EMAIL_TEMPLATE_CONFIG[variantKey] || {};
  const candidate = templateConfig && typeof templateConfig === "object" ? templateConfig[variantKey] : null;
  const merged = { ...defaults };
  if (candidate && typeof candidate === "object") {
    for (const [k, v] of Object.entries(candidate)) {
      if (typeof v === "string" && v.trim()) merged[k] = v.trim();
    }
  }
  return merged;
}

function renderNoticeEmail({ notice, recipient, frontendBaseUrl, presidentName, templateConfig }) {
  const safeNotice = notice || {};
  const safeRecipient = recipient || {};

  const recipientName = String(safeRecipient.name || "Alumni Member").trim() || "Alumni Member";
  const title = String(safeNotice.title || "Alumni Notice").trim() || "Alumni Notice";
  const summary = String(safeNotice.summary || "").trim();
  const body = String(safeNotice.content || "").trim();
  const isUrgent = Boolean(safeNotice.urgent);
  const variantTemplate = resolveVariantTemplate(isUrgent, templateConfig);
  const preheader = summary || `Official notice from ${BRAND_NAME}`;

  const palette = isUrgent
    ? {
        accent: "#b91c1c",
        bannerBg: "#fef2f2",
        badgeBg: "#fee2e2",
        badgeColor: "#7f1d1d",
        bodyStripe: "#16a34a",
        bodyBg: "#f0fdf4",
        ctaBg: "#b91c1c",
        linkColor: "#0f766e",
      }
    : {
        accent: "#15803d",
        bannerBg: "#ecfdf3",
        badgeBg: "#dcfce7",
        badgeColor: "#166534",
        bodyStripe: "#16a34a",
        bodyBg: "#f0fdf4",
        ctaBg: "#15803d",
        linkColor: "#166534",
      };

  const ctaUrl = normalizeUrl(safeNotice.external_link);
  const fallbackPortalUrl = `${String(frontendBaseUrl || "").replace(/\/$/, "")}/notices`;
  const safePortalUrl = normalizeUrl(fallbackPortalUrl) || "";
  const websiteUrl = normalizeUrl(env.noticeFooter?.websiteUrl);
  const facebookUrl = normalizeUrl(env.noticeFooter?.facebookUrl);
  const groupUrl = normalizeUrl(env.noticeFooter?.groupUrl);

  const metaRows = buildMetaRows({ notice: safeNotice, recipient: safeRecipient });
  const bodyHtml = toBodyHtml(body);
  const summaryHtml = summary ? `<p style="margin:0;font-size:16px;line-height:26px;color:#334155;">${escapeHtml(summary)}</p>` : "";
  const rawSubject = renderTemplateText(variantTemplate.subject_template, { title }) || buildNoticeSubject(safeNotice);
  const subject = String(rawSubject).trim() || buildNoticeSubject(safeNotice);
  const priorityLabel = variantTemplate.badge_label || (isUrgent ? "Urgent Notice" : "Official Notice");
  const greetingLine = renderTemplateText(variantTemplate.greeting_template, { recipient_name: recipientName }) || `Dear ${recipientName},`;
  const createdAt = formatDateTime(safeNotice.created_at);
  const signerName = String(presidentName || "").trim();
  const issuedLabel = variantTemplate.issued_label || "Issued";
  const ctaLabel = variantTemplate.cta_label || "View Full Notice";
  const portalLabel = variantTemplate.portal_label || "Open notices portal";
  const officialLine =
    renderTemplateText(variantTemplate.official_line_template, { brand_name: BRAND_NAME }) ||
    `This is an official communication from ${BRAND_NAME}.`;
  const sentByLine =
    renderTemplateText(variantTemplate.sent_by_template, { president_name: signerName || "President" }) ||
    `Sent by ${signerName || "President"}, President`;
  const officeSubtitle = variantTemplate.office_subtitle || "Office of the President · Official Alumni Communication";
  const websiteLabel = variantTemplate.website_label || "Website";
  const facebookLabel = variantTemplate.facebook_label || "Facebook";
  const groupLabel = variantTemplate.group_label || "Alumni Group";

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f8fafc;padding:0;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:0;background:${palette.bannerBg};border-bottom:1px solid #e2e8f0;">
                <div style="height:8px;background:${palette.accent};"></div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:20px 24px 12px;">
                      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700;">
                        ${escapeHtml(BRAND_NAME)}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 20px;">
                      <span style="display:inline-block;padding:7px 11px;border-radius:9999px;font-size:12px;font-weight:800;background:${palette.badgeBg};color:${palette.badgeColor};">
                        ${escapeHtml(priorityLabel)}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 8px;">
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#475569;">
                  ${escapeHtml(greetingLine)}
                </p>
                <h1 style="margin:0 0 14px;font-size:34px;line-height:1.2;color:#0f172a;font-weight:800;">
                  ${escapeHtml(title)}
                </h1>
                ${summaryHtml}
              </td>
            </tr>
            ${
              bodyHtml
                ? `
            <tr>
              <td style="padding:12px 24px 4px;border-left:4px solid ${palette.bodyStripe};background:${palette.bodyBg};">
                <div style="font-size:15px;line-height:1.72;color:#0f172a;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:18px 24px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:12px 14px;">
                  ${metaRows}
                </table>
              </td>
            </tr>
            ${
              ctaUrl
                ? `
            <tr>
              <td style="padding:14px 24px 2px;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 18px;background:${palette.ctaBg};color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
                  ${escapeHtml(ctaLabel)}
                </a>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:20px 24px 24px;">
                <p style="margin:0 0 8px;font-size:12px;line-height:19px;color:#64748b;">
                  ${escapeHtml(officialLine)}
                </p>
                ${
                  createdAt
                    ? `<p style="margin:0 0 8px;font-size:12px;line-height:19px;color:#64748b;">${escapeHtml(
                        issuedLabel
                      )}: ${escapeHtml(createdAt)}</p>`
                    : ""
                }
                ${
                  safePortalUrl
                    ? `<p style="margin:0;font-size:12px;line-height:19px;color:#64748b;">${escapeHtml(portalLabel)}: <a href="${escapeHtml(
                        safePortalUrl
                      )}" style="color:${palette.linkColor};text-decoration:none;">${escapeHtml(safePortalUrl)}</a></p>`
                    : ""
                }
                <div style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:13px;line-height:20px;color:#0f172a;font-weight:700;">
                    ${escapeHtml(sentByLine)}
                  </p>
                  <p style="margin:2px 0 0;font-size:12px;line-height:19px;color:#64748b;">
                    ${escapeHtml(officeSubtitle)}
                  </p>
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:10px;">
                  <tr>
                    ${
                      websiteUrl
                        ? `<td style="padding:4px 0;font-size:12px;line-height:18px;"><a href="${escapeHtml(websiteUrl)}" style="color:#15803d;text-decoration:none;">🌐 ${escapeHtml(
                            websiteLabel
                          )}</a></td>`
                        : `<td style="padding:4px 0;font-size:12px;line-height:18px;color:#64748b;">🌐 ${escapeHtml(
                            websiteLabel
                          )}</td>`
                    }
                    ${
                      facebookUrl
                        ? `<td style="padding:4px 0;font-size:12px;line-height:18px;text-align:center;"><a href="${escapeHtml(facebookUrl)}" style="color:#1d4ed8;text-decoration:none;">📘 ${escapeHtml(
                            facebookLabel
                          )}</a></td>`
                        : `<td style="padding:4px 0;font-size:12px;line-height:18px;text-align:center;color:#64748b;">📘 ${escapeHtml(
                            facebookLabel
                          )}</td>`
                    }
                    ${
                      groupUrl
                        ? `<td style="padding:4px 0;font-size:12px;line-height:18px;text-align:right;"><a href="${escapeHtml(groupUrl)}" style="color:#9333ea;text-decoration:none;">👥 ${escapeHtml(
                            groupLabel
                          )}</a></td>`
                        : `<td style="padding:4px 0;font-size:12px;line-height:18px;text-align:right;color:#64748b;">👥 ${escapeHtml(
                            groupLabel
                          )}</td>`
                    }
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textParts = [
    `${BRAND_NAME}`,
    `${priorityLabel}: ${title}`,
    summary || "",
    body || "",
    recipient?.batch ? `Batch: ${recipient.batch}` : "",
    recipient?.department ? `Department: ${recipient.department}` : "",
    sentByLine || "",
    ctaUrl ? `${ctaLabel}: ${ctaUrl}` : "",
    safePortalUrl ? `${portalLabel}: ${safePortalUrl}` : "",
    websiteUrl ? `${websiteLabel}: ${websiteUrl}` : "",
    facebookUrl ? `${facebookLabel}: ${facebookUrl}` : "",
    groupUrl ? `${groupLabel}: ${groupUrl}` : "",
  ].filter(Boolean);

  return {
    subject,
    html,
    text: textParts.join("\n\n"),
  };
}

module.exports = {
  renderNoticeEmail,
  buildNoticeSubject,
};
