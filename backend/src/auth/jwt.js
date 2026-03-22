const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signJwt(userId) {
  return jwt.sign({ sub: userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function verifyJwt(token) {
  return jwt.verify(token, env.jwt.secret);
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
};

