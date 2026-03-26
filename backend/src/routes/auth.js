const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getOrCreatePool } = require("../db/pool");
const { hashPassword, verifyPassword } = require("../auth/password");
const { signJwt, requireAuth } = require("../auth/jwt");
const { sendVerificationEmail } = require("../auth/email");
const env = require("../config/env");
const passport = require("passport");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { getCloudinaryFolder } = require("../utils/uploadFolders");

const router = express.Router();
const GOOGLE_OAUTH_COOKIE = "hpc_google_oauth_token";
const GOOGLE_OAUTH_COOKIE_MAX_MS = 10 * 60 * 1000;

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

async function uploadToCloudinary(file, { folder, resourceType } = {}) {
  const base64 = file.buffer.toString("base64");
  const dataUri = `data:${file.mimetype};base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: folder || getCloudinaryFolder("profile"),
    resource_type: resourceType || "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
}

const FIXED_COLLEGE_NAME = "Hamdard Public Collage";

function trimOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

async function getUserProfile(pool, userId) {
  // Role
  const [roleRows] = await pool.query(
    `SELECT role FROM user_roles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  const isAdmin = (roleRows || []).some((r) => r.role === "admin");

  const [profileRows] = await pool.query(`SELECT * FROM profiles WHERE id = ? LIMIT 1`, [userId]);
  const p = profileRows?.[0];
  if (!p) return null;

  // In this app, "admin verified" (`profiles.verified`) is the canonical gate.
  // Some older flows still rely on `profiles.approved`, so treat verified as approved to avoid false "pending" states.
  const isVerified = Boolean(p.verified);
  const isApproved = Boolean(p.approved);

  return {
    id: p.id,
    name: p.name || "",
    email: null, // filled by caller when needed
    phone: p.phone || "",
    batch: p.batch || "",
    roll: p.roll || null,
    registrationNumber: p.registration_number || null,
    gender: p.gender || null,
    bloodGroup: p.blood_group || null,
    department: p.department || null,
    session: p.session || null,
    passingYear: p.passing_year || null,
    collegeName: p.college_name || null,
    profession: p.profession || null,
    company: p.company || null,
    university: p.university || null,
    jobStatus: p.job_status || null,
    jobTitle: p.job_title || null,
    address: p.address || null,
    bio: p.bio || null,
    additionalInfo: p.additional_info || null,
    photo: p.photo || null,
    socialLinks: p.social_links || null,
    role: isAdmin ? "admin" : "alumni",
    verified: isVerified,
    approved: isApproved,
    blocked: Boolean(p.blocked),
    profilePending: Boolean(p.profile_pending),
  };
}

