const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * @param {string} userId
 * @param {{ rememberMe?: boolean; expiresIn?: string }} [options]
 * - If `expiresIn` is set, it wins.
 * - Else if `rememberMe` is set, uses env.jwt.expiresInRemember or expiresInSession.
 * - Else uses env.jwt.expiresIn (backward compatible default).
 */
function signJwt(userId, options = {}) {
  let expiresIn = env.jwt.expiresIn;
  if (options.expiresIn) {
    expiresIn = options.expiresIn;
  } else if (Object.prototype.hasOwnProperty.call(options, "rememberMe")) {
    expiresIn = options.rememberMe ? env.jwt.expiresInRemember : env.jwt.expiresInSession;
  }
  return jwt.sign({ sub: userId }, env.jwt.secret, { expiresIn });
}

function verifyJwt(token) {
  return jwt.verify(token, env.jwt.secret);
}

const GOOGLE_REGISTER_DRAFT_PURPOSE = "google_register_draft";

/** Short-lived token stored in httpOnly cookie between Google OAuth and completing /register. */
function signGoogleRegisterDraftToken({ googleSub, email, name }) {
  return jwt.sign(
    { purpose: GOOGLE_REGISTER_DRAFT_PURPOSE, googleSub, email, name: name || "" },
    env.jwt.secret,
    { expiresIn: "30m" }
  );
}

function verifyGoogleRegisterDraftToken(token) {
  const decoded = jwt.verify(token, env.jwt.secret);
  if (!decoded || decoded.purpose !== GOOGLE_REGISTER_DRAFT_PURPOSE) {
    throw new Error("Invalid Google register draft");
  }
  if (!decoded.googleSub || !decoded.email) throw new Error("Invalid Google register draft payload");
  return {
    googleSub: String(decoded.googleSub),
    email: String(decoded.email).toLowerCase().trim(),
    name: String(decoded.name || "").trim(),
  };
}

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer") return null;
  return token || null;
}

function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ ok: false, error: "Missing bearer token" });

  try {
    const payload = verifyJwt(token);
    req.auth = { userId: payload.sub };
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}

module.exports = {
  signJwt,
  verifyJwt,
  requireAuth,
  signGoogleRegisterDraftToken,
  verifyGoogleRegisterDraftToken,
};

