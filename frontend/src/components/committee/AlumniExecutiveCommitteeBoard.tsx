import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { StructuredCommitteePayload } from "@/components/committee/StructuredCommitteeDisplay";
import type { CommitteeMemberRow } from "@/components/committee/StructuredCommitteeDisplay";
import { Briefcase, Camera, GraduationCap, Phone, Hash, Facebook, Instagram, Linkedin, Crown, Building2, ExternalLink } from "lucide-react";

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

/** President for hero card: highlight post → সভাপতি/President → first single-seat → first member */
export function pickPresidentFromStructured(data: StructuredCommitteePayload) {
  const posts = [...data.posts].sort((a, b) => Number(a.display_order) - Number(b.display_order));
  const withMember = (p: (typeof posts)[0]) => (p.members?.length ? p.members[0] : null);

  const highlighted = posts.find((p) => (p.is_highlight === 1 || p.is_highlight === true) && withMember(p));
  if (highlighted) {
    const m = withMember(highlighted)!;
    return { member: m, postTitle: highlighted.title, postId: highlighted.id };
  }

  const titled = posts.find((p) => /সভাপতি|president/i.test(String(p.title || "")) && withMember(p));
  if (titled) {
    const m = withMember(titled)!;
    return { member: m, postTitle: titled.title, postId: titled.id };
  }

  const singleSeat = posts.find(
    (p) => !(p.allows_multiple === 1 || p.allows_multiple === true) && withMember(p)
  );
  if (singleSeat) {
    const m = withMember(singleSeat)!;
    return { member: m, postTitle: singleSeat.title, postId: singleSeat.id };
  }

  const anyPost = posts.find((p) => withMember(p));
  if (anyPost) {
    const m = withMember(anyPost)!;
    return { member: m, postTitle: anyPost.title, postId: anyPost.id };
  }
  return null;
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
  const primary = "hsl(var(--primary))";
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
          background: `linear-gradient(135deg, hsl(var(--primary) / 0.14) 0%, ${cardBg} 45%, ${cardBg} 100%)`,
        }}
      >
        <div className="flex w-fit max-w-full flex-col">
        <div className="grid w-full max-w-full grid-cols-[minmax(0,28rem)_auto] items-center gap-x-2.5 p-[1.26rem]">
          <div className="flex min-w-0 w-full max-w-[28rem] flex-col justify-start gap-2 text-left">
          <div className="flex items-center gap-1">
            <div
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.25px] font-bold tracking-wide"
              style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
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
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: "23px" }}
          >
            {member.name}
          </h3>

          <div
            className="inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10.75px] font-semibold"
            style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
          >
            {roleLine}
          </div>

          <div className="mt-0.5 grid min-w-0 w-full max-w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1 gap-y-0 text-[11.1px] text-muted-foreground">
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
              style={{ backgroundColor: primaryTint, borderColor: primaryBorder }}
            >
              {/* President only: +15% vs member cards (8.75px / 9.25px baseline) */}
              <p className="font-semibold" style={{ color: primary, fontSize: "calc(8.75px * 1.15)" }}>
                Wishing you
              </p>
              {/* ~40 words visible height; up to 50 words allowed — scroll inside if longer */}
              <div
                className="mt-0.5 max-h-[7.92rem] overflow-y-auto overscroll-contain pr-0.5 leading-[1.4] text-muted-foreground [scrollbar-gutter:stable]"
                style={{ fontSize: "calc(9.25px * 1.15)" }}
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
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center relative z-10"
                style={{ background: `linear-gradient(135deg, ${primaryTint} 0%, transparent 65%)` }}
              >
                <Camera className="h-[34px] w-[34px]" style={{ color: primary, opacity: 0.6 }} />
              </div>
            )}
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
}: {
  member: DBMember;
  serial: number;
  postTitle?: string;
}) {
  const nameRef = useFitSingleLineText(member.name, 22, 16);
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

  return (
    <Link to={href} aria-label={`Open profile: ${member.name}`} className="block w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative min-h-[216px] w-full min-w-0 cursor-pointer overflow-hidden rounded-[13px] border border-border/55 bg-card shadow-card transition-shadow hover:shadow-card-hover"
        style={{
          background: `linear-gradient(135deg, hsl(var(--primary) / 0.14) 0%, ${cardBg} 45%, ${cardBg} 100%)`,
        }}
      >
        <div className="flex w-full flex-col">
        <div className="p-3.5">
          <div className="flex items-start gap-3.5">
            <div
              className="relative h-[151px] w-[151px] shrink-0 overflow-hidden rounded-md border border-border/45"
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
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center relative z-10"
                  style={{ background: `linear-gradient(135deg, ${primaryTint} 0%, transparent 65%)` }}
                >
                  <Camera className="h-[34px] w-[34px]" style={{ color: primary, opacity: 0.6 }} />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-start gap-1.5 pt-0.5 pl-2.5 text-left">
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
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "23px",
                }}
              >
                {member.name}
              </h3>

              <div
                className="inline-flex w-fit max-w-full items-center rounded-full border border-primary/20 px-2.5 py-0.5 text-[10.75px] font-semibold"
                style={{ backgroundColor: primaryTint, color: primary }}
              >
                {role}
              </div>

              {/* After post: Alumni ID → Batch → Profession (other member card only) */}
              <div className="mt-1 flex flex-col gap-y-0.5 text-[11.1px] text-muted-foreground">
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <Hash className="h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                  <span className="min-w-0">
                    <span className="font-bold" style={{ color: primary }}>Alumni Id: </span>
                    {member.alumni_id ?? "N/A"}
                  </span>
                </span>
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <GraduationCap className="h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                  <span className="min-w-0">
                    <span className="font-bold" style={{ color: primary }}>Batch: </span>
                    {member.batch ?? "N/A"}
                  </span>
                </span>
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <Briefcase className="h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                  <span className="min-w-0">
                    <span className="font-bold" style={{ color: primary }}>Profession: </span>
                    {member.profession ?? "N/A"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom: education (non-sensitive) */}
          <div className="mt-2 min-w-0 overflow-x-auto rounded-md border border-border/40 bg-muted/20 px-2 py-1.5 [-webkit-overflow-scrolling:touch]">
            <div className="flex flex-col gap-y-1 text-[11.1px] text-muted-foreground">
              <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 break-words">
                <Building2 className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>University: </span>
                  {member.institution ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 break-words">
                <GraduationCap className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>College: </span>
                  {fallbackCollege}
                </span>
              </span>
            </div>
          </div>

        </div>

        {wishingYouText ? (
          <div className="space-y-1 px-2.5 pb-2.5">
            <div
              className="committee-member-wishing-box w-full rounded-md border p-2"
              style={{ backgroundColor: primaryTint, borderColor: primaryBorder }}
            >
              <p className="text-[8.75px] font-semibold" style={{ color: primary }}>
                Wishing you
              </p>
              <p className="mt-0.5 max-h-[10.5rem] overflow-hidden text-[9.25px] leading-[1.4] text-muted-foreground break-words">
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
  const primary = "hsl(var(--primary))";
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
        style={{ background: `linear-gradient(135deg, hsl(var(--primary) / 0.14) 0%, hsl(var(--card)) 45%, hsl(var(--card)) 100%)` }}
      >
        {/* KING + #01 badges — above photo */}
        <div className="flex items-center gap-1.5 px-4 pt-4 pb-2">
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold"
            style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}>
            <Crown className="h-3.5 w-3.5" /> KING
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold"
            style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}>
            #01
          </span>
        </div>

        {/* Photo */}
        <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "1/1" }}>
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.name} className="absolute inset-0 h-full w-full object-cover object-center" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryTint} 0%, transparent 65%)` }}>
              <Camera className="h-12 w-12" style={{ color: primary, opacity: 0.5 }} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-3 p-4">
          <h3 className="text-xl font-bold leading-tight text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {member.name}
          </h3>

          <span className="inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold"
            style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}>
            {roleLine}
          </span>

          {/* Two-column info grid (public fields only) */}
          <div className="flex w-full min-w-0 items-start justify-between gap-2 text-sm text-muted-foreground">
            {/* Left column: Alumni Id · Batch · Profession */}
            <div className="flex min-w-0 flex-col gap-y-1">
              <span className="inline-flex min-w-0 items-start gap-1">
                <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="min-w-0 truncate"><span className="font-semibold" style={{ color: primary }}>Alumni Id: </span>{member.alumni_id ?? "N/A"}</span>
              </span>
              <span className="inline-flex min-w-0 items-start gap-1">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="whitespace-nowrap"><span className="font-semibold" style={{ color: primary }}>Batch: </span>{member.batch ?? "N/A"}</span>
              </span>
              <span className="inline-flex min-w-0 items-start gap-1">
                <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="whitespace-nowrap"><span className="font-semibold" style={{ color: primary }}>Profession: </span>{member.profession ?? "N/A"}</span>
              </span>
            </div>
            {/* Right column: College · University */}
            <div className="flex min-w-0 flex-col gap-y-1">
              <span className="inline-flex min-w-0 items-start gap-1">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="min-w-0 truncate"><span className="font-semibold" style={{ color: primary }}>College: </span>{member.college_name || "N/A"}</span>
              </span>
              <span className="inline-flex min-w-0 items-start gap-1">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                <span className="min-w-0 truncate"><span className="font-semibold" style={{ color: primary }}>University: </span>{member.institution ?? "N/A"}</span>
              </span>
            </div>
          </div>

          {member.wishing_message && (
            <div className="rounded-md border p-3" style={{ backgroundColor: primaryTint, borderColor: primaryBorder }}>
              <p className="text-xs font-semibold" style={{ color: primary }}>Message</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground italic">"{member.wishing_message}"</p>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export function MobileMemberCard({ member, serial, postTitle }: { member: DBMember; serial: number; postTitle?: string }) {
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
    <Link to={href} aria-label={`Open profile: ${member.name}`} className="block w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="cursor-pointer overflow-hidden rounded-[13px] border border-border/55 shadow-card"
        style={{ background: `linear-gradient(135deg, hsl(var(--primary) / 0.14) 0%, hsl(var(--card)) 45%, hsl(var(--card)) 100%)` }}
      >
      <div className="flex gap-3 p-3">
        {/* Photo */}
        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-md border" style={{ borderColor: primaryBorder }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, transparent 60%)` }} />
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.name} className="absolute inset-0 z-10 h-full w-full object-cover object-center" />
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
          <h3 className="truncate font-bold leading-tight text-foreground text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {member.name}
          </h3>
          <span className="inline-flex w-fit max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}>
            {role}
          </span>
        </div>
      </div>

      {/* Bottom fields (serially in one column) */}
      <div className="mx-3 mb-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-start gap-1.5">
            <Hash className="mt-0.5 h-3 w-3 shrink-0" style={{ color: primary }} />
            <span className="min-w-0 truncate">
              <span className="font-semibold" style={{ color: primary }}>Alumni Id: </span>
              {member.alumni_id ?? "N/A"}
            </span>
          </span>

          <span className="inline-flex items-start gap-1.5">
            <GraduationCap className="mt-0.5 h-3 w-3 shrink-0" style={{ color: primary }} />
            <span className="min-w-0 truncate">
              <span className="font-semibold" style={{ color: primary }}>Batch: </span>
              {member.batch ?? "N/A"}
            </span>
          </span>

          <span className="inline-flex items-start gap-1.5">
            <Briefcase className="mt-0.5 h-3 w-3 shrink-0" style={{ color: primary }} />
            <span className="min-w-0 truncate">
              <span className="font-semibold" style={{ color: primary }}>Profession: </span>
              {member.profession ?? "N/A"}
            </span>
          </span>

          <span className="inline-flex items-start gap-1.5">
            <GraduationCap className="mt-0.5 h-3 w-3 shrink-0" style={{ color: primary }} />
            <span className="min-w-0 truncate">
              <span className="font-semibold" style={{ color: primary }}>College: </span>
              {member.college_name || "N/A"}
            </span>
          </span>

          <span className="inline-flex items-start gap-1.5">
            <Building2 className="mt-0.5 h-3 w-3 shrink-0" style={{ color: primary }} />
            <span className="min-w-0 truncate text-[10px] leading-snug">
              <span className="font-semibold" style={{ color: primary }}>Uni: </span>
              {member.institution ?? "N/A"}
            </span>
          </span>
        </div>
      </div>

      {wishingText && (
        <div
          className="mx-3 mb-2 rounded-md border p-2.5"
          style={{ backgroundColor: primaryTint, borderColor: primaryBorder }}
        >
          <p className="text-[10px] font-semibold" style={{ color: primary }}>Message</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground italic break-words">
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
  termName,
  termDescription,
  compact = false,
}: {
  totalMembers: number;
  termName?: string | null;
  termDescription?: string | null;
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
        ALUMNI EXECUTIVE COMMITTEE
      </p>
      <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl" style={{ fontFamily: "'Outfit', sans-serif" }}>
        Alumni Executive Committee
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
        Elected and appointed leadership of the HPC Alumni Association — not the general alumni directory.
      </p>
      {termName ? <p className="mt-2 text-sm font-semibold text-foreground/80">{termName}</p> : null}
      {termDescription ? (
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{termDescription}</p>
      ) : null}
      <p className="mt-1 text-sm text-muted-foreground/70">Total members: {totalMembers}</p>
    </motion.div>
  );
}

