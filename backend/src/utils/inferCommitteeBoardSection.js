/**
 * Infer committee_posts.board_section from Bangla/English title.
 * Keep in sync with frontend: src/components/committee/boardSections.ts → inferBoardSectionFromTitle
 */

const GOVERNING = new Set([
  "সভাপতি",
  "মহাসচিব",
  "সেক্রেটারি",
  "সাধারণ সম্পাদক / মহাসচিব",
  "সাধারণ সম্পাদক / সেক্রেটারি",
  "সাধারণ সম্পাদক",
  "কোষাধ্যক্ষ",
]);

const EXECUTIVE = new Set([
  "সহ-সভাপতি",
  "যুগ্ম-সেক্রেটারি",
  "যুগ্ম-সাধারণ সম্পাদক",
  "সাংগঠনিক সম্পাদক",
  "সহ-সাংগঠনিক সম্পাদক",
]);

const HEADS = new Set([
  "সাহিত্য ও প্রকাশনা সম্পাদক",
  "প্রচার ও গণসংযোগ সম্পাদক",
  "প্রচার ও প্রকাশনা সম্পাদক",
  "শিক্ষা ও পাঠাগার সম্পাদক",
  "শিক্ষা ও গবেষণা সম্পাদক",
  "সাংস্কৃতিক সম্পাদক",
  "ক্রীড়া সম্পাদক",
  "দপ্তর সম্পাদক",
  "দপ্তর ও তথ্য সম্পাদক",
]);

function normalizeTitle(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * @param {string | null | undefined} postTitle
 * @returns {"governing_body"|"executive_committee"|"committee_heads"|"committee_members"}
 */
function inferBoardSectionFromTitle(postTitle) {
  const t = normalizeTitle(postTitle);
  if (!t) return "committee_members";
  if (GOVERNING.has(t)) return "governing_body";
  if (EXECUTIVE.has(t)) return "executive_committee";
  if (HEADS.has(t)) return "committee_heads";
  if (/নির্বাহী\s*সদস্য/i.test(t) || /কার্যনির্বাহী/i.test(t) || /executive\s*member/i.test(t)) {
    return "committee_members";
  }
  return "committee_members";
}

module.exports = { inferBoardSectionFromTitle, normalizeTitle };
