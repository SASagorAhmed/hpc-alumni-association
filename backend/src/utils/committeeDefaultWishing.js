/**
 * Default “wishing” / congratulations copy for public committee when `wishing_message` is empty.
 * Governing body vs other sections use different sentences (aligned with admin import-from-alumni).
 */

const { inferBoardSectionFromTitle, normalizeTitle } = require("./inferCommitteeBoardSection");

/** Bangla title for president (committee default post). */
const PRESIDENT_TITLE_BN = "সভাপতি";

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

/**
 * Role wording for auto-generated wishing text. President is always "President"
 * (English "Chair"/"Chair:" is a common mistranslation of সভাপতি).
 */
function rolePhraseForDefaultWishing(postTitle) {
  const normalized = normalizeTitle(postTitle);
  if (normalized === PRESIDENT_TITLE_BN) return "President";

  const raw = String(postTitle || "").trim();
  const hasBengali = /[\u0980-\u09FF]/.test(raw);
  if (hasBengali) return heuristicPostTitleEnglish(postTitle);

  const head = raw.split(":")[0].trim();
  const low = head.toLowerCase();
  const isVice = /^vice[-\s]?/i.test(head);
  if (
    !isVice &&
    (low === "chair" ||
      low === "chairman" ||
      low === "chairwoman" ||
      low === "president" ||
      /^chair\b/i.test(head))
  ) {
    return "President";
  }

  return heuristicPostTitleEnglish(postTitle);
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
  const rolePhrase = rolePhraseForDefaultWishing(postTitle);
  if (section === "governing_body") {
    return buildGoverningDefaultWishing(name, rolePhrase);
  }
  return buildOtherSectionsDefaultWishing(name, rolePhrase);
}

module.exports = {
  ensurePublicWishingMessage,
  heuristicPostTitleEnglish,
  rolePhraseForDefaultWishing,
  buildGoverningDefaultWishing,
  buildOtherSectionsDefaultWishing,
  resolveBoardSection,
};