/**
 * President special card on top + standard member cards for everyone else (Alumni Executive Committee).
 * Below the laptop reference width the entire board is proportionally scaled down so it looks like
 * a zoomed-out version of the desktop layout (same approach as AchievementBanner).
 */
const COMMITTEE_DESIGN_W = 1024; // reference = laptop viewport
const MOBILE_REF_W = 480;        // reference mobile width — cards zoom below this

const CORE_LEADERSHIP_TITLES = [
  "সভাপতি",
  "সাধারণ সম্পাদক",
  "যুগ্ম-সাধারণ সম্পাদক",
  "কোষাধ্যক্ষ",
  "সাংগঠনিক সম্পাদক",
];

const COMMITTEE_HEAD_TITLES = [
  "সহ-সাংগঠনিক সম্পাদক",
  "সাহিত্য ও প্রকাশনা সম্পাদক",
  "প্রচার ও গণসংযোগ সম্পাদক",
  "শিক্ষা ও পাঠাগার সম্পাদক",
  "সাংস্কৃতিক সম্পাদক",
  "ক্রীড়া সম্পাদক",
  "দপ্তর সম্পাদক",
];

function normalizeBanglaTitle(s: string | null | undefined) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function pickSectionForPostTitle(postTitle: string | null | undefined): "core" | "heads" | "members" | "other" {
  const t = normalizeBanglaTitle(postTitle);
  if (!t) return "other";
  if (CORE_LEADERSHIP_TITLES.includes(t)) return "core";
  if (COMMITTEE_HEAD_TITLES.includes(t)) return "heads";
  if (/নির্বাহী\s*সদস্য/i.test(t) || /executive\s*member/i.test(t)) return "members";
  return "other";
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
  const [visibleCount, setVisibleCount] = useState(6);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  const [boardWrapH, setBoardWrapH] = useState<number | undefined>(undefined);
  const [boardW, setBoardW] = useState(COMMITTEE_DESIGN_W);

  // Measure outer container width vs design width → compute scale + wrapper height.
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
    let r1 = 0, r2 = 0;
    r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(update); });
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); ro.disconnect(); };
  }, [visibleCount]); // re-measure when card count changes

  const totalMembers = data.posts.reduce((n, p) => n + (p.members?.length || 0), 0);
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
  const restPairs = restMembersExceptPresident(data, presidentPick.member.id);
  const displayCount = showAll ? restPairs.length : visibleCount;

  const scaled = boardScale < 1;
  const isMobile = boardW < 540;
  // Always render 2-column mobile layout for other members.
  // The card contents are designed to fit (and for very narrow widths, they will truncate rather than collapsing to 1 column).
  const twoColMobile = isMobile;
  const mobileZoom = isMobile && boardW < MOBILE_REF_W ? boardW / MOBILE_REF_W : 1;

  const seeMoreButtons = (total: number) =>
    !showAll && (visibleCount < total || visibleCount > 6) ? (
      <div className="flex items-center justify-center gap-4 mt-4">
        {visibleCount < total && (
          <>
            <button type="button" onClick={() => setVisibleCount((prev) => prev + 6)}
              className="px-5 py-2 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
              See more ({total - visibleCount} remaining)
            </button>
            <button type="button" onClick={() => setVisibleCount(total)}
              className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
              See all
            </button>
          </>
        )}
        {visibleCount > 6 && (
          <button type="button" onClick={() => setVisibleCount(6)}
            className="px-5 py-2 rounded-full border border-muted-foreground/30 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors">
            Show less
          </button>
        )}
      </div>
    ) : null;

  const mobileSeeMore = seeMoreButtons(restPairs.length);

  // Group members into the 3 requested sections (hide any extra/unlisted posts).
  const grouped = restPairs
    .map((p, idx) => ({ ...p, serial: idx + 2, section: pickSectionForPostTitle(p.postTitle) as const }))
    .filter((p) => p.section !== "other");

  const coreLeadership = grouped.filter((p) => p.section === "core");
  const committeeHeads = grouped.filter((p) => p.section === "heads");
  const committeeMembers = grouped.filter((p) => p.section === "members");

  const visibleGrouped = showAll ? grouped : grouped.slice(0, displayCount);
  const visibleCore = visibleGrouped.filter((p) => p.section === "core");
  const visibleHeads = visibleGrouped.filter((p) => p.section === "heads");
  const visibleMembers = visibleGrouped.filter((p) => p.section === "members");

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
          /* ── MOBILE layout (<540 px): 3 sections + 2-col cards ── */
          <div
            className={twoColMobile ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}
            style={mobileZoom < 1 ? { zoom: mobileZoom } : undefined}
          >
            <div className={twoColMobile ? "col-span-2" : undefined}>
              <MobilePresidentCard member={presidentDb} roleLabel={presidentPick.postTitle} />
            </div>

            {/* Core Leadership Team */}
            {visibleCore.length > 0 ? (
              <>
                <div className={twoColMobile ? "col-span-2" : undefined}>
                  <h3 className="text-sm font-bold tracking-wide text-foreground/80 mt-1">Core Leadership Team</h3>
                </div>
                {visibleCore.map((item) => (
                  <MobileMemberCard
                    key={item.row.id}
                    member={committeeRowToDBMember(item.row)}
                    serial={item.serial}
                    postTitle={item.postTitle}
                  />
                ))}
              </>
            ) : null}

            {/* Committee Heads */}
            {visibleHeads.length > 0 ? (
              <>
                <div className={twoColMobile ? "col-span-2" : undefined}>
                  <h3 className="text-sm font-bold tracking-wide text-foreground/80 mt-2">Committee Heads</h3>
                </div>
                {visibleHeads.map((item) => (
                  <MobileMemberCard
                    key={item.row.id}
                    member={committeeRowToDBMember(item.row)}
                    serial={item.serial}
                    postTitle={item.postTitle}
                  />
                ))}
              </>
            ) : null}

            {/* Committee Members */}
            {visibleMembers.length > 0 ? (
              <>
                <div className={twoColMobile ? "col-span-2" : undefined}>
                  <h3 className="text-sm font-bold tracking-wide text-foreground/80 mt-2">Committee Members</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">নির্বাহী সদস্য</p>
                </div>
                {visibleMembers.map((item) => (
                  <MobileMemberCard
                    key={item.row.id}
                    member={committeeRowToDBMember(item.row)}
                    serial={item.serial}
                    postTitle={item.postTitle}
                  />
                ))}
              </>
            ) : null}

            {mobileSeeMore ? (
              <div className={twoColMobile ? "col-span-2" : undefined}>{mobileSeeMore}</div>
            ) : null}
            <div ref={innerRef} className="sr-only" />
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
              <div className="mx-auto flex w-full min-w-0 justify-center px-0">
                <PresidentHeroCard member={presidentDb} roleLabel={presidentPick.postTitle} />
              </div>
              {/* Core Leadership Team */}
              {visibleCore.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Core Leadership Team</h3>
                  </div>
                  <div
                    className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5"
                    style={scaled ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" } : undefined}
                  >
                    {visibleCore.map((item) => (
                      <div key={item.row.id} className="min-w-0">
                        <ExecutiveMemberCard
                          member={committeeRowToDBMember(item.row)}
                          serial={item.serial}
                          postTitle={item.postTitle}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Committee Heads */}
              {visibleHeads.length > 0 ? (
                <div className="space-y-4">
                  <div className="pt-2">
                    <h3 className="text-lg font-bold text-foreground">Committee Heads</h3>
                  </div>
                  <div
                    className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5"
                    style={scaled ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" } : undefined}
                  >
                    {visibleHeads.map((item) => (
                      <div key={item.row.id} className="min-w-0">
                        <ExecutiveMemberCard
                          member={committeeRowToDBMember(item.row)}
                          serial={item.serial}
                          postTitle={item.postTitle}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Committee Members */}
              {visibleMembers.length > 0 ? (
                <div className="space-y-4">
                  <div className="pt-2">
                    <h3 className="text-lg font-bold text-foreground">Committee Members</h3>
                    <p className="text-sm text-muted-foreground">নির্বাহী সদস্য</p>
                  </div>
                  <div
                    className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5"
                    style={scaled ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" } : undefined}
                  >
                    {visibleMembers.map((item) => (
                      <div key={item.row.id} className="min-w-0">
                        <ExecutiveMemberCard
                          member={committeeRowToDBMember(item.row)}
                          serial={item.serial}
                          postTitle={item.postTitle}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {!showAll && (visibleCount < restPairs.length || visibleCount > 6) && (
                <div className="flex items-center justify-center gap-4 mt-2">
                  {visibleCount < restPairs.length && (
                    <>
                      <button type="button" onClick={() => setVisibleCount((prev) => prev + 6)}
                        className="px-5 py-2 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
                        See more ({restPairs.length - visibleCount} remaining)
                      </button>
                      <button type="button" onClick={() => setVisibleCount(restPairs.length)}
                        className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
                        See all
                      </button>
                    </>
                  )}
                  {visibleCount > 6 && (
                    <button type="button" onClick={() => setVisibleCount(6)}
                      className="px-5 py-2 rounded-full border border-muted-foreground/30 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors">
                      Show less
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
