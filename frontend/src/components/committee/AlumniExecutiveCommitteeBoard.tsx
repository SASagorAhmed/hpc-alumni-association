import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { StructuredCommitteePayload } from "@/components/committee/StructuredCommitteeDisplay";
import type { CommitteeMemberRow, CommitteePostBlock } from "@/components/committee/StructuredCommitteeDisplay";
import {
  BOARD_SECTION_LABELS,
  BOARD_SECTION_ORDER,
  type BoardSectionKey,
  resolveBoardSection,
} from "@/components/committee/boardSections";
import { cn } from "@/lib/utils";
import { isIosSafariViewport } from "@/lib/iosSafari";
import {
  Briefcase,
  Camera,
  GraduationCap,
  Phone,
  Hash,
  Facebook,
  Instagram,
  Linkedin,
  Crown,
  Building2,
  ExternalLink,
  ChevronDown,
  Users,
} from "lucide-react";

export interface DBMember {
  id: string;
  name: string;
  designation: string;
  category: string;
  batch: string | null;
  alumni_id: string | null;
  phone: string | null;
  email: string | null;
  institution: string | null;
  profession: string | null;
  college_name: string | null;
  job_status: string | null;
  about: string | null;
  wishing_message: string | null;
  winner_about: string | null;
  location: string | null;
  expertise: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
}

export function committeeRowToDBMember(m: CommitteeMemberRow): DBMember {
  return {
    id: m.id,
    name: m.name,
    designation: m.designation,
    category: m.category || "executive",
    batch: m.batch,
    alumni_id: m.alumni_id ?? null,
    phone: m.phone ?? null,
    email: m.email ?? null,
    institution: m.institution,
    profession: m.profession ?? null,
    college_name: m.college_name ?? null,
    job_status: m.job_status,
    about: m.about,
    wishing_message: m.wishing_message ?? null,
    winner_about: m.winner_about ?? null,
    location: m.location,
    expertise: m.expertise,
    facebook_url: m.facebook_url ?? null,
    instagram_url: m.instagram_url ?? null,
    linkedin_url: m.linkedin_url ?? null,
    photo_url: m.photo_url,
    display_order: m.display_order,
    is_active: true,
  };
}

function pickPresidentFromPostList(posts: CommitteePostBlock[]) {
  const sorted = [...posts].sort((a, b) => Number(a.display_order) - Number(b.display_order));
  const withMember = (p: (typeof sorted)[0]) => (p.members?.length ? p.members[0] : null);

  const highlighted = sorted.find((p) => (p.is_highlight === 1 || p.is_highlight === true) && withMember(p));
  if (highlighted) {
    const m = withMember(highlighted)!;
    return { member: m, postTitle: highlighted.title, postId: highlighted.id };
  }

  const titled = sorted.find((p) => /সভাপতি|president/i.test(String(p.title || "")) && withMember(p));
  if (titled) {
    const m = withMember(titled)!;
    return { member: m, postTitle: titled.title, postId: titled.id };
  }

  const singleSeat = sorted.find(
    (p) => !(p.allows_multiple === 1 || p.allows_multiple === true) && withMember(p)
  );
  if (singleSeat) {
    const m = withMember(singleSeat)!;
    return { member: m, postTitle: singleSeat.title, postId: singleSeat.id };
  }

  const anyPost = sorted.find((p) => withMember(p));
  if (anyPost) {
    const m = withMember(anyPost)!;
    return { member: m, postTitle: anyPost.title, postId: anyPost.id };
  }
  return null;
}

/** President for hero card — prefer **Governing Body** posts; fall back to all posts. */
export function pickPresidentFromStructured(data: StructuredCommitteePayload) {
  const sorted = [...data.posts].sort((a, b) => Number(a.display_order) - Number(b.display_order));
  const governing = sorted.filter((p) => resolveBoardSection(p) === "governing_body");
  let pick = pickPresidentFromPostList(governing.length > 0 ? governing : sorted);
  if (!pick && governing.length > 0) pick = pickPresidentFromPostList(sorted);
  return pick;
}

export function restMembersExceptPresident(data: StructuredCommitteePayload, excludeMemberId: string) {
  const posts = [...data.posts].sort((a, b) => Number(a.display_order) - Number(b.display_order));
  const out: { row: CommitteeMemberRow; postTitle: string }[] = [];
  for (const p of posts) {
    const ms = [...(p.members || [])].sort((a, b) => a.display_order - b.display_order);
    for (const m of ms) {
      if (m.id === excludeMemberId) continue;
      out.push({ row: m, postTitle: p.title });
    }
  }
  return out;
}

/** Executive member cards (non-president): only this many words are shown (no “See more”; rest is omitted). */
export const EXECUTIVE_WISHING_DISPLAY_WORDS = 40;

