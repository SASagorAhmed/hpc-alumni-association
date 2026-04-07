import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, Briefcase, Phone, Mail, MapPin,
  Hash, Building2, Facebook, Instagram, Linkedin, Star, Lock,
  MessageSquareQuote, Lightbulb, Crown, UserCheck, Trophy,
} from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { inferBoardSectionFromTitle } from "@/components/committee/boardSections";
import { displayCollegeName } from "@/lib/collegeDisplay";

interface MemberProfile {
  id: string;
  name: string;
  designation: string | null;
  category: string | null;
  batch: string | null;
  alumni_id: string | null;
  college_name: string | null;
  institution: string | null;
  job_status: string | null;
  profession: string | null;
  about: string | null;
  wishing_message: string | null;
  winner_about: string | null;
  photo_url: string | null;
  term_name: string | null;
  post_title: string | null;
  /** `governing_body` vs other sections — drives wishing layout (do not mix with “Congratulations” styling). */
  board_section?: string | null;
  // sensitive — only present if approved
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  expertise?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  isApproved?: boolean;
}

export default function CommitteeMemberProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const token = getAuthToken();
    fetch(`${API_BASE_URL}/api/public/committee/member/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.ok ? res.json() : null;
      })
      .then((data) => { setMember(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Prevent individual committee profile pages from appearing in search results.
    const robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const googlebotMeta = document.querySelector('meta[name="googlebot"]') as HTMLMetaElement | null;

    const createdRobots = !robotsMeta;
    const createdGooglebot = !googlebotMeta;
    const robotsNode = robotsMeta ?? document.createElement("meta");
    const googlebotNode = googlebotMeta ?? document.createElement("meta");

    const prevRobotsContent = robotsMeta?.getAttribute("content");
    const prevGooglebotContent = googlebotMeta?.getAttribute("content");

    robotsNode.setAttribute("name", "robots");
    robotsNode.setAttribute("content", "noindex,follow");
    googlebotNode.setAttribute("name", "googlebot");
    googlebotNode.setAttribute("content", "noindex,follow");

    if (createdRobots) document.head.appendChild(robotsNode);
    if (createdGooglebot) document.head.appendChild(googlebotNode);

    return () => {
      if (createdRobots) {
        robotsNode.remove();
      } else if (prevRobotsContent != null) {
        robotsNode.setAttribute("content", prevRobotsContent);
      }

      if (createdGooglebot) {
        googlebotNode.remove();
      } else if (prevGooglebotContent != null) {
        googlebotNode.setAttribute("content", prevGooglebotContent);
      }
    };
  }, []);

  const primary = "hsl(var(--primary))";
  const primaryTint = "hsl(var(--primary) / 0.12)";
  const primaryBorder = "hsl(var(--primary) / 0.25)";

  const isPresident = member?.category === "president" ||
    /সভাপতি|president/i.test(member?.post_title ?? "");

  const hasSensitive = member?.isApproved;
  const showLock = !hasSensitive;

  const handleBackToCommittee = () => {
    // Prefer real back navigation when available; otherwise go to landing committee section.
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/#committee");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Content */}
        <div className="layout-container pt-10 sm:pt-12 pb-16">
          {/* Back button (in-flow). Extra top padding prevents navbar overlap. */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleBackToCommittee}
              className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Committee
            </button>
          </div>
          {loading && (
            <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
              Loading profile…
            </div>
          )}

          {notFound && !loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <p className="text-muted-foreground">Member not found.</p>
              <Link to="/#committee" className="text-primary text-sm underline underline-offset-4">
                Back to committee
              </Link>
            </div>
          )}

          {member && !loading && (
            <div className="mx-auto max-w-3xl">

              {/* ── Hero card ── */}
              <div
                className="relative overflow-hidden rounded-2xl border border-border/60 shadow-lg"
                style={{ background: `linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--card)) 50%)` }}
              >
                {/* Top accent bar */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${primary}, hsl(var(--primary) / 0.4))` }} />

                <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:gap-8">
                  {/* Photo */}
                  <div className="flex flex-col items-center gap-3 sm:items-start">
                    <div
                      className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl border-2 shadow-md"
                      style={{ borderColor: primaryBorder }}
                    >
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center"
                          style={{ background: primaryTint }}
                        >
                          <UserCheck className="h-12 w-12" style={{ color: primary, opacity: 0.5 }} />
                        </div>
                      )}
                    </div>
                    {/* Badges under photo */}
                    <div className="flex flex-wrap gap-1.5">
                      {isPresident && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold"
                          style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
                        >
                          <Crown className="h-3.5 w-3.5" /> President
                        </span>
                      )}
                      {member.category && !isPresident && (
                        <span
                          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize"
                          style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
                        >
                          {member.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Header info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div>
                      <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {member.name}
                      </h1>
                      {(member.post_title || member.designation) && (
                        <span
                          className="mt-2 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
                          style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
                        >
                          {member.post_title || member.designation}
                        </span>
                      )}
                      {member.term_name && (
                        <p className="mt-1.5 text-xs text-muted-foreground">{member.term_name}</p>
                      )}
                    </div>

                    {/* Key public fields */}
                    <div className="grid grid-cols-1 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                      {member.batch && (
                        <span className="inline-flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                          <span><span className="font-semibold" style={{ color: primary }}>Batch: </span>{member.batch}</span>
                        </span>
                      )}
                      {member.alumni_id && (
                        <span className="inline-flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                          <span><span className="font-semibold" style={{ color: primary }}>Alumni ID: </span>{member.alumni_id}</span>
                        </span>
                      )}
                      {member.profession && (
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                          <span><span className="font-semibold" style={{ color: primary }}>Profession: </span>{member.profession}</span>
                        </span>
                      )}
                      {member.institution && (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                          <span className="whitespace-normal break-words"><span className="font-semibold" style={{ color: primary }}>University: </span>{member.institution}</span>
                        </span>
                      )}
                      {member.college_name && (
                        <span className="inline-flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                          <span className="truncate"><span className="font-semibold" style={{ color: primary }}>College: </span>{displayCollegeName(member.college_name)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── About ── */}
              {member.about && (
                <div className="mt-5 rounded-xl border border-border/60 bg-card p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
                    <Star className="h-4 w-4" style={{ color: primary }} />
                    About
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{member.about}</p>
                </div>
              )}

              {/* ── About winner (synced from alumni profile Short Bio) ── */}
              {member.winner_about && (
                <div className="mt-5 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-card p-5 dark:border-amber-800/50 dark:from-amber-950/25 dark:to-card">
                  <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
                    <Trophy className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    About winner
                  </h2>
                  <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">{member.winner_about}</p>
                </div>
              )}

              {/* ── Wishing / congratulations (governing vs other sections — different copy in DB + different styling) ── */}
              {member.wishing_message && (() => {
                const section =
                  member.board_section?.trim() || inferBoardSectionFromTitle(member.post_title);
                const governingWishing = section === "governing_body";
                const box = governingWishing
                  ? { backgroundColor: primaryTint, borderColor: primaryBorder }
                  : { backgroundColor: "#C5E8E0", borderColor: "rgba(6, 88, 76, 0.55)" };
                return (
                  <div className="mt-5 rounded-xl border p-5" style={box}>
                    <h2 className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: primary }}>
                      <MessageSquareQuote className="h-4 w-4" />
                      {governingWishing ? "Wishing you" : "Congratulations"}
                    </h2>
                    <p
                      className={
                        governingWishing
                          ? "text-sm leading-relaxed text-foreground/80 whitespace-pre-line italic"
                          : "text-sm font-bold leading-relaxed text-foreground whitespace-pre-line not-italic"
                      }
                    >
                      {governingWishing ? `"${member.wishing_message}"` : member.wishing_message}
                    </p>
                  </div>
                );
              })()}

              {/* ── Expertise ── (only for approved, shown below wishing) */}
              {hasSensitive && member.expertise && (
                <div className="mt-5 rounded-xl border border-border/60 bg-card p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
                    <Lightbulb className="h-4 w-4" style={{ color: primary }} />
                    Expertise
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{member.expertise}</p>
                </div>
              )}

              {/* ── Contact details ── */}
              <div className="mt-5 rounded-xl border border-border/60 bg-card p-5">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
                  <Phone className="h-4 w-4" style={{ color: primary }} />
                  Contact Details
                </h2>

                {hasSensitive ? (
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    {member.phone && (
                      <span className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" style={{ color: primary }} />
                        <span><span className="font-semibold" style={{ color: primary }}>Phone: </span>{member.phone}</span>
                      </span>
                    )}
                    {member.email && (
                      <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(member.email)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        <Mail className="h-4 w-4 shrink-0" style={{ color: primary }} />
                        <span><span className="font-semibold" style={{ color: primary }}>Email: </span>
                          <span className="underline underline-offset-2">{member.email}</span>
                        </span>
                      </a>
                    )}
                    {member.location && (
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" style={{ color: primary }} />
                        <span><span className="font-semibold" style={{ color: primary }}>Location: </span>{member.location}</span>
                      </span>
                    )}
                    {/* Social links */}
                    {(member.facebook_url || member.instagram_url || member.linkedin_url) && (
                      <div className="mt-1 flex items-center gap-4">
                        {member.facebook_url && (
                          <a href={member.facebook_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                            <Facebook className="h-5 w-5" />
                            <span className="text-xs">Facebook</span>
                          </a>
                        )}
                        {member.instagram_url && (
                          <a href={member.instagram_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                            <Instagram className="h-5 w-5" />
                            <span className="text-xs">Instagram</span>
                          </a>
                        )}
                        {member.linkedin_url && (
                          <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                            <Linkedin className="h-5 w-5" />
                            <span className="text-xs">LinkedIn</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Locked state */
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full"
                      style={{ backgroundColor: primaryTint }}
                    >
                      <Lock className="h-7 w-7" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Contact details are protected</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {!user
                          ? "Please log in with a verified alumni account to view phone, email and social links."
                          : "Your account is not admin-verified yet. Contact details will be visible once verified by admin."}
                      </p>
                    </div>
                    {!user && (
                      <Link
                        to={`/login?redirect=/committee/member/${id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        Log in to view
                      </Link>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
