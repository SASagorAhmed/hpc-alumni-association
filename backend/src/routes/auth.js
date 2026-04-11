const express = require("express");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { getOrCreatePool } = require("../db/pool");
const { hashPassword, verifyPassword } = require("../auth/password");
const { signJwt, requireAuth, signGoogleRegisterDraftToken, verifyGoogleRegisterDraftToken } = require("../auth/jwt");
const { extractGoogleRegisterDraft, assertGoogleRegisterAllowed } = require("../auth/google");
const { sendVerificationEmail, sendPasswordResetEmail, sendAdminApprovalRequestEmail } = require("../auth/email");
const { ensurePasswordResetTokensTable } = require("../utils/ensurePasswordResetTokensTable");
const { ensureEmailOtpChallengesTable } = require("../utils/ensureEmailOtpChallengesTable");
const env = require("../config/env");
const passport = require("passport");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { getCloudinaryFolder } = require("../utils/uploadFolders");
const { ensureAdminCommitteeDesignationColumn } = require("../utils/ensureAdminCommitteeDesignation");
const { syncCommitteeMembersFromAlumniProfile } = require("../utils/syncCommitteePhotoFromProfile");
const { ensureProfileEditAuditTable } = require("../utils/ensureProfileEditAuditTable");
const { ensureProfileBirthdayColumn } = require("../utils/ensureProfileBirthdayColumn");
const { ensureProfileNicknameUniShortColumns } = require("../utils/ensureProfileNicknameUniShortColumns");

const router = express.Router();

/** Base URL of this API for links inside emails (custom domain / reverse proxy safe). */
function publicApiBaseUrlFromRequest(req) {
  if (env.publicApiUrl) return env.publicApiUrl;
  const rawProto = req.get("x-forwarded-proto") || req.protocol || "https";
  const proto = String(rawProto).split(",")[0].trim().toLowerCase() || "https";
  const rawHost = req.get("x-forwarded-host") || req.get("host") || "";
  const host = String(rawHost).split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

function buildEmailVerificationLink(req, token) {
  const base = publicApiBaseUrlFromRequest(req);
  const path = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}

const GOOGLE_OAUTH_COOKIE = "hpc_google_oauth_token";
const GOOGLE_OAUTH_COOKIE_MAX_MS = 10 * 60 * 1000;
const GOOGLE_REGISTER_DRAFT_COOKIE = "hpc_google_register_draft";
const GOOGLE_REGISTER_DRAFT_MAX_MS = 30 * 60 * 1000;

/** SPA (different origin than API) needs None+Secure in production so POST /oauth-handoff sends the cookie. */
function crossSiteOAuthCookieAttrs() {
  if (env.nodeEnv === "production") {
    return { sameSite: "none", secure: true };
  }
  return { sameSite: "lax", secure: false };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many login attempts. Please try again later." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many registration attempts. Please try again later." },
});

const resendVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests. Please try again later." },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many OTP attempts. Please try again later." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many password reset requests. Please try again later." },
});

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

function extractCloudinaryPublicIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const clean = url.split("?")[0];
  const m = clean.match(/\/upload\/v\d+\/(.+?)\.[a-zA-Z0-9]+$/);
  return m?.[1] || null;
}

async function deleteCloudinaryImageByUrl(url) {
  const publicId = extractCloudinaryPublicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (_e) {
    // Best-effort cleanup only.
  }
}

async function isImageUrlReferencedElsewhere(pool, imageUrl, userId) {
  if (!pool || !imageUrl) return false;
  const [profileRows] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM profiles
     WHERE photo = ?
       AND id <> ?`,
    [imageUrl, userId]
  );
  if (Number(profileRows?.[0]?.c || 0) > 0) return true;

  const [committeeRows] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM committee_members
     WHERE photo_url = ?`,
    [imageUrl]
  );
  return Number(committeeRows?.[0]?.c || 0) > 0;
}

const FIXED_COLLEGE_NAME = "Hamdard Public College";

const REGISTER_FACULTY_MAP = {
  science: "Science",
  arts: "Arts",
  commerce: "Commerce",
};

async function ensureProfileFacultyColumn(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN faculty VARCHAR(32) NULL AFTER department");
  } catch (e) {
    const msg = String(e?.message || "");
    const code = e?.code ?? e?.errno;
    if (String(code) === "1060" || msg.toLowerCase().includes("duplicate column")) return;
    console.error("[auth] ensure profile faculty column:", msg.slice(0, 200));
  }
}

async function ensureProfileCommitteeFields(pool) {
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN committee_member TINYINT(1) NULL AFTER profession");
  } catch (e) {
    const msg = String(e?.message || "");
    const code = e?.code ?? e?.errno;
    if (String(code) !== "1060" && !msg.toLowerCase().includes("duplicate column")) {
      console.error("[auth] ensure profile committee_member column:", msg.slice(0, 200));
    }
  }
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN committee_post VARCHAR(200) NULL AFTER committee_member");
  } catch (e) {
    const msg = String(e?.message || "");
    const code = e?.code ?? e?.errno;
    if (String(code) !== "1060" && !msg.toLowerCase().includes("duplicate column")) {
      console.error("[auth] ensure profile committee_post column:", msg.slice(0, 200));
    }
  }
}

async function resolveCurrentPublishedCommitteeTermId(pool) {
  let [rows] = await pool.query(
    `SELECT id
     FROM committee_terms
     WHERE status = 'published' AND is_current = 1
     LIMIT 1`
  );
  if (!rows?.length) {
    [rows] = await pool.query(
      `SELECT id
       FROM committee_terms
       WHERE status = 'published'
       ORDER BY updated_at DESC
       LIMIT 1`
    );
  }
  return String(rows?.[0]?.id || "").trim() || null;
}

