const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const env = require("../config/env");
const { v4: uuidv4 } = require("uuid");
const { getOrCreatePool } = require("../db/pool");
const { hashPassword } = require("./password");
const { signJwt } = require("./jwt");

function normalizeName(displayName) {
  if (!displayName) return { firstName: "", lastName: "" };
  const parts = String(displayName).split(" ").filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

async function findOrCreateUserFromGoogle(profile) {
  const pool = getOrCreatePool();
  if (!pool) throw new Error("MySQL not configured");

  const googleSub = profile?.id ? String(profile.id) : null;
  const email = profile?.emails?.[0]?.value ? String(profile.emails[0].value).toLowerCase() : null;
  const displayName = profile?.displayName ? String(profile.displayName) : "";

  if (!googleSub || !email) throw new Error("Google profile missing id or email");

  // 1) Existing identity?
  const [identityRows] = await pool.query(
    `SELECT * FROM google_identities WHERE google_sub = ? LIMIT 1`,
    [googleSub]
  );
  const identity = identityRows?.[0];

  if (identity?.user_id) {
    const [profileRows] = await pool.query(`SELECT * FROM profiles WHERE id = ? LIMIT 1`, [identity.user_id]);
    const p = profileRows?.[0] || {};
    const needsProfile = !p.name || !p.phone || !p.batch || !p.department;
    return {
      userId: identity.user_id,
      isNewUser: false,
      needsProfile,
      approved: Boolean(p.approved),
      verified: Boolean(p.verified),
      blocked: Boolean(p.blocked),
    };
  }

  // 2) Existing user by email?
  const [userRows] = await pool.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
  let userId = userRows?.[0]?.id || null;

  let isNewUser = false;
  if (!userId) {
    // Create new user
    userId = uuidv4();
    isNewUser = true;
    const randomPassword = uuidv4(); // unused for Google users
    const passwordHash = await hashPassword(randomPassword);

    await pool.query(
      `INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, true)`,
      [userId, email, passwordHash]
    );

    const { firstName, lastName } = normalizeName(displayName);
    const name = String(`${firstName} ${lastName}`.trim() || displayName || "").trim() || "Google User";

    await pool.query(
      `INSERT INTO profiles (
        id, name, phone, batch, department,
        verified, approved, blocked, profile_pending,
        social_links, photo
      ) VALUES (?, ?, NULL, NULL, NULL, true, false, false, true, NULL, ?)`,
      [userId, name, profile?.photos?.[0]?.value || null]
    );

    // Default role: user
    await pool.query(
      `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'user')`,
      [uuidv4(), userId]
    );
  }

  // 3) Create identity link (handle rare duplicate / double callback)
  try {
    await pool.query(`INSERT INTO google_identities (id, user_id, google_sub) VALUES (?, ?, ?)`, [
      uuidv4(),
      userId,
      googleSub,
    ]);
  } catch (e) {
    if (e.code !== "ER_DUP_ENTRY") throw e;
    const [dupRows] = await pool.query(
      `SELECT user_id FROM google_identities WHERE google_sub = ? LIMIT 1`,
      [googleSub]
    );
    const linkedId = dupRows?.[0]?.user_id;
    if (!linkedId) throw e;
    userId = linkedId;
  }

  // Ensure profile exists + is marked verified
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
    isNewUser,
    needsProfile,
    approved: Boolean(p.approved),
    verified: Boolean(p.verified),
    blocked: Boolean(p.blocked),
  };
}

function configureGooglePassport() {
  if (!env.google.clientId || !env.google.clientSecret || !env.google.callbackUrl) {
    // Don’t throw at boot; Google login won’t work until env is set.
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
      // Use 6-arg form so `profile` is always the real Google profile (not token params).
      async (req, accessToken, refreshToken, _params, profile, done) => {
        try {
          const result = await findOrCreateUserFromGoogle(profile);
          const token = signJwt(result.userId, { rememberMe: true });
          return done(null, { ...result, token });
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}

module.exports = {
  configureGooglePassport,
  findOrCreateUserFromGoogle,
};