export function truncateToWordCount(text: string, maxWords: number): string {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

/** Keeps a single line of text inside its box by lowering font-size (max → min), then ellipsis if still too long at min. */
function useFitSingleLineText(text: string, maxPx: number, minPx: number): RefObject<HTMLHeadingElement | null> {
  const elRef = useRef<HTMLHeadingElement | null>(null);

  const fit = useCallback(() => {
    const el = elRef.current;
    if (!el) return;

    el.style.textOverflow = "";
    el.style.overflow = "hidden";

    let lo = minPx;
    let hi = maxPx;
    el.style.fontSize = `${hi}px`;
    if (el.scrollWidth <= el.clientWidth + 1) return;

    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (el.scrollWidth <= el.clientWidth + 1) hi = mid;
      else lo = mid;
    }

    el.style.fontSize = `${Math.max(minPx, hi)}px`;
    if (el.scrollWidth > el.clientWidth + 1) {
      el.style.textOverflow = "ellipsis";
    }
  }, [text, maxPx, minPx]);

  useLayoutEffect(() => {
    const run = () => requestAnimationFrame(fit);
    run();
    const el = elRef.current;
    const roTarget = el?.parentElement;
    if (!roTarget) return;
    const ro = new ResizeObserver(run);
    ro.observe(roTarget);
    return () => ro.disconnect();
  }, [fit]);

  return elRef;
}

