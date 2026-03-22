export const DEFAULT_ELECTION_POSTS = [
  "সভাপতি",
  "সহ-সভাপতি",
  "সাধারণ সম্পাদক / সেক্রেটারি",
  "যুগ্ম-সাধারণ সম্পাদক / যুগ্ম-সেক্রেটারি",
  "কোষাধ্যক্ষ",
  "সাংগঠনিক সম্পাদক",
  "সহ-সাংগঠনিক সম্পাদক",
  "দপ্তর সম্পাদক",
  "দপ্তর ও তথ্য সম্পাদক",
  "প্রচার ও প্রকাশনা সম্পাদক",
  "সাহিত্য ও প্রকাশনা সম্পাদক",
  "শিক্ষা ও গবেষণা সম্পাদক",
  "সাংস্কৃতিক সম্পাদক",
  "ক্রীড়া সম্পাদক",
  "সমাজকল্যাণ সম্পাদক",
  "কার্যনির্বাহী সদস্য / নির্বাহী সদস্য",
];

export const ELECTION_TYPES = [
  { value: "general", label: "সাধারণ নির্বাচন (General)" },
  { value: "partial", label: "আংশিক নির্বাচন (Partial)" },
  { value: "by_election", label: "উপনির্বাচন (By-election)" },
  { value: "manual", label: "ম্যানুয়াল ঘোষণা (Manual)" },
];

export const ELECTION_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-muted text-muted-foreground" },
  { value: "application_open", label: "Application Open", color: "bg-blue-100 text-blue-700" },
  { value: "application_closed", label: "Application Closed", color: "bg-yellow-100 text-yellow-700" },
  { value: "candidate_review", label: "Candidate Review", color: "bg-orange-100 text-orange-700" },
  { value: "published", label: "Published", color: "bg-emerald-100 text-emerald-700" },
  { value: "voting", label: "Live Voting", color: "bg-red-100 text-red-700" },
  { value: "closed", label: "Closed", color: "bg-muted text-muted-foreground" },
  { value: "result_review", label: "Result Review", color: "bg-purple-100 text-purple-700" },
  { value: "results_published", label: "Results Published", color: "bg-green-100 text-green-800" },
];

export const CANDIDATE_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  { value: "approved_unpublished", label: "Approved (Unpublished)", color: "bg-blue-100 text-blue-700" },
  { value: "published", label: "Published", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
];

export const RESULT_VISIBILITY_OPTIONS = [
  { value: "hidden", label: "Hidden until admin publishes" },
  { value: "after_voting", label: "Show after voting ends" },
  { value: "live", label: "Show live (not recommended)" },
];

export const LIVE_RESULT_MODES = [
  { value: "hidden", label: "Hidden (Default)", description: "No results shown during voting. Results shown only after admin publishes." },
  { value: "live", label: "Live Results", description: "Vote counts update in real-time. Users can see total votes, candidate votes, and percentages." },
  { value: "partial", label: "Partial Live", description: "Show only total votes and percentage bars. Hide exact numbers." },
  { value: "admin_only", label: "Admin Only", description: "Only admin can see real-time results. Users cannot see anything." },
];

export interface LiveResultSettings {
  mode: "hidden" | "live" | "partial" | "admin_only";
  show_vote_count: boolean;
  show_percentage: boolean;
  show_ranking: boolean;
  update_interval: number;
  frozen: boolean;
}