async function committeePostExistsInCurrentTerm(pool, postTitle) {
  const title = trimOrNull(postTitle);
  if (!title) return false;
  const currentTermId = await resolveCurrentPublishedCommitteeTermId(pool);
  if (!currentTermId) return false;
  const [rows] = await pool.query(
    `SELECT 1 AS ok
     FROM committee_posts
     WHERE term_id = ?
       AND LOWER(TRIM(title)) = LOWER(TRIM(?))
     LIMIT 1`,
    [currentTermId, title]
  );
  return Boolean(rows?.[0]);
}

function trimOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

async function listCurrentAdminEmails(pool) {
  const [rows] = await pool.query(
    `SELECT DISTINCT LOWER(TRIM(u.email)) AS email
     FROM user_roles ur
     INNER JOIN users u ON u.id = ur.user_id
     WHERE ur.role = 'admin'
       AND TRIM(COALESCE(u.email, '')) <> ''`
  );
  return (rows || []).map((r) => String(r.email || "").trim().toLowerCase()).filter(Boolean);
}

function resolveAdminUsersDashboardLink() {
  const base = String(env.frontendRedirectOrigin || env.frontendOrigin || "").trim().replace(/\/$/, "");
  if (!base) return "/admin/users";
  return `${base}/admin/users`;
}

const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_OTP_MAX_ATTEMPTS = 5;

function getOtpHashSecret() {
  return String(process.env.EMAIL_OTP_SECRET || env.jwt.secret || "change_me").trim();
}

function generateEmailOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashEmailOtp({ userId, email, otp }) {
  const hmac = crypto.createHmac("sha256", getOtpHashSecret());
  hmac.update(`${String(userId || "").trim().toLowerCase()}::${String(email || "").trim().toLowerCase()}::${String(otp || "").trim()}`);
  return hmac.digest("hex");
}

async function createAndStoreEmailOtpChallenge({ pool, userId, email }) {
  await ensureEmailOtpChallengesTable(pool);
  const otp = generateEmailOtpCode();
  const challengeId = uuidv4();
  const emailNorm = String(email || "").trim().toLowerCase();
  const otpHash = hashEmailOtp({ userId, email: emailNorm, otp });
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);

  await pool.query(
    `DELETE FROM email_otp_challenges
     WHERE user_id = ? AND email = ? AND used_at IS NULL`,
    [userId, emailNorm]
  );
  await pool.query(
    `INSERT INTO email_otp_challenges
      (id, user_id, email, otp_hash, expires_at, used_at, attempt_count, max_attempts)
     VALUES (?, ?, ?, ?, ?, NULL, 0, ?)`,
    [challengeId, userId, emailNorm, otpHash, expiresAt, EMAIL_OTP_MAX_ATTEMPTS]
  );
  await pool.query(
    `DELETE FROM email_otp_challenges
     WHERE used_at IS NULL
       AND expires_at < (NOW() - INTERVAL 1 DAY)`
  );

  return { otp, challengeId, expiresAt };
}

/** @returns {string|null|false} null if empty, false if invalid */
function normalizeBirthdayForStorage(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (dt.getTime() > todayUtc) return false;
  if (y < 1920) return false;
  return s;
}

function formatBirthdayFromRow(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    return t || null;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const mo = String(v.getMonth() + 1).padStart(2, "0");
    const da = String(v.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  return null;
}

async function getUserProfile(pool, userId) {
  await ensureAdminCommitteeDesignationColumn(pool);
  await ensureProfileCommitteeFields(pool);
  // Role
  const [roleRows] = await pool.query(`SELECT role FROM user_roles WHERE user_id = ?`, [userId]);
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
    /** Optional display nickname; lists use `name`. */
    nickname:
      p.nickname != null && String(p.nickname).trim() !== "" ? String(p.nickname).trim() : null,
    email: null, // filled by caller when needed
    phone: p.phone || "",
    batch: p.batch || "",
    roll: p.roll || null,
    registrationNumber: p.registration_number || null,
    adminCommitteeDesignation: p.admin_committee_designation || null,
    gender: p.gender || null,
    bloodGroup: p.blood_group || null,
    birthday: formatBirthdayFromRow(p.birthday),
    department: p.department || null,
    faculty: p.faculty || null,
    session: p.session || null,
    passingYear: p.passing_year || null,
    committeeMember: p.committee_member === null || p.committee_member === undefined ? null : Boolean(p.committee_member),
    committeePost: p.committee_post != null && String(p.committee_post).trim() !== "" ? String(p.committee_post).trim() : null,
    collegeName: p.college_name || null,
    profession: p.profession || null,
    company: p.company || null,
    university: p.university || null,
    universityShortName: p.university_short_name != null && String(p.university_short_name).trim() !== "" ? String(p.university_short_name).trim() : null,
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
    profileReviewNote: p.profile_review_note || null,
  };
}

