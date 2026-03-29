const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const env = require("../config/env");
const { v4: uuidv4 } = require("uuid");
const { getOrCreatePool } = require("../db/pool");
const { signJwt } = require("./jwt");

function normalizeName(displayName) {
  if (!displayName) return { firstName: "", lastName: "" };
  const parts = String(displayName).split(" ").filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

/** Pull email + display name from Google profile (register flow; no DB writes). */
function extractGoogleRegisterDraft(profile) {
  const googleSub = profile?.id ? String(profile.id) : null;
  const email = profile?.emails?.[0]?.value ? String(profile.emails[0].value).toLowerCase().trim() : null;
  const displayName = profile?.displayName ? String(profile.displayName) : "";
  const { firstName, lastName } = normalizeName(displayName);
  const name = String(`${firstName} ${lastName}`.trim() || displayName || "").trim();
  if (!googleSub || !email) return null;
  return { googleSub, email, name };
}

async function assertGoogleRegisterAllowed(pool, draft) {
  const [idRows] = await pool.query(`SELECT user_id FROM google_identities WHERE google_sub = ? LIMIT 1`, [draft.googleSub]);
  if (idRows?.[0]) return { ok: false, code: "already_linked" };
  const [userRows] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [draft.email]);
  if (userRows?.[0]) return { ok: false, code: "email_registered" };
  return { ok: true };
}

async function loadGoogleUserSession(pool, userId) {
  const [profileRows] = await pool.query(`SELECT * FROM profiles WHERE id = ? LIMIT 1`, [userId]);
  const p = profileRows?.[0] || {};
  const needsProfile = !p.name || !p.phone || !p.batch || !p.department;
  return {
    userId,
    isNewUser: false,
    needsProfile,
    approved: Boolean(p.approved),
    verified: Boolean(p.verified),
    blocked: Boolean(p.blocked),
  };
}

async function linkGoogleToExistingUser(pool, googleSub, userId, _profile) {
  try {
    await pool.query(`INSERT INTO google_identities (id, user_id, google_sub) VALUES (?, ?, ?)`, [
      uuidv4(),
      userId,
      googleSub,
    ]);
  } catch (e) {
    if (e.code !== "ER_DUP_ENTRY") throw e;
    const [dupRows] = await pool.query(`SELECT user_id FROM google_identities WHERE google_sub = ? LIMIT 1`, [googleSub]);
    const linkedId = dupRows?.[0]?.user_id;
    if (!linkedId) throw e;
    userId = linkedId;
  }

  await pool.query(
    `UPDATE profiles SET verified = true, approved = COALESCE(approved, false), blocked = COALESCE(blocked, false), profile_pending = false
     WHERE id = ?`,
    [userId]
  );
  const [profileRows] = await pool.query(`SELECT * FROM profiles WHERE id = ? LIMIT 1`, [userId]);
  const p = profileRows?.[0] || {};
  const needsProfile = !p.name || !p.phone || !p.batch || !p.department;
  if (needsProfile) {
    await pool.query(`UPDATE profiles SET profile_pending = true WHERE id = ?`, [userId]);
  }

  return {
    userId,
    isNewUser: false,
    needsProfile,
    approved: Boolean(p.approved),
    verified: Boolean(p.verified),
    blocked: Boolean(p.blocked),
  };
}

function configureGooglePassport() {
  if (!env.google.clientId || !env.google.clientSecret || !env.google.callbackUrl) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, _params, profile, done) => {
        try {
          const state = String(req.query.state || "login");
          const pool = getOrCreatePool();
          if (!pool) throw new Error("MySQL not configured");

          if (state === "register") {
            return done(null, { registerDraft: true, profile, fromLogin: false });
          }

          const draft = extractGoogleRegisterDraft(profile);
          if (!draft) throw new Error("Google profile missing id or email");

          const [identityRows] = await pool.query(
            `SELECT user_id FROM google_identities WHERE google_sub = ? LIMIT 1`,
            [draft.googleSub]
          );
          if (identityRows?.[0]?.user_id) {
            const result = await loadGoogleUserSession(pool, identityRows[0].user_id);
            const token = signJwt(result.userId, { rememberMe: true });
            return done(null, { ...result, token });
          }

          const [userRows] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [draft.email]);
          if (userRows?.[0]?.id) {
            const result = await linkGoogleToExistingUser(pool, draft.googleSub, userRows[0].id, profile);
            const token = signJwt(result.userId, { rememberMe: true });
            return done(null, { ...result, token });
          }

          // New Google identity + email not in DB — same as manual register: full form required before account exists.
          return done(null, { registerDraft: true, profile, fromLogin: true });
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}

module.exports = {
  configureGooglePassport,
  extractGoogleRegisterDraft,
  assertGoogleRegisterAllowed,
  loadGoogleUserSession,
  linkGoogleToExistingUser,
};
