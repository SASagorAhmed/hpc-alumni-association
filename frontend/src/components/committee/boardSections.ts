import type { CommitteePostBlock } from "@/components/committee/StructuredCommitteeDisplay";

export type BoardSectionKey =
  | "governing_body"
  | "executive_committee"
  | "committee_heads"
  | "committee_members";

export const BOARD_SECTION_ORDER: BoardSectionKey[] = [
  "governing_body",
  "executive_committee",
  "committee_heads",
  "committee_members",
];

export const BOARD_SECTION_LABELS: Record<BoardSectionKey, { title: string; subtitle?: string }> = {
  governing_body: { title: "Governing Body" },
  executive_committee: { title: "Executive Committee" },
  committee_heads: { title: "Committee Heads" },
  committee_members: { title: "Committee Members", subtitle: "নির্বাহী সদস্য" },
};

/** Admin / forms */
export const BOARD_SECTION_OPTIONS: { value: BoardSectionKey; label: string }[] = [
  { value: "governing_body", label: "Governing Body (সভাপতি, মহাসচিব, …)" },
  { value: "executive_committee", label: "Executive Committee" },
  { value: "committee_heads", label: "Committee Heads" },
  { value: "committee_members", label: "Committee Members (নির্বাহী সদস্য)" },
];

function normalizeBanglaTitle(s: string | null | undefined) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ");
}

/** When `board_section` is missing (older data), infer from Bangla post title. */
export function inferBoardSectionFromTitle(postTitle: string | null | undefined): BoardSectionKey {
  const t = normalizeBanglaTitle(postTitle);
  if (!t) return "committee_members";

  const governing = new Set([
    "সভাপতি",
    "মহাসচিব",
    "সেক্রেটারি",
    "সাধারণ সম্পাদক / মহাসচিব",
    "সাধারণ সম্পাদক / সেক্রেটারি",
    "সাধারণ সম্পাদক",
    "কোষাধ্যক্ষ",
  ]);
  if (governing.has(t)) return "governing_body";

  const executive = new Set([
    "সহ-সভাপতি",
    "যুগ্ম-সেক্রেটারি",
    "যুগ্ম-সাধারণ সম্পাদক",
    "সাংগঠনিক সম্পাদক",
    "সহ-সাংগঠনিক সম্পাদক",
  ]);
  if (executive.has(t)) return "executive_committee";

  const heads = new Set([
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
  if (heads.has(t)) return "committee_heads";

  if (/নির্বাহী\s*সদস্য/i.test(t) || /কার্যনির্বাহী/i.test(t) || /executive\s*member/i.test(t)) {
    return "committee_members";
  }

  return "committee_members";
}

export function resolveBoardSection(post: Pick<CommitteePostBlock, "title"> & { board_section?: string | null }): BoardSectionKey {
  const raw = String(post.board_section || "").trim();
  if (
    raw === "governing_body" ||
    raw === "executive_committee" ||
    raw === "committee_heads" ||
    raw === "committee_members"
  ) {
    return raw;
  }
  return inferBoardSectionFromTitle(post.title);
}