// POST /api/auth/register (multipart/form-data; optional photo for Female, required for Male)
router.post("/register", profileUpload.single("photo"), async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const {
      email,
      password,
      name,
      phone,
      batch,
      department,
      roll,
      gender,
      bloodGroup,
      university,
      company,
      profession,
      address,
      bio,
      additionalInfo,
      facebook,
      instagram,
      linkedin,
    } = req.body || {};
    if (!email || !password || !name || !batch || !department || !roll || !gender) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    const emailStr = String(email).toLowerCase().trim();
    const existing = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [emailStr]);
    if ((existing[0] || []).length > 0) {
      return res.status(409).json({ ok: false, error: "Email already registered" });
    }

    const userId = uuidv4();
    const userRole = "user";
    const passwordHash = await hashPassword(password);

    const batchStr = String(batch ?? "").trim();
    const batchNum = Number(batchStr);
    if (!Number.isFinite(batchNum) || !Number.isInteger(batchNum) || batchNum < 1 || batchNum > 50) {
      return res.status(400).json({ ok: false, error: "Batch must be between 01 and 50" });
    }
    const batchNorm = String(batchNum).padStart(2, "0");

    // Department is used as "section" in this app: A..J
    // (Backward compatible: allow numeric "1".."10" too.)
    let dep = String(department ?? "").trim().toUpperCase();
    if (/^\d+$/.test(dep)) {
      const n = Number(dep);
      if (Number.isFinite(n) && n >= 1 && n <= 10) dep = String.fromCharCode(64 + n); // 1->A
    }
    if (!/^[A-J]$/.test(dep)) {
      return res.status(400).json({ ok: false, error: "Section must be A..J (A/B/C/...)" });
    }

    // Collage ID (Roll) = digits only
    const rollDigits = String(roll ?? "").replace(/\D/g, "");
    if (!rollDigits) {
      return res.status(400).json({ ok: false, error: "Collage ID (Roll) is required (digits only)" });
    }
    if (rollDigits.length > 20) {
      return res.status(400).json({ ok: false, error: "Collage ID (Roll) is too long (max 20 digits)" });
    }

    const genderRaw = String(gender ?? "").trim();
    const genderNorm = genderRaw.toLowerCase() === "male" ? "Male" : genderRaw.toLowerCase() === "female" ? "Female" : "";
    if (!genderNorm) {
      return res.status(400).json({ ok: false, error: "Gender must be Male or Female" });
    }

    let photoUrl = null;
    if (genderNorm === "Male" && !req.file) {
      return res.status(400).json({ ok: false, error: "Profile picture is required for Male" });
    }

    const bloodNorm = String(bloodGroup ?? "").trim();
    if (!bloodNorm) {
      return res.status(400).json({ ok: false, error: "Blood group is required" });
    }

    const universityNorm = trimOrNull(university);
    if (!universityNorm) {
      return res.status(400).json({ ok: false, error: "University is required" });
    }

    const fb = trimOrNull(facebook);
    const ig = trimOrNull(instagram);
    const li = trimOrNull(linkedin);
    if (!fb && !ig && !li) {
      return res.status(400).json({
        ok: false,
        error: "Provide at least one social profile link (Facebook, Instagram, or LinkedIn).",
      });
    }

    const socialLinksJson = JSON.stringify({
      facebook: fb,
      instagram: ig,
      linkedin: li,
    });

    const companyNorm = trimOrNull(company);
    const professionNorm = trimOrNull(profession);
    const addressNorm = trimOrNull(address);
    const bioNorm = trimOrNull(bio);
    const additionalNorm = trimOrNull(additionalInfo);

    if (req.file) {
      if (!String(req.file.mimetype || "").startsWith("image/")) {
        return res.status(400).json({ ok: false, error: "Photo must be an image" });
      }
      const uploaded = await uploadToCloudinary(req.file, { folder: getCloudinaryFolder("profile"), resourceType: "image" });
      photoUrl = uploaded.secure_url;
    }

    // Alumni ID = SectionLetter + 2-digit Batch + RollDigits
    const alumniId = `${dep}${batchNorm}${rollDigits}`;

    await pool.query(
      `INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, false)`,
      [userId, emailStr, passwordHash]
    );

    await pool.query(
      `INSERT INTO profiles
        (id, name, phone, batch, department, roll, registration_number,
         gender, photo, blood_group, college_name, university, company, profession,
         address, bio, additional_info, social_links,
         verified, approved, blocked, profile_pending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, false, false, false)`,
      [
        userId,
        name,
        phone || null,
        batchNorm,
        dep,
        rollDigits,
        alumniId,
        genderNorm,
        photoUrl,
        bloodNorm,
        FIXED_COLLEGE_NAME,
        universityNorm,
        companyNorm,
        professionNorm,
        addressNorm,
        bioNorm,
        additionalNorm,
        socialLinksJson,
      ]
    );

    await pool.query(
      `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
      [uuidv4(), userId, userRole]
    );

    // Create verification token
    const token = uuidv4();
    const verificationTokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO email_verification_tokens (id, user_id, token, expires_at, used_at)
       VALUES (?, ?, ?, ?, NULL)`,
      [verificationTokenId, userId, token, expiresAt]
    );

    const verificationLink = `${req.protocol}://${req.get("host")}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    try {
      await sendVerificationEmail({ email: emailStr, verificationLink });
      return res.status(201).json({ ok: true, message: "Registration successful. Check your email for verification." });
    } catch (mailErr) {
      // Keep registration usable during setup if SMTP is not configured yet.
      return res.status(201).json({
        ok: true,
        message: "Registration successful, but verification email could not be sent. Use verification_url for setup testing.",
        verification_url: verificationLink,
        email_error: mailErr.message || "SMTP send failed",
      });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Registration failed" });
  }
});

// GET /api/auth/verify-email?token=...
router.get("/verify-email", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const token = req.query.token ? String(req.query.token) : null;
    if (!token) return res.status(400).json({ ok: false, error: "Missing token" });

    const [tokenRows] = await pool.query(
      `SELECT * FROM email_verification_tokens WHERE token = ? AND used_at IS NULL LIMIT 1`,
      [token]
    );
    const row = tokenRows?.[0];
    if (!row) return res.status(400).json({ ok: false, error: "Invalid or already used token" });

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ ok: false, error: "Token expired" });
    }

    // Mark verified
    await pool.query(`UPDATE users SET email_verified = true WHERE id = ?`, [row.user_id]);
    await pool.query(`UPDATE profiles SET verified = true WHERE id = ?`, [row.user_id]);
    await pool.query(
      `UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?`,
      [row.id]
    );

    // Redirect back to frontend login
    const redirectUrl = `${env.frontendOrigin}/login`;
    return res.redirect(302, redirectUrl);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Verification failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: "Missing email or password" });

    const emailStr = String(email).toLowerCase().trim();
    const [userRows] = await pool.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [emailStr]);
    const user = userRows?.[0];
    if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const profile = await getUserProfile(pool, user.id);
    if (!profile) return res.status(403).json({ ok: false, error: "Profile not found" });
    if (profile.blocked) return res.status(403).json({ ok: false, error: "Your account has been blocked" });

    // Accept either verification flag and self-heal old/mismatched rows.
    const isVerified = Boolean(user.email_verified) || Boolean(profile.verified);
    if (!isVerified) {
      return res.status(403).json({ ok: false, error: "Please verify your email first" });
    }

    if (!user.email_verified) {
      await pool.query(`UPDATE users SET email_verified = true WHERE id = ?`, [user.id]);
    }
    if (!profile.verified) {
      await pool.query(`UPDATE profiles SET verified = true WHERE id = ?`, [user.id]);
    }

    const token = signJwt(user.id);
    // Align to AuthContext shape (email missing in getUserProfile)
    const userOut = { ...profile, email: user.email, verified: isVerified };
    return res.status(200).json({ ok: true, token, user: userOut });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const userId = req.auth.userId;
    const [userRows] = await pool.query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [userId]);
    const user = userRows?.[0];
    if (!user) return res.status(401).json({ ok: false, error: "Not authenticated" });

    const profile = await getUserProfile(pool, userId);
    if (!profile) return res.status(401).json({ ok: false, error: "Profile not found" });

    const verified = Boolean(user.email_verified) || Boolean(profile.verified);
    return res.status(200).json({ ok: true, user: { ...profile, email: user.email, verified } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to load user" });
  }
});

// GET /api/auth/google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// POST /api/auth/oauth-handoff — read one-time JWT from httpOnly cookie (set on Google callback)
router.post("/oauth-handoff", (req, res) => {
  const token = req.cookies?.[GOOGLE_OAUTH_COOKIE];
  if (!token || typeof token !== "string") {
    return res.status(401).json({ ok: false, error: "OAuth handoff missing. Try Google sign-in again." });
  }
  res.clearCookie(GOOGLE_OAUTH_COOKIE, { path: "/" });
  return res.status(200).json({ ok: true, token });
});

// GET /api/auth/google/callback
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    try {
      console.log("[google callback] err:", err ? (err.message || err) : null);
      console.log("[google callback] user keys:", user ? Object.keys(user) : null);
      console.log("[google callback] info keys:", info ? Object.keys(info) : null);

      if (err) {
        return res.redirect(302, `${env.frontendOrigin}/login?google_error=1`);
      }

      const token = user?.token || info?.token;
      if (!token) {
        return res.redirect(302, `${env.frontendOrigin}/login?google_token_missing=1`);
      }

      // Reliable cross-port handoff (JWT in URL can be dropped by some redirects / clients)
      res.cookie(GOOGLE_OAUTH_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: GOOGLE_OAUTH_COOKIE_MAX_MS,
      });

      const query = new URLSearchParams();
      query.set("oauth_handoff", "1");
      query.set("jwt", token);

      const approved = Boolean(user?.approved ?? info?.approved);
      const profileVerified = Boolean(user?.verified ?? info?.verified);
      const blocked = Boolean(user?.blocked ?? info?.blocked);
      const isNewUser = Boolean(user?.isNewUser ?? info?.isNewUser);
      const needsProfile = Boolean(user?.needsProfile ?? info?.needsProfile);

      if (isNewUser) query.set("new_google_user", "1");
      if (needsProfile) query.set("needs_profile", "1");
      if (blocked) query.set("blocked", "1");
      if (!approved && !profileVerified) query.set("pending_approval", "1");
      if (isNewUser) query.set("needs_password_setup", "1");

      const redirectUrl = `${env.frontendOrigin}/login?${query.toString()}`;
      console.log("[google callback] redirect (truncated):", redirectUrl.slice(0, 120) + (redirectUrl.length > 120 ? "…" : ""));
      return res.redirect(302, redirectUrl);
    } catch (e) {
      console.error("[google callback] handler failed:", e.message || e);
      return res.redirect(302, `${env.frontendOrigin}/login?google_callback_failed=1`);
    }
  })(req, res, next);
});

// PUT /api/auth/profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const currentProfile = await getUserProfile(pool, req.auth.userId);
    if (!currentProfile) return res.status(404).json({ ok: false, error: "Profile not found" });

    // Section, Batch, Collage ID (roll) and Alumni ID are locked after registration.
    // Only allow safe fields that the user may edit later.
    const allowed = {
      name: "name",
      phone: "phone",
      gender: "gender",
      bloodGroup: "blood_group",
      profession: "profession",
      company: "company",
      university: "university",
      address: "address",
      bio: "bio",
      additionalInfo: "additional_info",
      photo: "photo",
      socialLinks: "social_links",
    };

    const normalizeBatch2 = (b) => {
      const s = String(b ?? "").trim();
      if (!s) return "";
      if (/^\d+$/.test(s)) {
        const n = Number(s);
        if (Number.isFinite(n) && n >= 1 && n <= 50) return String(n).padStart(2, "0");
      }
      // already padded or non-numeric legacy fallback
      return s;
    };

    const currentSectionLetterRaw = String(currentProfile.department ?? "").trim().charAt(0).toUpperCase();
    const currentSectionLetter = /^[A-J]$/.test(currentSectionLetterRaw) ? currentSectionLetterRaw : "";
    const currentBatch2 = normalizeBatch2(currentProfile.batch);
    const currentRollDigits = String(currentProfile.roll ?? "").replace(/\D/g, "");
    const alumniIdComputed =
      currentSectionLetter && currentBatch2 && currentRollDigits ? `${currentSectionLetter}${currentBatch2}${currentRollDigits}` : null;

    const updates = [];
    const values = [];

    Object.entries(allowed).forEach(([apiKey, dbKey]) => {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, apiKey)) {
        updates.push(`\`${dbKey}\` = ?`);
        const value =
          apiKey === "socialLinks" && req.body[apiKey]
            ? JSON.stringify(req.body[apiKey])
            : req.body[apiKey];
        values.push(value ?? null);
      }
    });

    // Keep alumni ID consistent with locked Section/Batch/Roll (do not accept any user edits for these fields).
    if (alumniIdComputed && (!currentProfile.registrationNumber || currentProfile.registrationNumber !== alumniIdComputed)) {
      updates.push("`registration_number` = ?");
      values.push(alumniIdComputed);
    }
    if (!updates.length) return res.status(400).json({ ok: false, error: "Nothing to update" });

    await pool.query(`UPDATE profiles SET ${updates.join(", ")}, profile_pending = true WHERE id = ?`, [
      ...values,
      req.auth.userId,
    ]);

    const [userRows] = await pool.query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [req.auth.userId]);
    const user = userRows?.[0];
    const profile = await getUserProfile(pool, req.auth.userId);
    if (!user || !profile) return res.status(404).json({ ok: false, error: "User not found" });

    return res.status(200).json({ ok: true, user: { ...profile, email: user.email } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to update profile" });
  }
});

// POST /api/auth/set-password
router.post("/set-password", requireAuth, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });

    const newPassword = String(req.body?.newPassword || "");
    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters" });
    }

    const passwordHash = await hashPassword(newPassword);
    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, req.auth.userId]);
    return res.status(200).json({ ok: true, message: "Password set successfully" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to set password" });
  }
});

module.exports = router;