// POST /api/auth/register (multipart/form-data; optional photo for Female, required for Male)
router.post("/register", registerLimiter, profileUpload.single("photo"), async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    await ensureProfileFacultyColumn(pool);
    await ensureProfileBirthdayColumn(pool);
    await ensureProfileNicknameUniShortColumns(pool);
    await ensureProfileCommitteeFields(pool);

    const {
      email,
      password,
      name,
      phone,
      batch,
      section,
      department,
      faculty,
      roll,
      passingSession,
      gender,
      bloodGroup,
      university,
      universityShortName,
      nickname,
      company,
      profession,
      committeeMember,
      committeePost,
      address,
      bio,
      additionalInfo,
      facebook,
      instagram,
      linkedin,
      googleRegister,
      birthday,
    } = req.body || {};
    const wantsGoogleRegister = String(googleRegister || "") === "1";

    let googleDraft = null;
    const draftCookieRaw = req.cookies?.[GOOGLE_REGISTER_DRAFT_COOKIE];
    if (draftCookieRaw && typeof draftCookieRaw === "string") {
      try {
        googleDraft = verifyGoogleRegisterDraftToken(draftCookieRaw);
      } catch (_e) {
        googleDraft = null;
      }
    }
    if (wantsGoogleRegister && !googleDraft) {
      return res.status(400).json({
        ok: false,
        error: "Your Google sign-up session expired or is missing. Please use Continue with Google again.",
      });
    }
    const sectionRaw = section != null && String(section).trim() !== "" ? section : department;
    const facultyRaw = String(faculty ?? "").trim();
    const facultyKey = facultyRaw.toLowerCase();
    const facultyNorm = REGISTER_FACULTY_MAP[facultyKey];
    if (!email || !password || !name || !batch || !sectionRaw || !roll || !gender) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    const sessionLabel = String(passingSession ?? "")
      .trim()
      .replace(/\s*-\s*/g, "-");
    let sessionNorm = null;
    let passingYearNorm = null;
    const mSession = sessionLabel.match(/^(\d{4})-(\d{4})$/);
    if (mSession) {
      const y1 = Number(mSession[1]);
      const y2 = Number(mSession[2]);
      if (Number.isFinite(y1) && Number.isFinite(y2) && y2 === y1 + 1 && y1 >= 2005 && y1 <= 2050) {
        sessionNorm = `${y1}-${y2}`;
        passingYearNorm = String(y2);
      }
    }
    if (!sessionNorm) {
      return res.status(400).json({
        ok: false,
        error: "Session (passing year) must be selected from the list (e.g. 2020-2021), years 2005–2050 to 2006–2051.",
      });
    }
    if (!facultyNorm) {
      return res.status(400).json({ ok: false, error: "Department must be Science, Arts, or Commerce" });
    }

    const emailStr = String(email).toLowerCase().trim();
    if (wantsGoogleRegister && googleDraft && emailStr !== googleDraft.email) {
      return res.status(400).json({ ok: false, error: "Email must match your Google account." });
    }
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

    // `profiles.department` stores section letter A..J (alumni ID prefix).
    // Form sends `section`; legacy clients may still send `department` for the letter.
    // (Backward compatible: allow numeric "1".."10" too.)
    let dep = String(sectionRaw ?? "").trim().toUpperCase();
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

    const uniShortRaw = universityShortName != null ? universityShortName : req.body?.university_short_name;
    const universityShortNorm = trimOrNull(uniShortRaw);
    if (!universityShortNorm) {
      return res.status(400).json({ ok: false, error: "University short name is required" });
    }
    if (universityShortNorm.length > 100) {
      return res.status(400).json({ ok: false, error: "University short name is too long (max 100 characters)" });
    }

    const nameTrim = String(name || "").trim();
    const nicknameNorm = trimOrNull(nickname);
    if (!nicknameNorm) {
      return res.status(400).json({ ok: false, error: "Nickname is required" });
    }
    if (nicknameNorm.length > 200) {
      return res.status(400).json({ ok: false, error: "Nickname is too long (max 200 characters)" });
    }

    const committeeMemberNorm = String(committeeMember ?? "").trim().toLowerCase();
    const isCommitteeMember = committeeMemberNorm === "yes";
    const committeePostNorm = trimOrNull(committeePost);
    if (committeeMemberNorm && committeeMemberNorm !== "yes" && committeeMemberNorm !== "no") {
      return res.status(400).json({ ok: false, error: "Committee member must be yes or no" });
    }

    if (isCommitteeMember) {
      if (!committeePostNorm) {
        return res.status(400).json({ ok: false, error: "Committee post is required when committee member is yes" });
      }
      const postValid = await committeePostExistsInCurrentTerm(pool, committeePostNorm);
      if (!postValid) {
        return res.status(400).json({ ok: false, error: "No published committee term available for post selection" });
      }
    }
    if (!String(profession ?? "").trim()) {
      return res.status(400).json({ ok: false, error: "Profession is required" });
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

    const birthdayNorm = normalizeBirthdayForStorage(birthday);
    if (birthdayNorm === false) {
      return res.status(400).json({ ok: false, error: "Invalid birthday. Use a calendar date on or before today." });
    }

    const companyNorm = trimOrNull(company);
    const professionNorm = trimOrNull(profession);
    const adminNotificationPost = isCommitteeMember ? committeePostNorm : professionNorm;
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

    const emailVerifiedNow = Boolean(wantsGoogleRegister && googleDraft);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, ?)`,
      [userId, emailStr, passwordHash, emailVerifiedNow]
    );

    await pool.query(
      `INSERT INTO profiles
        (id, name, nickname, phone, batch, department, faculty, roll, registration_number,
         session, passing_year,
         gender, photo, blood_group, birthday, college_name, university, university_short_name, company, profession,
         address, bio, additional_info, social_links,
         verified, approved, blocked, profile_pending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         false, false, false, false)`,
      [
        userId,
        nameTrim,
        nicknameNorm,
        phone || null,
        batchNorm,
        dep,
        facultyNorm,
        rollDigits,
        alumniId,
        sessionNorm,
        passingYearNorm,
        genderNorm,
        photoUrl,
        bloodNorm,
        birthdayNorm,
        FIXED_COLLEGE_NAME,
        universityNorm,
        universityShortNorm,
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

    // Send admin approval-request alerts (non-blocking; registration must remain successful).
    try {
      const adminEmails = await listCurrentAdminEmails(pool);
      const adminDashboardLink = resolveAdminUsersDashboardLink();
      if (adminEmails.length) {
        await Promise.allSettled(
          adminEmails.map((adminEmail) =>
            sendAdminApprovalRequestEmail({
              pool,
              adminEmail,
              initiatedBy: userId,
              adminDashboardLink,
              registrant: {
                name: nameTrim,
                email: emailStr,
                alumniId,
                batch: batchNorm,
                department: facultyNorm,
                section: dep,
                post: adminNotificationPost,
              },
            })
          )
        );
      }
    } catch (adminNotifyErr) {
      console.error("[auth] admin approval alert email:", adminNotifyErr?.message || adminNotifyErr);
    }

    if (wantsGoogleRegister && googleDraft) {
      try {
        await pool.query(`INSERT INTO google_identities (id, user_id, google_sub) VALUES (?, ?, ?)`, [
          uuidv4(),
          userId,
          googleDraft.googleSub,
        ]);
      } catch (linkErr) {
        if (linkErr?.code !== "ER_DUP_ENTRY") throw linkErr;
        return res.status(409).json({ ok: false, error: "This Google account is already linked to a user." });
      }
      res.clearCookie(GOOGLE_REGISTER_DRAFT_COOKIE, { path: "/", ...crossSiteOAuthCookieAttrs() });
      return res.status(201).json({
        ok: true,
        message:
          "Registration successful. Your Google email is verified. You can sign in with Google or with the password you chose.",
        google_register: true,
        alumni_id: alumniId,
      });
    }

    const otpChallenge = await createAndStoreEmailOtpChallenge({
      pool,
      userId,
      email: emailStr,
    });
    try {
      await sendVerificationEmail({
        pool,
        email: emailStr,
        otpCode: otpChallenge.otp,
        expiresMinutes: 10,
        recipientUserId: userId,
        initiatedBy: userId,
      });
      return res.status(201).json({
        ok: true,
        message: "Registration successful. Enter the verification code sent to your email.",
        alumni_id: alumniId,
        verify_email: emailStr,
        needsOtpVerification: true,
      });
    } catch (mailErr) {
      const body = {
        ok: true,
        message:
          env.nodeEnv === "production"
            ? "Registration successful, but OTP email could not be sent. Contact support or try again later."
            : "Registration successful, but OTP email could not be sent. Use otp_code for local testing.",
        email_error: mailErr.message || "SMTP send failed",
        alumni_id: alumniId,
        verify_email: emailStr,
        needsOtpVerification: true,
      };
      if (env.nodeEnv !== "production") {
        body.otp_code = otpChallenge.otp;
      }
      return res.status(201).json(body);
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Registration failed" });
  }
});

// GET /api/auth/verify-email?token=...
router.get("/verify-email", async (req, res) => {
  const fe = env.frontendRedirectOrigin || env.frontendOrigin;
  try {
    const pool = getOrCreatePool();
    if (!pool) {
      return res.redirect(302, `${fe}/verify-otp?status=server_error`);
    }

    const token = req.query.token ? String(req.query.token) : null;
    if (!token) {
      return res.redirect(302, `${fe}/verify-otp?status=missing_token`);
    }

    const [tokenRows] = await pool.query(`SELECT * FROM email_verification_tokens WHERE token = ? LIMIT 1`, [token]);
    const row = tokenRows?.[0];

    if (row && row.used_at != null) {
      return res.redirect(302, `${fe}/login?already_verified=1`);
    }
    if (!row) {
      return res.redirect(302, `${fe}/verify-otp?status=invalid_or_used`);
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      return res.redirect(302, `${fe}/verify-otp?status=expired`);
    }

    await pool.query(`UPDATE users SET email_verified = true WHERE id = ?`, [row.user_id]);
    await pool.query(`UPDATE profiles SET verified = true WHERE id = ?`, [row.user_id]);
    await pool.query(`UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?`, [row.id]);

    return res.redirect(302, `${fe}/login?verified=1`);
  } catch (e) {
    console.error("[auth] verify-email:", e?.message || e);
    return res.redirect(302, `${fe}/verify-otp?status=server_error`);
  }
});

// POST /api/auth/resend-verification
router.post("/resend-verification", resendVerifyLimiter, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    await ensureEmailOtpChallengesTable(pool);

    const email = String(req.body?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ ok: false, error: "Email is required" });

    const [users] = await pool.query("SELECT id, email_verified FROM users WHERE email = ? LIMIT 1", [email]);
    const user = users?.[0];
    if (!user) {
      // Avoid email enumeration
      return res.status(200).json({ ok: true, message: "If this email exists, an OTP has been sent." });
    }
    if (user.email_verified) {
      return res.status(200).json({ ok: true, message: "Email is already verified. You can log in now." });
    }

    const otpChallenge = await createAndStoreEmailOtpChallenge({
      pool,
      userId: user.id,
      email,
    });
    await sendVerificationEmail({
      pool,
      email,
      otpCode: otpChallenge.otp,
      expiresMinutes: 10,
      recipientUserId: user.id,
      initiatedBy: user.id,
    });

    const response = { ok: true, message: "Verification OTP sent. Please check your inbox." };
    if (env.nodeEnv !== "production") {
      response.otp_code = otpChallenge.otp;
    }
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to resend verification email" });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOtpLimiter, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    await ensureEmailOtpChallengesTable(pool);

    const email = String(req.body?.email || "").toLowerCase().trim();
    const otp = String(req.body?.otp || "").trim();
    if (!email || !otp) {
      return res.status(400).json({ ok: false, error: "Email and OTP are required." });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ ok: false, error: "OTP must be 6 digits." });
    }

    const [users] = await pool.query("SELECT id, email_verified FROM users WHERE email = ? LIMIT 1", [email]);
    const user = users?.[0];
    if (!user) {
      return res.status(400).json({ ok: false, error: "Invalid OTP or email." });
    }
    if (Boolean(user.email_verified)) {
      return res.status(200).json({ ok: true, message: "Email already verified. You can log in now." });
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM email_otp_challenges
       WHERE user_id = ?
         AND email = ?
         AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, email]
    );
    const challenge = rows?.[0];
    if (!challenge) {
      return res.status(400).json({ ok: false, error: "Invalid OTP or email." });
    }

    const expiresAt = challenge.expires_at ? new Date(challenge.expires_at) : null;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      await pool.query("UPDATE email_otp_challenges SET used_at = NOW() WHERE id = ? AND used_at IS NULL", [challenge.id]);
      return res.status(400).json({ ok: false, error: "OTP expired. Request a new code." });
    }

    const attempted = Number(challenge.attempt_count || 0);
    const maxAttempts = Number(challenge.max_attempts || EMAIL_OTP_MAX_ATTEMPTS);
    if (attempted >= maxAttempts) {
      await pool.query("UPDATE email_otp_challenges SET used_at = NOW() WHERE id = ? AND used_at IS NULL", [challenge.id]);
      return res.status(429).json({ ok: false, error: "Too many incorrect attempts. Request a new OTP." });
    }

    const expectedHash = hashEmailOtp({ userId: user.id, email, otp });
    if (expectedHash !== String(challenge.otp_hash || "")) {
      const nextAttempts = attempted + 1;
      if (nextAttempts >= maxAttempts) {
        await pool.query(
          `UPDATE email_otp_challenges
           SET attempt_count = ?, used_at = NOW()
           WHERE id = ? AND used_at IS NULL`,
          [nextAttempts, challenge.id]
        );
        return res.status(429).json({ ok: false, error: "Too many incorrect attempts. Request a new OTP." });
      }
      await pool.query(
        `UPDATE email_otp_challenges
         SET attempt_count = ?
         WHERE id = ? AND used_at IS NULL`,
        [nextAttempts, challenge.id]
      );
      return res.status(400).json({ ok: false, error: "Invalid OTP or email." });
    }

    await pool.query("UPDATE users SET email_verified = true WHERE id = ?", [user.id]);
    await pool.query("UPDATE profiles SET verified = true WHERE id = ?", [user.id]);
    await pool.query("UPDATE email_otp_challenges SET used_at = NOW() WHERE user_id = ? AND email = ? AND used_at IS NULL", [user.id, email]);
    await pool.query("UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [user.id]);

    return res.status(200).json({ ok: true, message: "Email verified successfully. You can log in now." });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to verify OTP" });
  }
});

const FORGOT_PASSWORD_GENERIC = {
  ok: true,
  message: "If an account exists for that email, you will receive password reset instructions shortly.",
};

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    await ensurePasswordResetTokensTable(pool);

    const email = String(req.body?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ ok: false, error: "Email is required" });

    const [users] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    const user = users?.[0];
    if (!user) return res.status(200).json(FORGOT_PASSWORD_GENERIC);

    const profile = await getUserProfile(pool, user.id);
    if (profile?.blocked) return res.status(200).json(FORGOT_PASSWORD_GENERIC);

    const rawToken = uuidv4();
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL`, [user.id]);
    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used_at) VALUES (?, ?, ?, ?, NULL)`,
      [tokenId, user.id, rawToken, expiresAt]
    );

    const resetLink = `${env.frontendOrigin.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;
    try {
      await sendPasswordResetEmail({
        pool,
        email,
        resetLink,
        recipientUserId: user.id,
        initiatedBy: user.id,
      });
    } catch (mailErr) {
      console.error("[auth] forgot-password email:", mailErr?.message || mailErr);
      return res.status(503).json({
        ok: false,
        error: "Unable to send email right now. Please try again later or contact support.",
      });
    }

    return res.status(200).json(FORGOT_PASSWORD_GENERIC);
  } catch (e) {
    console.error("[auth] forgot-password:", e?.message || e);
    return res.status(500).json({ ok: false, error: e.message || "Request failed" });
  }
});

