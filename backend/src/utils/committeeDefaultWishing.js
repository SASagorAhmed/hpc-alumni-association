/**
 * Default “wishing” / congratulations copy for public committee when `wishing_message` is empty.
 * Governing body vs other sections use different sentences (aligned with admin import-from-alumni).
 */

const { inferBoardSectionFromTitle } = require("./inferCommitteeBoardSection");

const ALLOWED_BOARD_SECTIONS = new Set([
  "governing_body",
  "executive_committee",
  "committee_heads",
  "committee_members",
]);

function resolveBoardSection(dbValue, postTitle) {
  const s = dbValue != null ? String(dbValue).trim() : "";
  if (ALLOWED_BOARD_SECTIONS.has(s)) return s;
  return inferBoardSectionFromTitle(postTitle);
}

/**
 * Without calling translation APIs: use Latin titles as-is; Bangla titles stay as-is in the sentence.
 * (Import-from-alumni still uses async translation to English when saving.)
 */
function heuristicPostTitleEnglish(postTitle) {
  const raw = String(postTitle || "").trim();
  if (!raw) return "Member";
  const hasBengali = /[\u0980-\u09FF]/.test(raw);
  const hasLatin = /[a-zA-Z]/.test(raw);
  if (!hasBengali && hasLatin) return raw;
  return raw;
}

function buildGoverningDefaultWishing(alumnusName, postTitleEnglish) {
  const n = String(alumnusName || "").trim() || "Alumni";
  const p = String(postTitleEnglish || "").trim() || "Member";
  return `Congratulations to our proud alumnus ${n} on being elected ${p} of the HPC Alumni Association. Wishing you continued success and impactful leadership ahead. With your leadership, the association will grow and achieve even greater success. Congratulations!`;
}

function buildOtherSectionsDefaultWishing(alumnusName, postTitleEnglish) {
  const n = String(alumnusName || "").trim() || "Alumni";
  const p = String(postTitleEnglish || "").trim() || "Member";
  return `Congratulations to our proud alumnus ${n} on being selected as ${p} of the HPC Alumni Association by the governing body. Wishing you continued success and impactful leadership ahead. With your support and guidance, the association will grow and achieve even greater success. Congratulations!`;
}

/**
 * @param {{ name?: string | null, wishing_message?: string | null }} member
 * @param {string | null | undefined} postTitle committee_posts.title
 * @param {string | null | undefined} postBoardSection committee_posts.board_section
 */
function ensurePublicWishingMessage(member, postTitle, postBoardSection) {
  const raw = member?.wishing_message;
  if (raw != null && String(raw).trim()) return String(raw).trim();

  const name = member?.name;
  const section = resolveBoardSection(postBoardSection, postTitle);
  const postEn = heuristicPostTitleEnglish(postTitle);
  if (section === "governing_body") {
    return buildGoverningDefaultWishing(name, postEn);
  }
  return buildOtherSectionsDefaultWishing(name, postEn);
}

module.exports = {
  ensurePublicWishingMessage,
  heuristicPostTitleEnglish,
  buildGoverningDefaultWishing,
  buildOtherSectionsDefaultWishing,
  resolveBoardSection,
};