export function PresidentHeroCard({
  member,
  roleLabel,
}: {
  member: DBMember;
  roleLabel?: string;
}) {
  const roleLine = roleLabel || member.designation || "President";
  const primary = "#FFFFFF";
  const presidentBadgeYellow = "#FFE566";
  const primaryTint = "hsl(var(--primary) / 0.12)";
  const primaryBorder = "hsl(var(--primary) / 0.25)";
  const cardBg = "hsl(var(--card))";

  const fallbackCollege = member.college_name || "N/A";

  const href = `/committee/member/${member.id}`;

  return (
    <Link to={href} aria-label={`Open profile: ${member.name}`} className="block max-w-full">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto w-fit max-w-full cursor-pointer overflow-hidden rounded-[13px] border border-border/55 bg-card shadow-card transition-shadow hover:shadow-card-hover"
        style={{
          background: "linear-gradient(135deg, #0a6f62 0%, #075f54 48%, #045248 100%)",
        }}
      >
        <div className="flex w-fit max-w-full flex-col">
        <div className="grid w-full max-w-full grid-cols-[minmax(0,28rem)_auto] items-center gap-x-2.5 p-[1.26rem]">
          <div className="flex min-w-0 w-full max-w-[28rem] flex-col justify-start gap-2 text-left">
          <div className="flex items-center gap-1">
            <div
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.25px] font-bold tracking-wide"
              style={{
                backgroundColor: primaryTint,
                borderColor: primaryBorder,
                color: primary,
              }}
            >
              <Crown className="h-[10.75px] w-[10.75px]" />
              KING
            </div>
            <div
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9.25px] font-bold tracking-wide"
              style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
            >
              #01
            </div>
          </div>

          <h3
            className="font-bold leading-tight text-foreground"
            style={{
              fontFamily: "'Cinzel', 'Arena', serif",
              fontSize: "23px",
              fontWeight: 900,
              letterSpacing: "0.03em",
              color: "#FFE566",
            }}
          >
            {member.name}
          </h3>

          <div
            className="inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10.75px] font-semibold"
            style={{
              backgroundColor: "rgba(251, 146, 60, 0.25)",
              borderColor: "rgba(253, 224, 71, 0.65)",
              color: "#FFF7D6",
              textShadow: "0 1px 4px rgba(0,0,0,0.55)",
            }}
          >
            {roleLine}
          </div>

          <div
            className="mt-0.5 grid min-w-0 w-full max-w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1 gap-y-0 text-[11.1px]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
          >
            <div className="flex w-auto min-w-0 shrink-0 flex-col gap-y-0.5">
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <Hash className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>Alumni Id: </span>
                  {member.alumni_id ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <GraduationCap className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>Batch: </span>
                  {member.batch ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <Briefcase className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>Profession: </span>
                  {member.profession ?? "N/A"}
                </span>
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-y-0.5">
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <GraduationCap className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>College: </span>
                  {fallbackCollege}
                </span>
              </span>
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <Building2 className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>University: </span>
                  {member.institution ?? "N/A"}
                </span>
              </span>
            </div>
          </div>

          {member.wishing_message ? (
            <div
              className="committee-member-wishing-box mt-0.5 w-full max-w-full rounded-md border p-2"
              style={{ backgroundColor: "#A6D9C7", borderColor: "rgba(6, 88, 76, 0.35)" }}
            >
              {/* President only: +15% vs member cards (8.75px / 9.25px baseline) */}
              <p className="font-semibold" style={{ color: "#000000", fontSize: "calc(8.75px * 1.15)" }}>
                Wishing you
              </p>
              {/* ~40 words visible height; up to 50 words allowed — scroll inside if longer */}
              <div
                className="mt-0.5 max-h-[7.92rem] overflow-y-auto overscroll-contain pr-0.5 leading-[1.4] [scrollbar-gutter:stable]"
                style={{ fontSize: "calc(9.25px * 1.15)", color: "#000000" }}
              >
                {member.wishing_message}
              </div>
            </div>
          ) : null}
          </div>

          <div
            className="relative aspect-square w-[15.12rem] shrink-0 self-center overflow-hidden rounded-md border"
            style={{ borderColor: primaryBorder }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, transparent 60%)`,
              }}
            />

            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.name}
                className="absolute inset-0 z-10 h-full w-full object-cover object-center"
                style={{ filter: "none" }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center relative z-10"
                style={{ background: `linear-gradient(135deg, ${primaryTint} 0%, transparent 65%)` }}
              >
                <Camera className="h-[34px] w-[34px]" style={{ color: primary, opacity: 0.6 }} />
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[12] flex justify-center px-2">
              <span
                className="inline-flex rounded-full border px-4 py-1.5 text-[14px] font-extrabold tracking-[0.16em]"
                style={{
                  color: "#FFE566",
                  borderColor: "rgba(253,224,71,0.65)",
                  backgroundColor: "rgba(0,0,0,0.42)",
                  textShadow: "0 2px 4px rgba(0,0,0,0.7)",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                PRESIDENT
              </span>
            </div>
          </div>
        </div>
        </div>
      </motion.div>
    </Link>
  );
}

export function ExecutiveMemberCard({
  member,
  serial,
  postTitle,
  governingBody = false,
}: {
  member: DBMember;
  serial: number;
  postTitle?: string;
  governingBody?: boolean;
}) {
  // Other member cards need slightly tighter typography.
  const nameRef = useFitSingleLineText(member.name, governingBody ? 22 : 20, governingBody ? 16 : 14);
  const wishingYouText = member.wishing_message
    ? truncateToWordCount(member.wishing_message, EXECUTIVE_WISHING_DISPLAY_WORDS)
    : "";
  const role = postTitle || member.designation;
  const primary = "hsl(var(--primary))";
  const primaryTint = "hsl(var(--primary) / 0.12)";
  const primaryBorder = "hsl(var(--primary) / 0.25)";
  const cardBg = "hsl(var(--card))";
  const badgeText = `#${String(serial).padStart(2, "0")}`;

  const fallbackCollege = member.college_name || "N/A";

  const href = `/committee/member/${member.id}`;
  const photoSize = governingBody ? 180 : 151;
  const cameraClassName = governingBody ? "h-[42px] w-[42px]" : "h-[34px] w-[34px]";

  return (
    <Link to={href} aria-label={`Open profile: ${member.name}`} className="block h-full w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={cn(
          "relative flex h-full min-h-[216px] w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[13px] border border-border/55 bg-card shadow-card transition-shadow hover:shadow-card-hover",
          governingBody && "min-h-[260px]"
        )}
        style={{
          background: "linear-gradient(135deg, #0a6f62 0%, #075f54 48%, #045248 100%)",
        }}
      >
        <div className="flex h-full w-full flex-col">
        <div className={cn("p-3.5", !governingBody && "p-3")}>
          <div className={cn("flex items-start", governingBody ? "gap-3.5" : "gap-2.5")}>
            <div
              className="relative shrink-0 overflow-hidden rounded-md border border-border/45"
              style={{ width: photoSize, height: photoSize }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, transparent 60%)`,
                }}
              />

              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="absolute inset-0 z-10 h-full w-full object-cover object-center"
                  style={{ filter: "none" }}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center relative z-10"
                  style={{ background: `linear-gradient(135deg, ${primaryTint} 0%, transparent 65%)` }}
                >
                  <Camera className={cameraClassName} style={{ color: primary, opacity: 0.6 }} />
                </div>
              )}
            </div>

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col justify-start gap-1.5 pt-0.5 text-left",
                governingBody ? "pl-2.5" : "pl-2"
              )}
            >
              <div
                className="inline-flex w-fit items-center rounded-full border border-primary/20 px-2 py-0.5 text-[9.25px] font-bold tracking-wide"
                style={{ backgroundColor: primaryTint, color: primary }}
              >
                {badgeText}
              </div>

              <h3
                ref={nameRef}
                title={member.name}
                className="block w-full min-w-0 whitespace-nowrap font-bold leading-tight text-foreground"
                style={{
                  fontFamily: "'Cinzel', 'Arena', serif",
                  fontSize: governingBody ? "23px" : "21px",
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                  color: "#FFB347",
                }}
              >
                {member.name}
              </h3>

              <div
                className="inline-flex w-fit max-w-full items-center rounded-full border border-primary/20 px-2.5 py-0.5 text-[10.75px] font-semibold"
                style={{
                  backgroundColor: "rgba(251, 146, 60, 0.25)",
                  borderColor: "rgba(253, 224, 71, 0.65)",
                  color: "#FFF7D6",
                  textShadow: "0 1px 4px rgba(0,0,0,0.55)",
                }}
              >
                {role}
              </div>

              {/* After post: Alumni ID → Batch → Profession (other member card only) */}
              <div
                className="mt-1 flex flex-col gap-y-0.5 text-[11.1px]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
              >
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <Hash className="h-[12.9px] w-[12.9px] shrink-0" style={{ color: "#FFFFFF" }} />
                  <span className="min-w-0">
                    <span className="font-bold" style={{ color: "#FFFFFF" }}>Alumni Id: </span>
                    {member.alumni_id ?? "N/A"}
                  </span>
                </span>
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <GraduationCap className="h-[12.9px] w-[12.9px] shrink-0" style={{ color: "#FFFFFF" }} />
                  <span className="min-w-0">
                    <span className="font-bold" style={{ color: "#FFFFFF" }}>Batch: </span>
                    {member.batch ?? "N/A"}
                  </span>
                </span>
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <Briefcase className="h-[12.9px] w-[12.9px] shrink-0" style={{ color: "#FFFFFF" }} />
                  <span className="min-w-0">
                    <span className="font-bold" style={{ color: "#FFFFFF" }}>Profession: </span>
                    {member.profession ?? "N/A"}
                  </span>
                </span>
                {governingBody ? (
                  <>
                    <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 break-words">
                      <Building2 className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: "#FFFFFF" }} />
                      <span className="min-w-0">
                        <span className="font-bold" style={{ color: "#FFFFFF" }}>University: </span>
                        {member.institution ?? "N/A"}
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 break-words">
                      <GraduationCap className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: "#FFFFFF" }} />
                      <span className="min-w-0">
                        <span className="font-bold" style={{ color: "#FFFFFF" }}>College: </span>
                        {fallbackCollege}
                      </span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Bottom: education removed for governing_body (moved to right column). */}
          {!governingBody ? (
            <div
              className="mt-2 flex flex-col gap-y-1 text-[11.1px]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
            >
              <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 break-words">
                <Building2 className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: "#FFFFFF" }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: "#FFFFFF" }}>University: </span>
                  {member.institution ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 break-words">
                <GraduationCap className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: "#FFFFFF" }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: "#FFFFFF" }}>College: </span>
                  {fallbackCollege}
                </span>
              </span>
            </div>
          ) : null}

        </div>

        {wishingYouText ? (
          <div className="mt-auto space-y-1 px-2.5 pb-2.5">
            <div
              className="committee-member-wishing-box w-full rounded-md border p-2"
              style={{ backgroundColor: "#A6D9C7", borderColor: "rgba(6, 88, 76, 0.35)" }}
            >
              <p className="text-[8.75px] font-semibold" style={{ color: "#000000" }}>
                Wishing you
              </p>
              <p
                className="mt-0.5 max-h-[10.5rem] overflow-hidden text-[9.25px] leading-[1.4] text-muted-foreground break-words"
                style={{ color: "#000000" }}
              >
                {wishingYouText}
              </p>
            </div>
          </div>
        ) : null}
        </div>
      </motion.div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE CARDS — phone-friendly (<540 px), full native readable font sizes
   ───────────────────────────────────────────────────────────────────────────── */

export function MobilePresidentCard({ member, roleLabel }: { member: DBMember; roleLabel?: string }) {
  const roleLine = roleLabel || member.designation || "President";
  const primary = "#FFFFFF";
  const presidentBadgeYellow = "#FFE566";
  const primaryTint = "hsl(var(--primary) / 0.12)";
  const primaryBorder = "hsl(var(--primary) / 0.25)";

  const href = `/committee/member/${member.id}`;

  return (
    <Link to={href} aria-label={`Open profile: ${member.name}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="cursor-pointer overflow-hidden rounded-[13px] border border-border/55 shadow-card"
        style={{ background: "linear-gradient(135deg, #0a6f62 0%, #075f54 48%, #045248 100%)" }}
      >
        {/* Photo */}
        <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "1/1" }}>
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{ filter: "none" }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryTint} 0%, transparent 65%)` }}>
              <Camera className="h-12 w-12" style={{ color: primary, opacity: 0.5 }} />
            </div>
          )}
          {/* Mobile president: KING badge on image; hide serial number */}
          <div className="absolute left-3 top-3 z-[7]">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold"
              style={{
                backgroundColor: primaryTint,
                borderColor: primaryBorder,
                color: presidentBadgeYellow,
              }}
            >
              <Crown className="h-3.5 w-3.5" /> KING
            </span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[8] flex justify-center px-2">
            <span
              className="inline-flex rounded-full border px-5 py-2 text-[16px] font-extrabold tracking-[0.18em]"
              style={{
                color: "#FFE566",
                borderColor: "rgba(253,224,71,0.65)",
                backgroundColor: "rgba(0,0,0,0.42)",
                textShadow: "0 0 10px rgba(255,229,102,0.42), 0 2px 4px rgba(0,0,0,0.7)",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}
            >
              PRESIDENT
            </span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-col gap-3 p-4">
          <h3
            className="break-words text-xl font-bold leading-tight [overflow-wrap:anywhere]"
            style={{
              fontFamily: "'Cinzel', 'Arena', serif",
              fontWeight: 900,
              letterSpacing: "0.03em",
              color: "#FFE566",
            }}
          >
            {member.name}
          </h3>

          <span
            className="inline-flex max-w-full min-w-0 items-center break-words rounded-full border px-3 py-1 text-sm font-semibold [overflow-wrap:anywhere]"
            style={{
              backgroundColor: "rgba(251, 146, 60, 0.25)",
              borderColor: "rgba(253, 224, 71, 0.65)",
              color: "#FFF7D6",
              textShadow: "0 1px 4px rgba(0,0,0,0.55)",
            }}
          >
            {roleLine}
          </span>

          {/* Two-column info grid (public fields only) */}
          <div
            className="flex w-full min-w-0 items-start justify-between gap-2 text-sm"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
          >
            {/* Left column: Alumni Id · Batch · Profession */}
            <div className="flex min-w-0 flex-1 flex-col gap-y-1">
              <span className="inline-flex min-w-0 items-start gap-1">
                <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="font-semibold" style={{ color: primary }}>Alumni Id: </span>
                  {member.alumni_id ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 items-start gap-1">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="font-semibold" style={{ color: primary }}>Batch: </span>
                  {member.batch ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 items-start gap-1">
                <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="font-semibold" style={{ color: primary }}>Profession: </span>
                  {member.profession ?? "N/A"}
                </span>
              </span>
            </div>
            {/* Right column: College · University */}
            <div className="flex min-w-0 flex-1 flex-col gap-y-1">
              <span className="inline-flex min-w-0 items-start gap-1">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="font-semibold" style={{ color: primary }}>College: </span>
                  {member.college_name || "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 items-start gap-1">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="font-semibold" style={{ color: primary }}>University: </span>
                  {member.institution ?? "N/A"}
                </span>
              </span>
            </div>
          </div>

          {member.wishing_message && (
            <div className="rounded-md border p-3" style={{ backgroundColor: "#A6D9C7", borderColor: "rgba(6, 88, 76, 0.35)" }}>
              <p className="text-xs font-semibold" style={{ color: "#000000" }}>Message</p>
              <p className="mt-1 break-words text-sm leading-relaxed italic text-justify hyphens-auto text-black [overflow-wrap:anywhere]">
                "{member.wishing_message}"
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export function MobileMemberCard({
  member,
  serial,
  postTitle,
  governingBody = false,
}: {
  member: DBMember;
  serial: number;
  postTitle?: string;
  governingBody?: boolean;
}) {
  const role = postTitle || member.designation;
  const primary = "hsl(var(--primary))";
  const primaryTint = "hsl(var(--primary) / 0.12)";
  const primaryBorder = "hsl(var(--primary) / 0.25)";
  const badgeText = `#${String(serial).padStart(2, "0")}`;
  const wishingText = member.wishing_message
    ? truncateToWordCount(member.wishing_message, EXECUTIVE_WISHING_DISPLAY_WORDS)
    : "";

  const href = `/committee/member/${member.id}`;

  return (
    <Link to={href} aria-label={`Open profile: ${member.name}`} className="block h-full w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[13px] border border-border/55 shadow-card"
        style={{ background: "linear-gradient(135deg, #0a6f62 0%, #075f54 48%, #045248 100%)" }}
      >
      <div className={cn("flex min-w-0 p-3", governingBody ? "gap-3" : "gap-2")}>
        {/* Photo */}
        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-md border" style={{ borderColor: primaryBorder }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, transparent 60%)` }} />
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="absolute inset-0 z-10 h-full w-full object-cover object-center"
              style={{ filter: "none" }}
            />
          ) : (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryTint} 0%, transparent 65%)` }}>
              <Camera className="h-8 w-8" style={{ color: primary, opacity: 0.5 }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          <span
            className="inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
          >
            {badgeText}
          </span>
          <h3
            className={cn(
              "break-words font-bold leading-tight text-foreground [overflow-wrap:anywhere]",
              governingBody ? "text-base" : "text-sm"
            )}
            style={{
              fontFamily: "'Cinzel', 'Arena', serif",
              fontWeight: 900,
              letterSpacing: "0.02em",
              color: "#FFB347",
            }}
          >
            {member.name}
          </h3>
          <span
            className="inline-flex max-w-full min-w-0 items-center break-words rounded-full border px-2.5 py-0.5 text-xs font-semibold [overflow-wrap:anywhere]"
            style={{
              backgroundColor: "rgba(251, 146, 60, 0.25)",
              borderColor: "rgba(253, 224, 71, 0.65)",
              color: "#FFF7D6",
              textShadow: "0 1px 4px rgba(0,0,0,0.55)",
            }}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Bottom fields (serially in one column) */}
      <div
        className="mx-3 mb-2 flex min-w-0 flex-col gap-0.5 text-xs"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
      >
        <span className="inline-flex min-w-0 items-start gap-1.5">
          <Hash className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "#FFFFFF" }} />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="font-semibold" style={{ color: "#FFFFFF" }}>Alumni Id: </span>
            {member.alumni_id ?? "N/A"}
          </span>
        </span>

        <span className="inline-flex min-w-0 items-start gap-1.5">
          <GraduationCap className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "#FFFFFF" }} />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="font-semibold" style={{ color: "#FFFFFF" }}>Batch: </span>
            {member.batch ?? "N/A"}
          </span>
        </span>

        <span className="inline-flex min-w-0 items-start gap-1.5">
          <Briefcase className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "#FFFFFF" }} />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="font-semibold" style={{ color: "#FFFFFF" }}>Profession: </span>
            {member.profession ?? "N/A"}
          </span>
        </span>
      </div>

      {/* College/University shown without bordered box */}
          <div
            className="mx-3 mb-2 flex min-w-0 flex-col gap-0.5 text-xs"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
          >
        <span className="inline-flex min-w-0 items-start gap-1.5">
              <GraduationCap className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "#FFFFFF" }} />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                <span className="font-semibold" style={{ color: "#FFFFFF" }}>College: </span>
            {member.college_name || "N/A"}
          </span>
        </span>

        <span className="inline-flex min-w-0 items-start gap-1.5">
              <Building2 className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "#FFFFFF" }} />
          <span className="min-w-0 break-words text-[10px] leading-snug [overflow-wrap:anywhere]">
                <span className="font-semibold" style={{ color: "#FFFFFF" }}>Uni: </span>
            {member.institution ?? "N/A"}
          </span>
        </span>
      </div>

      {wishingText && (
        <div
          className="mx-3 mb-2 mt-auto min-w-0 rounded-md border p-2.5"
          style={{ backgroundColor: "#A6D9C7", borderColor: "rgba(6, 88, 76, 0.35)" }}
        >
          <p className="text-[10px] font-semibold" style={{ color: "#000000" }}>Message</p>
          <p
            className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground italic [overflow-wrap:anywhere]"
            style={{ color: "#000000" }}
          >
            "{wishingText}"
          </p>
        </div>
      )}

      <div className="pb-3" />
    </motion.div>
    </Link>
  );
}

/** Landing / page header for Alumni Executive Committee */
export function AlumniExecutiveCommitteeIntro({
  totalMembers,
  compact = false,
}: {
  totalMembers: number;
  /** Smaller margins when embedded on /committee page */
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className={compact ? "mb-8 text-center" : "mb-12 text-center"}
    >
      <p
        className="mb-2 text-[13px] font-semibold tracking-wider"
        style={{ fontFamily: "'Outfit', sans-serif", color: "var(--committee-intro-eyebrow)" }}
      >
        HPC Alumni Executive Committee
      </p>
      <h2
        className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        Alumni Executive Committee 2025–2027
      </h2>

      <p className="mt-3 w-full max-w-none text-[15px] text-muted-foreground leading-relaxed text-justify hyphens-auto">
        The Alumni Executive Committee represents the elected and appointed leadership of the Hamdard Public
        College Alumni Association. These members are responsible for guiding the alumni network, organizing
        activities, and supporting the growth of the HPC alumni community.
        <br />
        <br />
        Meet the leadership team shaping the future of the HPC Alumni Association.
        <br />
        <br />
        The Alumni Executive Committee serves as the core leadership body of the Hamdard Public College Alumni
        Association. It is composed of elected and appointed members who are dedicated to guiding the vision, mission,
        and strategic direction of the alumni network.
        <br />
        <br />
        The committee plays a vital role in strengthening connections among alumni, organizing events, promoting
        collaboration, and supporting initiatives that benefit both former and current students of the college. Through
        active leadership and commitment, the committee ensures that the values, traditions, and reputation of Hamdard
        Public College are upheld and carried forward.
        <br />
        <br />
        By fostering communication, mentorship, and professional networking opportunities, the Alumni Executive
        Committee continues to build a strong and united global alumni community that contributes positively to society
        and the development of the institution.
      </p>

      <p className="mt-4 text-sm text-muted-foreground/70">Total Members: {totalMembers}</p>
    </motion.div>
  );
}

/**
 * President special card on top + standard member cards for everyone else (Alumni Executive Committee).
 * Below the laptop reference width the entire board is proportionally scaled down so it looks like
 * a zoomed-out version of the desktop layout (same approach as AchievementBanner).
 */
const COMMITTEE_DESIGN_W = 1024; // reference = laptop viewport
const MOBILE_REF_W = 480; // reference mobile width — cards zoom below this

type CollapsibleSection = Exclude<BoardSectionKey, "governing_body">;

const SECTION_REVEAL_META: Record<CollapsibleSection, { cta: string; hint: string }> = {
  executive_committee: {
    cta: "View Executive Committee",
    hint: "Vice presidents, joint secretary & organizers",
  },
  committee_heads: {
    cta: "View Committee Heads",
    hint: "Editors & programme leads",
  },
  committee_members: {
    cta: "View Committee Members",
    hint: "নির্বাহী সদস্য · executive members",
  },
};

function sectionItemsFor(
  withSerial: { row: CommitteeMemberRow; postTitle: string; section: BoardSectionKey; serial: number }[],
  sec: BoardSectionKey
) {
  return withSerial.filter((x) => x.section === sec);
}

export function AlumniExecutiveCommitteeBoard({
  data,
  showAll = false,
  compactIntro = false,
}: {
  data: StructuredCommitteePayload;
  showAll?: boolean;
  compactIntro?: boolean;
}) {
  const [openExecutive, setOpenExecutive] = useState(showAll);
  const [openHeads, setOpenHeads] = useState(showAll);
  const [openMembers, setOpenMembers] = useState(showAll);

  useEffect(() => {
    if (showAll) {
      setOpenExecutive(true);
      setOpenHeads(true);
      setOpenMembers(true);
    }
  }, [showAll]);

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  const [boardWrapH, setBoardWrapH] = useState<number | undefined>(undefined);
  const [boardW, setBoardW] = useState(COMMITTEE_DESIGN_W);

  const totalMembers = data.posts.reduce((n, p) => n + (p.members?.length || 0), 0);

  // Measure outer container width vs design height → scale + wrapper height.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.getBoundingClientRect().width;
      if (!w) return;
      setBoardW(w);
      const s = Math.min(1, w / COMMITTEE_DESIGN_W);
      setBoardScale(s);
      setBoardWrapH(s < 1 ? Math.round(inner.offsetHeight * s) : undefined);
    };
    let r1 = 0,
      r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(update);
    });
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      ro.disconnect();
    };
  }, [openExecutive, openHeads, openMembers, showAll, totalMembers]);

  const presidentPick = pickPresidentFromStructured(data);

  if (!presidentPick) {
    return (
      <>
        <AlumniExecutiveCommitteeIntro
          totalMembers={0}
          termName={data.term.name}
          termDescription={data.term.description}
          compact={compactIntro}
        />
        <p className="text-center text-sm text-muted-foreground py-6">
          Executive committee members will appear here once they are published.
        </p>
      </>
    );
  }

  const presidentDb = committeeRowToDBMember(presidentPick.member);
  const presidentPost =
    data.posts.find((p) => p.id === presidentPick.postId) ?? null;
  const presidentInGoverning = presidentPost
    ? resolveBoardSection(presidentPost) === "governing_body"
    : false;

  const postsSorted = [...data.posts].sort(
    (a, b) => Number(a.display_order) - Number(b.display_order)
  );
  const presidentId = presidentPick.member.id;
  const orderedFlat: { row: CommitteeMemberRow; postTitle: string; section: BoardSectionKey }[] = [];
  for (const sec of BOARD_SECTION_ORDER) {
    for (const p of postsSorted) {
      if (resolveBoardSection(p) !== sec) continue;
      const ms = [...(p.members || [])].sort((a, b) => a.display_order - b.display_order);
      for (const m of ms) {
        if (m.id === presidentId) continue;
        orderedFlat.push({ row: m, postTitle: p.title, section: sec });
      }
    }
  }
  const withSerial = orderedFlat.map((item, idx) => ({ ...item, serial: idx + 2 }));

  const governingItems = sectionItemsFor(withSerial, "governing_body");

  const sectionIsOpen = (sec: BoardSectionKey) => {
    if (sec === "governing_body") return true;
    if (showAll) return true;
    if (sec === "executive_committee") return openExecutive;
    if (sec === "committee_heads") return openHeads;
    return openMembers;
  };

  const toggleSection = (sec: CollapsibleSection) => {
    if (showAll) return;
    if (sec === "executive_committee") setOpenExecutive((v) => !v);
    else if (sec === "committee_heads") setOpenHeads((v) => !v);
    else setOpenMembers((v) => !v);
  };

  const scaled = boardScale < 1;
  const isMobile = boardW < 540;
  const twoColMobile = isMobile;
  const mobileZoom = isMobile && boardW < MOBILE_REF_W ? boardW / MOBILE_REF_W : 1;
  const mobileGridZoomStyle =
    isMobile && mobileZoom < 1 && !isIosSafariViewport() ? ({ zoom: mobileZoom } as CSSProperties) : undefined;

  const renderRevealBar = (sec: CollapsibleSection, colSpan2: boolean) => {
    const items = sectionItemsFor(withSerial, sec);
    const count = items.length;
    if (count === 0) return null;
    if (showAll || sectionIsOpen(sec)) return null;
    const meta = SECTION_REVEAL_META[sec];
    return (
      <div className={cn(colSpan2 && "col-span-2", "w-full")} key={`reveal-${sec}`}>
        <button
          type="button"
          onClick={() => toggleSection(sec)}
          className="group relative w-full overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.07] px-4 py-4 text-left shadow-sm ring-1 ring-black/[0.04] transition-all hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/15">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold tracking-tight text-foreground">{meta.cta}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{meta.hint}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-muted/90 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {count} {count === 1 ? "member" : "members"}
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-primary" />
            </div>
          </div>
        </button>
      </div>
    );
  };

  const renderMobileGoverning = () => {
    const meta = BOARD_SECTION_LABELS.governing_body;
    const items = governingItems;
    const showPresidentHere = presidentInGoverning;
    if (!showPresidentHere && !items.length) return null;
    return (
      <Fragment key="governing">
        <div className={twoColMobile ? "col-span-2" : undefined}>
          <h3 className="mt-1 text-sm font-bold tracking-wide text-foreground/80">{meta.title}</h3>
        </div>
        {showPresidentHere ? (
          <div className={twoColMobile ? "col-span-2" : undefined}>
            <MobilePresidentCard member={presidentDb} roleLabel={presidentPick.postTitle} />
          </div>
        ) : null}
        {items.map((item) => (
          <MobileMemberCard
            key={item.row.id}
            member={committeeRowToDBMember(item.row)}
            serial={item.serial}
            postTitle={item.postTitle}
            governingBody
          />
        ))}
      </Fragment>
    );
  };

  const renderMobileCollapsible = (sec: CollapsibleSection) => {
    const count = sectionItemsFor(withSerial, sec).length;
    if (count === 0) return null;
    if (!sectionIsOpen(sec) && !showAll) return renderRevealBar(sec, true);
    const meta = BOARD_SECTION_LABELS[sec];
    const items = sectionItemsFor(withSerial, sec);
    return (
      <Fragment key={sec}>
        <div className={twoColMobile ? "col-span-2" : undefined}>
          <button
            type="button"
            disabled={showAll}
            onClick={() => toggleSection(sec)}
            className="group w-full rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.07] px-4 py-3 text-left shadow-sm ring-1 ring-black/[0.04] transition-all hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-wide text-foreground/80">{meta.title}</h3>
                {meta.subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{meta.subtitle}</p> : null}
              </div>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-primary rotate-180" />
            </div>
          </button>
        </div>
        {items.map((item) => (
          <MobileMemberCard
            key={item.row.id}
            member={committeeRowToDBMember(item.row)}
            serial={item.serial}
            postTitle={item.postTitle}
          />
        ))}
        {!showAll ? (
          <div className={cn(twoColMobile && "col-span-2", "flex justify-center pb-1 pt-1")}>
            <button
              type="button"
              onClick={() => toggleSection(sec)}
              className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              Hide · {meta.title}
            </button>
          </div>
        ) : null}
      </Fragment>
    );
  };

  const renderDesktopGoverning = () => {
    const items = governingItems;
    const showPresidentHere = presidentInGoverning;
    if (!showPresidentHere && !items.length) return null;
    const meta = BOARD_SECTION_LABELS.governing_body;
    return (
      <div key="governing" className="space-y-4">
        <div className="pt-0">
          <h3 className="text-lg font-bold text-foreground">{meta.title}</h3>
        </div>
        {showPresidentHere ? (
          <div className="mx-auto flex w-full min-w-0 justify-center px-0">
            <PresidentHeroCard member={presidentDb} roleLabel={presidentPick.postTitle} />
          </div>
        ) : null}
        {items.length > 0 ? (
          <div
            className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-2 lg:gap-5"
            style={scaled ? { gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" } : undefined}
          >
            {items.map((item) => (
              <div key={item.row.id} className="min-w-0 h-full">
                <ExecutiveMemberCard
                  member={committeeRowToDBMember(item.row)}
                  serial={item.serial}
                  postTitle={item.postTitle}
                  governingBody
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderDesktopCollapsible = (sec: CollapsibleSection) => {
    const count = sectionItemsFor(withSerial, sec).length;
    if (count === 0) return null;
    if (!sectionIsOpen(sec) && !showAll) {
      return renderRevealBar(sec, false);
    }
    const meta = BOARD_SECTION_LABELS[sec];
    const items = sectionItemsFor(withSerial, sec);
    return (
      <div key={sec} className="space-y-4">
        <div className="pt-2">
          <button
            type="button"
            disabled={showAll}
            onClick={() => toggleSection(sec)}
            className="group w-full rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.07] px-4 py-3 text-left shadow-sm ring-1 ring-black/[0.04] transition-all hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground">{meta.title}</h3>
                {meta.subtitle ? <p className="text-sm text-muted-foreground">{meta.subtitle}</p> : null}
              </div>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-primary rotate-180" />
            </div>
          </button>
        </div>
        {items.length > 0 ? (
          <div
            className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5"
            style={scaled ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" } : undefined}
          >
            {items.map((item) => (
              <div key={item.row.id} className="min-w-0 h-full">
                <ExecutiveMemberCard
                  member={committeeRowToDBMember(item.row)}
                  serial={item.serial}
                  postTitle={item.postTitle}
                />
              </div>
            ))}
          </div>
        ) : null}
        {!showAll ? (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => toggleSection(sec)}
              className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              Hide · {meta.title}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <AlumniExecutiveCommitteeIntro
        totalMembers={totalMembers}
        termName={data.term.name}
        termDescription={data.term.description}
        compact={compactIntro}
      />

      <div ref={outerRef} className="w-full min-w-0">
        {isMobile ? (
          /* ── MOBILE layout (<540 px): 4 sections + 2-col cards ── */
          <div
            ref={innerRef}
            className={cn(
              "committee-mobile-board hpc-ios-touch-text-root min-w-0",
              twoColMobile ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"
            )}
            style={mobileGridZoomStyle}
          >
            {presidentPick && !presidentInGoverning ? (
              <div className={twoColMobile ? "col-span-2" : undefined}>
                <MobilePresidentCard member={presidentDb} roleLabel={presidentPick.postTitle} />
              </div>
            ) : null}
            {renderMobileGoverning()}
            {renderMobileCollapsible("executive_committee")}
            {renderMobileCollapsible("committee_heads")}
            {renderMobileCollapsible("committee_members")}
          </div>
        ) : (
          /* ── DESKTOP / TABLET layout: transform-scale canvas (≥ 540 px) ── */
          <div
            className="relative overflow-hidden"
            style={scaled && boardWrapH ? { height: boardWrapH } : undefined}
          >
            <div
              ref={innerRef}
              className="flex flex-col origin-top-left"
              style={scaled
                ? { width: `${COMMITTEE_DESIGN_W}px`, transform: `scale(${boardScale})`, gap: "40px" }
                : { width: "100%", gap: "40px" }
              }
            >
              {presidentPick && !presidentInGoverning ? (
                <div className="mx-auto flex w-full min-w-0 justify-center px-0">
                  <PresidentHeroCard member={presidentDb} roleLabel={presidentPick.postTitle} />
                </div>
              ) : null}
              {renderDesktopGoverning()}
              {renderDesktopCollapsible("executive_committee")}
              {renderDesktopCollapsible("committee_heads")}
              {renderDesktopCollapsible("committee_members")}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