// POST /api/auth/reset-password (token from email link; no auth header)
router.post("/reset-password", async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    await ensurePasswordResetTokensTable(pool);

    const rawToken = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");
    if (!rawToken || !newPassword) {
      return res.status(400).json({ ok: false, error: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters" });
    }

    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = ? AND used_at IS NULL LIMIT 1`,
      [rawToken]
    );
    const row = rows?.[0];
    if (!row) {
      return res.status(400).json({ ok: false, error: "Invalid or already used reset link." });
    }
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ ok: false, error: "This reset link has expired. Request a new one from the login page." });
    }

    const passwordHash = await hashPassword(newPassword);
    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, row.user_id]);
    await pool.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`, [
      row.user_id,
    ]);

    return res.status(200).json({ ok: true, message: "Password updated. You can log in now." });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Failed to reset password" });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
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

    const rememberMe = req.body?.rememberMe !== false;
    const token = signJwt(user.id, { rememberMe });
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
    await ensureProfileNicknameUniShortColumns(pool);

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

// GET /api/auth/google?register=1 — OAuth for completing the register form (draft only; no user until POST /register)
router.get("/google", (req, res, next) => {
  const register = req.query.register === "1" || req.query.register === "true";
  const computedCallbackUrl = `${publicApiBaseUrlFromRequest(req)}/api/auth/google/callback`;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: register ? "register" : "login",
    callbackURL: computedCallbackUrl,
  })(req, res, next);
});

