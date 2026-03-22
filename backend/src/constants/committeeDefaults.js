/**
 * Default executive committee posts (Bengali titles).
 * Admin can edit / add / remove per term after seeding.
 */
const DEFAULT_COMMITTEE_POSTS = [
  { title: "সভাপতি", allows_multiple: false, is_highlight: true },
  { title: "সহ-সভাপতি", allows_multiple: true, is_highlight: false },
  { title: "সাধারণ সম্পাদক / সেক্রেটারি", allows_multiple: false, is_highlight: false },
  { title: "যুগ্ম-সাধারণ সম্পাদক", allows_multiple: true, is_highlight: false },
  { title: "কোষাধ্যক্ষ", allows_multiple: false, is_highlight: false },
  { title: "সাংগঠনিক সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "সহ-সাংগঠনিক সম্পাদক", allows_multiple: true, is_highlight: false },
  { title: "দপ্তর সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "দপ্তর ও তথ্য সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "প্রচার ও প্রকাশনা সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "সাহিত্য ও প্রকাশনা সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "শিক্ষা ও গবেষণা সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "সাংস্কৃতিক সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "ক্রীড়া সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "সমাজকল্যাণ সম্পাদক", allows_multiple: false, is_highlight: false },
  { title: "কার্যনির্বাহী সদস্য", allows_multiple: true, is_highlight: false },
];

module.exports = { DEFAULT_COMMITTEE_POSTS };
