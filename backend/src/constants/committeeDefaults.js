/**
 * Board sections shown on the public Alumni Executive Committee (4 blocks).
 * Assign each committee post to exactly one section in the admin panel (or via seed defaults).
 */
const BOARD_SECTION = {
  GOVERNING_BODY: "governing_body",
  EXECUTIVE_COMMITTEE: "executive_committee",
  COMMITTEE_HEADS: "committee_heads",
  COMMITTEE_MEMBERS: "committee_members",
};

/**
 * Default executive committee posts (Bengali titles) — matches the 4-section structure.
 * Admin can edit / add / remove per term after seeding.
 */
const DEFAULT_COMMITTEE_POSTS = [
  // Governing Body
  { title: "সভাপতি", allows_multiple: false, is_highlight: true, board_section: BOARD_SECTION.GOVERNING_BODY },
  { title: "মহাসচিব", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.GOVERNING_BODY },
  { title: "কোষাধ্যক্ষ", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.GOVERNING_BODY },
  // Executive Committee
  { title: "সহ-সভাপতি", allows_multiple: true, is_highlight: false, board_section: BOARD_SECTION.EXECUTIVE_COMMITTEE },
  { title: "যুগ্ম-সেক্রেটারি", allows_multiple: true, is_highlight: false, board_section: BOARD_SECTION.EXECUTIVE_COMMITTEE },
  { title: "সাংগঠনিক সম্পাদক", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.EXECUTIVE_COMMITTEE },
  { title: "সহ-সাংগঠনিক সম্পাদক", allows_multiple: true, is_highlight: false, board_section: BOARD_SECTION.EXECUTIVE_COMMITTEE },
  // Committee Heads
  { title: "সাহিত্য ও প্রকাশনা সম্পাদক", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.COMMITTEE_HEADS },
  { title: "প্রচার ও গণসংযোগ সম্পাদক", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.COMMITTEE_HEADS },
  { title: "শিক্ষা ও পাঠাগার সম্পাদক", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.COMMITTEE_HEADS },
  { title: "সাংস্কৃতিক সম্পাদক", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.COMMITTEE_HEADS },
  { title: "ক্রীড়া সম্পাদক", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.COMMITTEE_HEADS },
  { title: "দপ্তর সম্পাদক", allows_multiple: false, is_highlight: false, board_section: BOARD_SECTION.COMMITTEE_HEADS },
  // Committee Members
  { title: "নির্বাহী সদস্য", allows_multiple: true, is_highlight: false, board_section: BOARD_SECTION.COMMITTEE_MEMBERS },
];

module.exports = { DEFAULT_COMMITTEE_POSTS, BOARD_SECTION };
