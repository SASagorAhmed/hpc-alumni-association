/**
 * Keep `committee_members` in sync with `profiles` for rows linked by Alumni ID
 * (`committee_members.alumni_id` ↔ `profiles.registration_number`).
 * Mirrors fields copied in admin "import from alumni" (except designation / wishing / committee-only text).
 * Profile Short Bio (`profiles.bio`) is synced to `committee_members.winner_about` (About winner on the public page).
 */

function normalizeAlumniIdKey(raw) {
  const t = String(raw ?? "")
    .trim()
    .replace(/\s+/g, "");
  if (!t) return "";
  const c0 = t.charAt(0);
  const rest = t.slice(1);
  return (/^[a-zA-Z]$/.test(c0) ? c0.toUpperCase() : c0) + rest;
}

function parseProfileSocialLinks(profile) {
  let fb = null;
  let ig = null;
  let li = null;
  const raw = profile?.social_links;
  if (!raw) return { fb, ig, li };
  let o = raw;
  if (typeof raw === "string") {
    try {
      o = JSON.parse(raw);
    } catch {
      return { fb, ig, li };
    }
  }
  if (o && typeof o === "object") {
    fb = o.facebook || null;
    ig = o.instagram || null;
    li = o.linkedin || null;
  }
  return {
    fb: fb ? String(fb).trim() : null,
    ig: ig ? String(ig).trim() : null,
    li: li ? String(li).trim() : null,
  };
}

function trimOrNull(v) {
  const s = v != null ? String(v).trim() : "";
  return s ? s : null;
}

/** Same columns as `ensureCommitteeMemberColumns` in admin (avoid importing admin route → circular). */
async function ensureCommitteeMemberShortDisplayColumns(pool) {
  const stmts = [
    "ALTER TABLE committee_members ADD COLUMN name_short TEXT NULL",
    "ALTER TABLE committee_members ADD COLUMN institution_short VARCHAR(120) NULL",
  ];
  for (const stmt of stmts) {
    try {
      await pool.query(stmt);
    } catch (e) {
      const msg = String(e?.message || "");
      const code = e?.code ?? e?.errno;
      if (String(code) === "1060" || msg.toLowerCase().includes("duplicate column")) continue;
      console.error("[sync][committee] ensure short columns failed:", msg.slice(0, 200));
    }
  }
}

/** Matches admin committee “About winner” max word count. */
const WINNER_ABOUT_MAX_WORDS = 250;

function truncateToMaxWords(text, maxWords) {
  const s = String(text ?? "").trim();
  if (!s) return null;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return s;
  return words.slice(0, maxWords).join(" ");
}

/**
 * @param {import("mysql2/promise").Pool} pool
 * @param {string} userId profiles.id / users.id
 */
async function syncCommitteeMembersFromAlumniProfile(pool, userId) {
  if (!pool || !userId) return;
  await ensureCommitteeMemberShortDisplayColumns(pool);

  const [rows] = await pool.query(
    `SELECT p.*, u.email AS user_email
     FROM profiles p
     INNER JOIN users u ON u.id = p.id
     WHERE p.id = ?
     LIMIT 1`,
    [userId]
  );
  const profile = rows?.[0];
  if (!profile) return;

  const regRaw = profile.registration_number != null ? String(profile.registration_number).trim() : "";
  const key = normalizeAlumniIdKey(regRaw);
  if (!key) return;

  const social = parseProfileSocialLinks(profile);
  const name = trimOrNull(profile.name) || "Alumni";
  const phone = trimOrNull(profile.phone);
  const email = trimOrNull(profile.user_email);
  const profession = trimOrNull(profile.profession);
  const jobStatus = trimOrNull(profile.job_status);
  const institution = trimOrNull(profile.university);
  const nameShort = trimOrNull(profile.nickname);
  const institutionShort = trimOrNull(profile.university_short_name);
  const collegeName = trimOrNull(profile.college_name);
  const photoUrl = trimOrNull(profile.photo);
  const batch = trimOrNull(profile.batch);
  const winnerAbout = truncateToMaxWords(profile.bio, WINNER_ABOUT_MAX_WORDS);

  await pool.query(
    `UPDATE committee_members
     SET name = ?,
         name_short = ?,
         phone = ?,
         email = ?,
         profession = ?,
         job_status = ?,
         institution = ?,
         institution_short = ?,
         college_name = ?,
         photo_url = ?,
         facebook_url = ?,
         instagram_url = ?,
         linkedin_url = ?,
         batch = ?,
         winner_about = ?
     WHERE UPPER(TRIM(COALESCE(alumni_id,''))) = UPPER(?)`,
    [
      name,
      nameShort,
      phone,
      email,
      profession,
      jobStatus,
      institution,
      institutionShort,
      collegeName,
      photoUrl,
      social.fb,
      social.ig,
      social.li,
      batch,
      winnerAbout,
      key,
    ]
  );
}

/** @deprecated use syncCommitteeMembersFromAlumniProfile */
async function syncCommitteePhotosFromAlumniProfile(pool, alumniIdRaw, photoUrl) {
  const key = normalizeAlumniIdKey(alumniIdRaw);
  if (!key || !pool) return;
  const photo = photoUrl != null && String(photoUrl).trim() ? String(photoUrl).trim() : null;
  await pool.query(
    `UPDATE committee_members
     SET photo_url = ?
     WHERE UPPER(TRIM(COALESCE(alumni_id,''))) = UPPER(?)`,
    [photo, key]
  );
}

function winnerAboutFromProfileBio(bio) {
  return truncateToMaxWords(bio, WINNER_ABOUT_MAX_WORDS);
}

module.exports = {
  syncCommitteeMembersFromAlumniProfile,
  syncCommitteePhotosFromAlumniProfile,
  normalizeAlumniIdKey,
  winnerAboutFromProfileBio,
};
