require("dotenv").config();

const rawFrontend = String(process.env.FRONTEND_ORIGIN || "http://localhost:8080").trim();
const frontendOrigins = rawFrontend
  .split(",")
  .map((v) => v.trim().replace(/\/$/, ""))
  .filter(Boolean);
/** First origin only — used for email-verification redirects (comma-separated FRONTEND_ORIGIN breaks URLs if used whole). */
const frontendRedirectOrigin = frontendOrigins[0] || "http://localhost:8080";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8081),
  /** @deprecated Prefer frontendRedirectOrigin / frontendOrigins; kept as primary origin for redirects */
  frontendOrigin: frontendRedirectOrigin,
  frontendOrigins,
  frontendRedirectOrigin,
  /**
   * Public base URL of this API (no trailing slash), e.g. https://api.yourdomain.com
   * Used in verification emails so links work behind proxies and custom domains.
   * Falls back to request Host at send time if unset.
   */
  publicApiUrl: String(process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || "").trim().replace(/\/$/, ""),

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    sslMode: process.env.DB_SSL_MODE || "DISABLED",
    // Either provide DB_SSL_CA (paste PEM text) or DB_SSL_CA_PATH (path to a .pem file)
    sslCa: process.env.DB_SSL_CA || "",
    sslCaPath: process.env.DB_SSL_CA_PATH || "",
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED || "true",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "change_me",
    /** Default when signJwt is called without rememberMe (e.g. legacy callers). */
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    /** Short-lived JWT when the user does not check "Remember me". */
    expiresInSession: process.env.JWT_EXPIRES_IN_SESSION || "1d",
    /** Long-lived JWT when "Remember me" is checked (or OAuth). */
    expiresInRemember: process.env.JWT_EXPIRES_IN_REMEMBER || "30d",
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },

  noticeFooter: {
    websiteUrl: String(process.env.NOTICE_FOOTER_WEBSITE_URL || "").trim(),
    facebookUrl: String(process.env.NOTICE_FOOTER_FACEBOOK_URL || "").trim(),
    groupUrl: String(process.env.NOTICE_FOOTER_GROUP_URL || "").trim(),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || "hpc-alumni",
  },
};

function assertRequired(value, label) {
  if (!value) {
    throw new Error(`[env] Missing required: ${label}`);
  }
}

// Note: we intentionally do NOT hard-fail at boot when DB credentials are missing.
// This keeps `/health` usable while you configure your environment.

module.exports = env;