// POST /api/auth/oauth-handoff — read one-time JWT from httpOnly cookie (set on Google callback)
router.post("/oauth-handoff", (req, res) => {
  const token = req.cookies?.[GOOGLE_OAUTH_COOKIE];
  if (!token || typeof token !== "string") {
    return res.status(401).json({ ok: false, error: "OAuth handoff missing. Try Google sign-in again." });
  }
  res.clearCookie(GOOGLE_OAUTH_COOKIE, { path: "/", ...crossSiteOAuthCookieAttrs() });
  return res.status(200).json({ ok: true, token });
});

// POST /api/auth/google-register-handoff — expose Google email/name for /register (cookie kept until registration succeeds or expires)
router.post("/google-register-handoff", (req, res) => {
  const raw = req.cookies?.[GOOGLE_REGISTER_DRAFT_COOKIE];
  if (!raw || typeof raw !== "string") {
    return res.status(401).json({ ok: false, error: "Google sign-up session expired. Use Continue with Google again." });
  }
  try {
    const draft = verifyGoogleRegisterDraftToken(raw);
    return res.status(200).json({ ok: true, email: draft.email, name: draft.name });
  } catch (_e) {
    return res.status(401).json({ ok: false, error: "Google sign-up session expired. Use Continue with Google again." });
  }
});

// GET /api/auth/google/callback
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, user, info) => {
    const fe = env.frontendRedirectOrigin || env.frontendOrigin;
    const fromRegister = String(req.query.state || "") === "register";
    try {
      if (err) {
        if (fromRegister) return res.redirect(302, `${fe}/register?google_error=oauth`);
        return res.redirect(302, `${fe}/login?google_error=1`);
      }

      if (user?.registerDraft) {
        const draft = extractGoogleRegisterDraft(user.profile);
        if (!draft) {
          return res.redirect(302, `${fe}/register?google_error=incomplete`);
        }
        const pool = getOrCreatePool();
        if (!pool) {
          return res.redirect(302, `${fe}/register?google_error=server`);
        }
        const check = await assertGoogleRegisterAllowed(pool, draft);
        if (!check.ok) {
          const q = check.code === "already_linked" ? "already_linked" : "email_registered";
          return res.redirect(302, `${fe}/register?google_error=${q}`);
        }
        const draftJwt = signGoogleRegisterDraftToken({
          googleSub: draft.googleSub,
          email: draft.email,
          name: draft.name,
        });
        res.cookie(GOOGLE_REGISTER_DRAFT_COOKIE, draftJwt, {
          httpOnly: true,
          path: "/",
          maxAge: GOOGLE_REGISTER_DRAFT_MAX_MS,
          ...crossSiteOAuthCookieAttrs(),
        });
        const regQs = new URLSearchParams();
        regQs.set("google_draft", "1");
        regQs.set("google_prefill", "1");
        if (draft.email) regQs.set("prefill_email", draft.email);
        if (draft.name) regQs.set("prefill_name", draft.name);
        if (user?.fromLogin) regQs.set("from_login", "1");
        return res.redirect(302, `${fe}/register?${regQs.toString()}`);
      }

      const token = user?.token || info?.token;
      if (!token) {
        if (fromRegister) return res.redirect(302, `${fe}/register?google_error=oauth`);
        return res.redirect(302, `${fe}/login?google_token_missing=1`);
      }

      res.cookie(GOOGLE_OAUTH_COOKIE, token, {
        httpOnly: true,
        path: "/",
        maxAge: GOOGLE_OAUTH_COOKIE_MAX_MS,
        ...crossSiteOAuthCookieAttrs(),
      });

      const query = new URLSearchParams();
      query.set("oauth_handoff", "1");
      // Cookie is preferred; jwt duplicates handoff when the browser blocks cross-site cookies (common with separate frontend/API hosts).
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

      const redirectUrl = `${fe}/login?${query.toString()}`;
      return res.redirect(302, redirectUrl);
    } catch (e) {
      if (fromRegister) return res.redirect(302, `${fe}/register?google_error=oauth`);
      return res.redirect(302, `${fe}/login?google_callback_failed=1`);
    }
  })(req, res, next);
});

function profilePutMultipartMaybe(req, res, next) {
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("multipart/form-data")) {
    return profileUpload.single("photo")(req, res, (err) => {
      if (err) return res.status(400).json({ ok: false, error: err.message || "Upload failed" });
      next();
    });
  }
  next();
}

function normalizeAuditScalar(v) {
  if (v == null) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v).trim();
}

function normalizeAuditSocial(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    try {
      return JSON.stringify(JSON.parse(v));
    } catch {
      return String(v).trim();
    }
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const AUDIT_TRUNC = 60000;

function auditClip(s) {
  const t = s == null ? "" : String(s);
  return t.length > AUDIT_TRUNC ? `${t.slice(0, AUDIT_TRUNC)}…` : t;
}

// PUT /api/auth/profile (JSON or multipart/form-data with optional `photo` file)
router.put("/profile", requireAuth, profilePutMultipartMaybe, async (req, res) => {
  try {
    const pool = getOrCreatePool();
    if (!pool) return res.status(503).json({ ok: false, error: "MySQL not configured" });
    await ensureProfileEditAuditTable(pool);
    await ensureProfileNicknameUniShortColumns(pool);
    await ensureProfileCommitteeFields(pool);

    const currentProfile = await getUserProfile(pool, req.auth.userId);
    if (!currentProfile) return res.status(404).json({ ok: false, error: "Profile not found" });

    const body = { ...(req.body || {}) };
    if (typeof body.socialLinks === "string" && body.socialLinks.trim()) {
      try {
        body.socialLinks = JSON.parse(body.socialLinks);
      } catch (_e) {
        /* keep string; may fail validation downstream or store as-is */
      }
    }

    // Section, batch, roll, alumni ID, gender, blood group: locked after registration (no user edits).
    // Session (passing year) is editable from the alumni profile.
    const DB_KEY_TO_PROFILE_KEY = {
      name: "name",
      nickname: "nickname",
      phone: "phone",
      profession: "profession",
      committee_member: "committeeMember",
      committee_post: "committeePost",
      company: "company",
      university: "university",
      university_short_name: "universityShortName",
      address: "address",
      bio: "bio",
      additional_info: "additionalInfo",
      photo: "photo",
      social_links: "socialLinks",
      birthday: "birthday",
    };

    const allowed = {
      name: "name",
      nickname: "nickname",
      phone: "phone",
      profession: "profession",
      committeeMember: "committee_member",
      committeePost: "committee_post",
      company: "company",
      university: "university",
      universityShortName: "university_short_name",
      address: "address",
      bio: "bio",
      additionalInfo: "additional_info",
      photo: "photo",
      socialLinks: "social_links",
      birthday: "birthday",
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
    const auditEntries = [];

    if (Object.prototype.hasOwnProperty.call(body, "birthday")) {
      const b = normalizeBirthdayForStorage(body.birthday);
      if (b === false) {
        return res.status(400).json({ ok: false, error: "Invalid birthday. Use a calendar date on or before today." });
      }
      body.birthday = b;
    }

    if (Object.prototype.hasOwnProperty.call(body, "universityShortName")) {
      const t = String(body.universityShortName ?? "").trim();
      if (!t) {
        return res.status(400).json({ ok: false, error: "University short name cannot be empty." });
      }
      if (t.length > 100) {
        return res.status(400).json({ ok: false, error: "University short name is too long (max 100 characters)." });
      }
      body.universityShortName = t;
    }

    if (Object.prototype.hasOwnProperty.call(body, "nickname")) {
      const t = String(body.nickname ?? "").trim();
      if (t.length > 200) {
        return res.status(400).json({ ok: false, error: "Nickname is too long (max 200 characters)." });
      }
      body.nickname = t || null;
    }

    const hasCommitteeMember = Object.prototype.hasOwnProperty.call(body, "committeeMember");
    const hasCommitteePost = Object.prototype.hasOwnProperty.call(body, "committeePost");
    if (hasCommitteeMember || hasCommitteePost) {
      const normalizeCommitteeMember = (v) => {
        if (v === true || v === 1) return true;
        if (v === false || v === 0) return false;
        const s = String(v ?? "").trim().toLowerCase();
        if (!s) return null;
        if (["yes", "true", "1"].includes(s)) return true;
        if (["no", "false", "0"].includes(s)) return false;
        return "invalid";
      };
      const parsed = hasCommitteeMember ? normalizeCommitteeMember(body.committeeMember) : null;
      if (parsed === "invalid") {
        return res.status(400).json({ ok: false, error: "Committee member must be yes or no" });
      }
      const effectiveCommitteeMember = hasCommitteeMember ? Boolean(parsed) : Boolean(currentProfile.committeeMember);
      const effectiveCommitteePost = hasCommitteePost
        ? trimOrNull(body.committeePost)
        : trimOrNull(currentProfile.committeePost);
      if (effectiveCommitteeMember) {
        if (!effectiveCommitteePost) {
          return res.status(400).json({ ok: false, error: "Committee post is required when committee member is yes" });
        }
        const postValid = await committeePostExistsInCurrentTerm(pool, effectiveCommitteePost);
        if (!postValid) {
          return res.status(400).json({ ok: false, error: "Selected committee post is invalid for current term" });
        }
      }
      if (hasCommitteeMember) {
        body.committeeMember = parsed === null ? null : parsed ? 1 : 0;
      }
      if (hasCommitteePost) {
        body.committeePost = effectiveCommitteeMember ? effectiveCommitteePost : null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "session")) {
      const sessionLabel = String(body.session ?? "")
        .trim()
        .replace(/\s*-\s*/g, "-");
      let sessionVal = null;
      let passingYearVal = null;
      const mSession = sessionLabel.match(/^(\d{4})-(\d{4})$/);
      if (mSession) {
        const y1 = Number(mSession[1]);
        const y2 = Number(mSession[2]);
        if (Number.isFinite(y1) && Number.isFinite(y2) && y2 === y1 + 1 && y1 >= 2005 && y1 <= 2050) {
          sessionVal = `${y1}-${y2}`;
          passingYearVal = String(y2);
        }
      }
      if (!sessionVal) {
        return res.status(400).json({
          ok: false,
          error:
            "Session (passing year) must be valid (e.g. 2020-2021), from 2005-2006 through 2050-2051.",
        });
      }
      const oldS = normalizeAuditScalar(currentProfile.session);
      const newS = normalizeAuditScalar(sessionVal);
      if (oldS !== newS) {
        updates.push("`session` = ?");
        values.push(sessionVal);
        auditEntries.push({
          field_key: "session",
          old_value: auditClip(oldS),
          new_value: auditClip(newS),
        });
      }
      const oldPy = normalizeAuditScalar(currentProfile.passingYear);
      const newPy = normalizeAuditScalar(passingYearVal);
      if (oldPy !== newPy) {
        updates.push("`passing_year` = ?");
        values.push(passingYearVal);
        auditEntries.push({
          field_key: "passing_year",
          old_value: auditClip(oldPy),
          new_value: auditClip(newPy),
        });
      }
    }

    Object.entries(allowed).forEach(([apiKey, dbKey]) => {
      if (req.file && apiKey === "photo") return;
      if (!Object.prototype.hasOwnProperty.call(body, apiKey)) return;
      updates.push(`\`${dbKey}\` = ?`);
      const value =
        apiKey === "socialLinks" && body[apiKey] && typeof body[apiKey] === "object"
          ? JSON.stringify(body[apiKey])
          : body[apiKey];
      values.push(value ?? null);

      const profileKey = DB_KEY_TO_PROFILE_KEY[dbKey];
      const oldRaw = profileKey ? currentProfile[profileKey] : null;
      const oldStr = dbKey === "social_links" ? normalizeAuditSocial(oldRaw) : normalizeAuditScalar(oldRaw);
      const newStr = dbKey === "social_links" ? normalizeAuditSocial(value) : normalizeAuditScalar(value);
      if (oldStr !== newStr) {
        auditEntries.push({
          field_key: dbKey,
          old_value: auditClip(oldStr),
          new_value: auditClip(newStr),
        });
      }
    });

    let uploadedPhotoUrl = null;
    if (req.file) {
      if (!String(req.file.mimetype || "").startsWith("image/")) {
        return res.status(400).json({ ok: false, error: "Photo must be an image" });
      }
      const uploaded = await uploadToCloudinary(req.file, { folder: getCloudinaryFolder("profile"), resourceType: "image" });
      uploadedPhotoUrl = uploaded.secure_url;
      updates.push("`photo` = ?");
      values.push(uploadedPhotoUrl);
      const oldStr = normalizeAuditScalar(currentProfile.photo);
      const newStr = normalizeAuditScalar(uploadedPhotoUrl);
      if (oldStr !== newStr) {
        auditEntries.push({
          field_key: "photo",
          old_value: auditClip(oldStr),
          new_value: auditClip(newStr),
        });
      }
    }

    // Keep alumni ID consistent with locked Section/Batch/Roll (do not accept any user edits for these fields).
    if (alumniIdComputed && (!currentProfile.registrationNumber || currentProfile.registrationNumber !== alumniIdComputed)) {
      updates.push("`registration_number` = ?");
      values.push(alumniIdComputed);
      const oldStr = normalizeAuditScalar(currentProfile.registrationNumber);
      const newStr = normalizeAuditScalar(alumniIdComputed);
      if (oldStr !== newStr) {
        auditEntries.push({
          field_key: "registration_number",
          old_value: auditClip(oldStr),
          new_value: auditClip(newStr),
        });
      }
    }
    if (!updates.length) return res.status(400).json({ ok: false, error: "Nothing to update" });

    const oldPhotoUrl = currentProfile.photo || null;
    const photoWasProvided = Boolean(req.file) || Object.prototype.hasOwnProperty.call(body, "photo");
    let nextPhotoUrl = oldPhotoUrl;
    if (req.file) nextPhotoUrl = uploadedPhotoUrl;
    else if (Object.prototype.hasOwnProperty.call(body, "photo")) nextPhotoUrl = body.photo ?? null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE profiles SET ${updates.join(", ")}, profile_pending = false WHERE id = ?`, [
        ...values,
        req.auth.userId,
      ]);
      for (const row of auditEntries) {
        await conn.query(
          `INSERT INTO profile_edit_audit (profile_id, field_key, old_value, new_value) VALUES (?, ?, ?, ?)`,
          [req.auth.userId, row.field_key, row.old_value, row.new_value]
        );
      }
      await conn.commit();
    } catch (e) {
      try {
        await conn.rollback();
      } catch (_r) {
        /* ignore */
      }
      throw e;
    } finally {
      conn.release();
    }

    if (photoWasProvided && oldPhotoUrl && oldPhotoUrl !== nextPhotoUrl) {
      const stillUsed = await isImageUrlReferencedElsewhere(pool, oldPhotoUrl, req.auth.userId);
      if (!stillUsed) {
        await deleteCloudinaryImageByUrl(oldPhotoUrl);
      }
    }

    const [userRows] = await pool.query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [req.auth.userId]);
    const user = userRows?.[0];
    const profile = await getUserProfile(pool, req.auth.userId);
    if (!user || !profile) return res.status(404).json({ ok: false, error: "User not found" });

    try {
      await syncCommitteeMembersFromAlumniProfile(pool, req.auth.userId);
    } catch (_syncErr) {
      /* best-effort; profile update already succeeded */
    }

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

