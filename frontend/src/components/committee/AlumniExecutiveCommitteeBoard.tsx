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
import { displayCollegeName } from "@/lib/collegeDisplay";
import { isIosSafariViewport } from "@/lib/iosSafari";
import { COMMITTEE_MOBILE_STACK_MAX, BREAKPOINT_MOBILE_MAX, layoutCanvasScale } from "@/lib/breakpoints";
import {
  fullInstitutionForCard,
  fullNameForCard,
  shortInstitutionForCard,
  shortNameForCard,
} from "@/components/committee/committeeCardDisplay";
import {
  useAdaptiveHeadingFitLine,
  useAdaptiveHeadingFitLineEm,
  useAdaptiveInlineFitLine,
  useAdaptiveInstitutionBreakValue,
} from "@/components/committee/committeeAdaptiveCardText";
import {
  FIT_WIDTH_SLOP_PX,
  fitLargestFontSingleLine,
  setOverflowSingleLineFit,
} from "@/components/committee/committeeTextFit";
import { API_BASE_URL } from "@/api-production/api.js";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";
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
  /** Optional shorter label for cards when full name is too long */
  name_short?: string | null;
  designation: string;
  category: string;
  batch: string | null;
  alumni_id: string | null;
  phone: string | null;
  email: string | null;
  institution: string | null;
  /** Optional shorter label for cards when full university name is too long */
  institution_short?: string | null;
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

function resolveCommitteePhotoUrl(url: string | null | undefined): string | null {
  const raw = String(url ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, "https://");
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

function CommitteePhoto({
  photoUrl,
  name,
  imgClassName,
  cameraClassName,
  primary,
  primaryTint,
}: {
  photoUrl: string | null | undefined;
  name: string;
  imgClassName: string;
  cameraClassName: string;
  primary: string;
  primaryTint: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = resolveCommitteePhotoUrl(photoUrl);
  if (!src || broken) {
    return (
      <div
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${primaryTint} 0%, transparent 65%)` }}
      >
        <Camera className={cameraClassName} style={{ color: primary, opacity: 0.6 }} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={imgClassName}
      style={{ filter: "none" }}
      onError={() => setBroken(true)}
    />
  );
}

export function committeeRowToDBMember(m: CommitteeMemberRow): DBMember {
  return {
    id: m.id,
    name: m.name,
    name_short: m.name_short ?? null,
    designation: m.designation,
    category: m.category || "executive",
    batch: m.batch,
    alumni_id: m.alumni_id ?? null,
    phone: m.phone ?? null,
    email: m.email ?? null,
    institution: m.institution,
    institution_short: m.institution_short ?? null,
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

/** Executive member cards (non-president): show up to this many words (matches admin max). */
export const EXECUTIVE_WISHING_DISPLAY_WORDS = 50;

/** Light mint box + “Wishing you” + normal weight (all committee sections use the same look). */
const WISHING_BOX_STYLE = {
  backgroundColor: "#A6D9C7",
  borderColor: "rgba(6, 88, 76, 0.35)",
} as const;

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
    setOverflowSingleLineFit(el);

    const px = fitLargestFontSingleLine(el, minPx, maxPx);
    el.style.fontSize = `${px}px`;
    if (el.scrollWidth > el.clientWidth + FIT_WIDTH_SLOP_PX) {
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

/** Single-line fit for generic inline text; `maxEm`/`minEm` are relative to `[data-committee-mobile-card]` font size. */
function useFitSingleLineInlineText(text: string, maxEm: number, minEm: number): RefObject<HTMLSpanElement | null> {
  const elRef = useRef<HTMLSpanElement | null>(null);

  const fit = useCallback(() => {
    const el = elRef.current;
    if (!el) return;

    const root = el.closest("[data-committee-mobile-card]") as HTMLElement | null;
    const basePx = root ? parseFloat(getComputedStyle(root).fontSize) || 16 : 16;
    const maxPx = maxEm * basePx;
    const minPx = minEm * basePx;

    el.style.whiteSpace = "nowrap";
    el.style.textOverflow = "";
    setOverflowSingleLineFit(el);

    const px = fitLargestFontSingleLine(el, minPx, maxPx);
    el.style.fontSize = `${px}px`;
    el.style.lineHeight = "1.3";
  }, [text, maxEm, minEm]);

  useLayoutEffect(() => {
    const run = () => requestAnimationFrame(fit);
    run();
    const el = elRef.current;
    if (!el) return;
    const ro = new ResizeObserver(run);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    const root = el.closest("[data-committee-mobile-card]") as HTMLElement | null;
    if (root) ro.observe(root);
    return () => ro.disconnect();
  }, [fit]);

  return elRef;
}

/** Single-line fit for member name (`h3`); `maxEm`/`minEm` relative to `[data-committee-mobile-card]`. */
function useFitSingleLineHeadingText(text: string, maxEm: number, minEm: number): RefObject<HTMLHeadingElement | null> {
  const elRef = useRef<HTMLHeadingElement | null>(null);

  const fit = useCallback(() => {
    const el = elRef.current;
    if (!el) return;

    const root = el.closest("[data-committee-mobile-card]") as HTMLElement | null;
    const basePx = root ? parseFloat(getComputedStyle(root).fontSize) || 16 : 16;
    const maxPx = maxEm * basePx;
    const minPx = minEm * basePx;

    el.style.whiteSpace = "nowrap";
    el.style.textOverflow = "";
    setOverflowSingleLineFit(el);

    const px = fitLargestFontSingleLine(el, minPx, maxPx);
    el.style.fontSize = `${px}px`;
    el.style.lineHeight = "1.25";
  }, [text, maxEm, minEm]);

  useLayoutEffect(() => {
    const run = () => requestAnimationFrame(fit);
    run();
    const el = elRef.current;
    if (!el) return;
    const ro = new ResizeObserver(run);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    const root = el.closest("[data-committee-mobile-card]") as HTMLElement | null;
    if (root) ro.observe(root);
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

  const fallbackCollege = displayCollegeName(member.college_name);

  const href = `/committee/member/${member.id}`;

  const { ref: presidentNameRef, text: presidentNameDisplay } = useAdaptiveHeadingFitLine(
    fullNameForCard(member),
    shortNameForCard(member),
    24,
    15
  );
  const { ref: presidentUniRef, text: presidentUniDisplay } = useAdaptiveInstitutionBreakValue(
    fullInstitutionForCard(member),
    shortInstitutionForCard(member)
  );

  return (
    <Link
      to={href}
      aria-label={`Open profile: ${member.name}`}
      className="block max-w-full"
      onClick={() => saveNavScrollRestore()}
    >
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
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 fs-caption font-bold tracking-wide"
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
              className="inline-flex items-center rounded-full border px-2 py-0.5 fs-caption font-bold tracking-wide"
              style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
            >
              #01
            </div>
          </div>

          <h3
            ref={presidentNameRef}
            className="block w-full min-w-0 whitespace-nowrap font-bold leading-tight text-foreground"
            title={member.name}
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontWeight: 900,
              letterSpacing: "0.03em",
              color: "#FFE566",
            }}
          >
            {presidentNameDisplay}
          </h3>

          <div
            className="inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
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
            className="mt-0.5 grid min-w-0 w-full max-w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1 gap-y-0 text-sm"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
          >
            <div className="flex w-auto min-w-0 shrink-0 flex-col gap-y-0.5">
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <Hash className="mt-0.5 h-[13px] w-[13px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>Alumni Id: </span>
                  {member.alumni_id ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <GraduationCap className="mt-0.5 h-[13px] w-[13px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>Batch: </span>
                  {member.batch ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <Briefcase className="mt-0.5 h-[13px] w-[13px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>Profession: </span>
                  {member.profession ?? "N/A"}
                </span>
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-y-0.5">
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words text-xs leading-snug">
                <GraduationCap className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>College: </span>
                  {fallbackCollege}
                </span>
              </span>
              <span className="inline-flex min-w-0 max-w-full items-start gap-1 break-words">
                <Building2 className="mt-0.5 h-[13px] w-[13px] shrink-0" style={{ color: primary }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: primary }}>University: </span>
                  <span ref={presidentUniRef} className="break-words">
                    {presidentUniDisplay}
                  </span>
                </span>
              </span>
            </div>
          </div>

          {member.wishing_message ? (
            <div
              className="committee-member-wishing-box mt-0.5 w-full max-w-full rounded-md border p-2"
              style={WISHING_BOX_STYLE}
            >
              <p className="fs-caption font-semibold text-black">
                Wishing you
              </p>
              <div
                className="fs-caption mt-0.5 max-h-[7.92rem] overflow-y-auto overscroll-contain pr-0.5 leading-[1.4] [scrollbar-gutter:stable] text-black"
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

            <CommitteePhoto
              photoUrl={member.photo_url}
              name={member.name}
              imgClassName="absolute inset-0 z-10 h-full w-full object-cover object-center"
              cameraClassName="h-[34px] w-[34px]"
              primary={primary}
              primaryTint={primaryTint}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[12] flex justify-center px-2">
              <span
                className="inline-flex rounded-full border px-4 py-1.5 fs-button-text font-extrabold tracking-[0.16em]"
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
  const { ref: nameRef, text: nameDisplay } = useAdaptiveHeadingFitLine(
    fullNameForCard(member),
    shortNameForCard(member),
    governingBody ? 22 : 20,
    governingBody ? 16 : 14
  );
  const { ref: instRef, text: instDisplay } = useAdaptiveInstitutionBreakValue(
    fullInstitutionForCard(member),
    shortInstitutionForCard(member)
  );
  const wishingYouText = member.wishing_message
    ? truncateToWordCount(member.wishing_message, EXECUTIVE_WISHING_DISPLAY_WORDS)
    : "";
  const role = postTitle || member.designation;
  const primary = "hsl(var(--primary))";
  const primaryTint = "hsl(var(--primary) / 0.12)";
  const primaryBorder = "hsl(var(--primary) / 0.25)";
  const cardBg = "hsl(var(--card))";
  const badgeText = `#${String(serial).padStart(2, "0")}`;

  const fallbackCollege = displayCollegeName(member.college_name);

  const href = `/committee/member/${member.id}`;
  const photoSize = governingBody ? 180 : 151;
  const cameraClassName = governingBody ? "h-[42px] w-[42px]" : "h-[34px] w-[34px]";

  return (
    <Link
      to={href}
      aria-label={`Open profile: ${member.name}`}
      className="block w-full"
      onClick={() => saveNavScrollRestore()}
    >
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
          <div className={cn("flex items-stretch", governingBody ? "gap-3.5" : "gap-2.5")}>
            <div
              className="relative shrink-0 overflow-hidden rounded-md border border-border/45"
              style={{ width: photoSize, minHeight: photoSize }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, transparent 60%)`,
                }}
              />

              <CommitteePhoto
                photoUrl={member.photo_url}
                name={member.name}
                imgClassName="absolute inset-0 z-10 h-full w-full object-cover object-center"
                cameraClassName={cameraClassName}
                primary={primary}
                primaryTint={primaryTint}
              />
            </div>

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col justify-start gap-1.5 pt-0.5 text-left",
                governingBody ? "pl-2.5" : "pl-2"
              )}
            >
              <div
                className="inline-flex w-fit items-center rounded-full border border-primary/20 px-2 py-0.5 fs-caption font-bold tracking-wide"
                style={{ backgroundColor: primaryTint, color: primary }}
              >
                {badgeText}
              </div>

              <h3
                ref={nameRef}
                title={member.name}
                className="block w-full min-w-0 whitespace-nowrap font-bold leading-tight text-foreground"
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                  color: "#FFB347",
                }}
              >
                {nameDisplay}
              </h3>

              <div
                className="inline-flex w-fit max-w-full items-center rounded-full border border-primary/20 px-2.5 py-0.5 text-xs font-semibold"
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
                className="mt-1 flex flex-col gap-y-0.5 text-xs"
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
                        <span ref={instRef} className="break-words">
                          {instDisplay}
                        </span>
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
              className="mt-2 flex flex-col gap-y-1 text-xs"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
            >
              <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 break-words">
                <Building2 className="mt-0.5 h-[12.9px] w-[12.9px] shrink-0" style={{ color: "#FFFFFF" }} />
                <span className="min-w-0">
                  <span className="font-bold" style={{ color: "#FFFFFF" }}>University: </span>
                  <span ref={instRef} className="break-words">
                    {instDisplay}
                  </span>
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
            <div className="committee-member-wishing-box w-full rounded-md border p-2" style={WISHING_BOX_STYLE}>
              <p className="fs-caption font-semibold" style={{ color: "#000000" }}>
                Wishing you
              </p>
              <p
                className="mt-0.5 max-h-[10.5rem] overflow-hidden fs-caption leading-[1.4] break-words text-muted-foreground font-normal"
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
   MOBILE CARDS — stacked below COMMITTEE_MOBILE_STACK_MAX (680px), fluid em scale
   ───────────────────────────────────────────────────────────────────────────── */

/** Member `MobileMemberCard` uses `photoWidth * 0.093` where `photoWidth` is the left column (~0.42fr). President uses full-bleed photo = card width — slightly higher scale + floor so body text stays readable on phones. */
const MOBILE_PRESIDENT_PHOTO_FONT_SCALE =
  ((0.093 * 0.42) / (1 + 0.093 * 0.42 * 1.75)) * 1.18;
const MOBILE_PRESIDENT_FONT_MIN_PX = 12.5;
const MOBILE_PRESIDENT_FONT_MAX_PX = 17.5;

export function MobilePresidentCard({
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
  const fullUniversityLine = `University: ${fullInstitutionForCard(member)}`;
  const shortUni = shortInstitutionForCard(member);
  const shortUniversityLine = shortUni ? `University: ${shortUni}` : fullUniversityLine;

  const { ref: nameHeadingRef, text: presidentNameDisplay } = useAdaptiveHeadingFitLineEm(
    fullNameForCard(member),
    shortNameForCard(member),
    1.52,
    0.85
  );
  const { ref: universityRowRef, text: universityLineDisplay } = useAdaptiveInlineFitLine(
    fullUniversityLine,
    shortUniversityLine,
    0.88,
    0.56
  );
  /** College line: previous em range (smaller than name/univ) so full “College: …” fits on one line when possible. */
  const collegeDisplay = displayCollegeName(member.college_name);
  const collegeRowRef = useFitSingleLineInlineText(`College: ${collegeDisplay}`, 0.76, 0.5);
  /** Alumni Id only: slightly smaller than Batch/Profession so a clear gap shows between columns on narrow screens. */
  const alumniRowRef = useFitSingleLineInlineText(`Alumni Id: ${member.alumni_id ?? "N/A"}`, 0.68, 0.48);
  const batchRowRef = useFitSingleLineInlineText(`Batch: ${member.batch ?? "N/A"}`, 0.8, 0.54);
  const professionRowRef = useFitSingleLineInlineText(`Profession: ${member.profession ?? "N/A"}`, 0.78, 0.52);

  const photoBoxRef = useRef<HTMLDivElement | null>(null);
  const [photoDrivenFontPx, setPhotoDrivenFontPx] = useState<number | null>(null);

  const href = `/committee/member/${member.id}`;

  /** Same idea as MobileMemberCard: one base size from photo width — slightly higher clamp when root font not yet measured. */
  const mobilePresidentRoot: CSSProperties = {
    fontSize: photoDrivenFontPx
      ? `${photoDrivenFontPx}px`
      : `clamp(${MOBILE_PRESIDENT_FONT_MIN_PX}px, 0.5rem + 1.85vw, ${MOBILE_PRESIDENT_FONT_MAX_PX}px)`,
  };

  useLayoutEffect(() => {
    const el = photoBoxRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (!w) return;
      const next = Math.max(
        MOBILE_PRESIDENT_FONT_MIN_PX,
        Math.min(MOBILE_PRESIDENT_FONT_MAX_PX, w * MOBILE_PRESIDENT_PHOTO_FONT_SCALE)
      );
      setPhotoDrivenFontPx((prev) => (prev !== null && Math.abs(prev - next) < 0.05 ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Link
      to={href}
      aria-label={`Open profile: ${member.name}`}
      className="block w-full min-w-0"
      onClick={() => saveNavScrollRestore()}
    >
      <motion.div
        data-committee-mobile-card
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="cursor-pointer overflow-hidden rounded-[13px] border border-border/55 shadow-card pb-[0.35em]"
        style={{
          background: "linear-gradient(135deg, #0a6f62 0%, #075f54 48%, #045248 100%)",
          ...mobilePresidentRoot,
        }}
      >
        {/* Photo — width drives card `em` scale so image, badges, and info scale together */}
        <div
          ref={photoBoxRef}
          className="relative w-full overflow-hidden bg-muted"
          style={{ aspectRatio: "1/1" }}
        >
          <CommitteePhoto
            photoUrl={member.photo_url}
            name={member.name}
            imgClassName="absolute inset-0 h-full w-full object-cover object-center"
            cameraClassName="h-[2.75em] w-[2.75em]"
            primary={primary}
            primaryTint={primaryTint}
          />
          {/* Mobile president: KING badge on image; hide serial number */}
          <div className="absolute left-[0.75em] top-[0.75em] z-[7]">
            <span
              className="inline-flex items-center gap-[0.25em] rounded-full border px-[0.55em] py-[0.2em] fs-caption font-bold leading-none"
              style={{
                backgroundColor: primaryTint,
                borderColor: primaryBorder,
                color: presidentBadgeYellow,
              }}
            >
              <Crown className="h-[1em] w-[1em] shrink-0" /> KING
            </span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[0.5em] z-[8] flex justify-center px-[0.5em]">
            <span
              className="inline-flex rounded-full border px-[1em] py-[0.45em] fs-ui font-extrabold tracking-[0.12em]"
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

        {/* Info — most rows single-line; university may wrap for readability */}
        <div className="flex min-w-0 flex-col gap-[0.75em] p-[1em]">
          <h3
            ref={nameHeadingRef}
            title={member.name}
            className="block w-full min-w-0 whitespace-nowrap font-bold"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontWeight: 900,
              letterSpacing: "0.02em",
              color: "#FFE566",
            }}
          >
            {presidentNameDisplay}
          </h3>

          <span
            className="inline-flex w-fit max-w-full min-w-0 shrink-0 self-start items-center rounded-full border px-[0.65em] py-[0.25em] fs-ui font-semibold leading-snug"
            style={{
              backgroundColor: "rgba(251, 146, 60, 0.25)",
              borderColor: "rgba(253, 224, 71, 0.65)",
              color: "#FFF7D6",
              textShadow: "0 1px 4px rgba(0,0,0,0.55)",
            }}
          >
            {roleLine}
          </span>

          <div
            className="grid w-full min-w-0 grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] items-start gap-x-[min(0.55em,3.5vw)] gap-y-0 fs-ui leading-[1.35]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
          >
            <div className="flex min-w-0 flex-col gap-y-[0.3em] pr-[0.25em]">
              <span className="inline-flex min-w-0 items-center gap-[0.28em] whitespace-nowrap">
                <Hash className="h-[0.88em] w-[0.88em] shrink-0" style={{ color: primary }} />
                <span ref={alumniRowRef} className="block min-w-0 flex-1 whitespace-nowrap">
                  <span className="font-semibold" style={{ color: primary }}>Alumni Id: </span>
                  {member.alumni_id ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-[0.3em] whitespace-nowrap">
                <GraduationCap className="h-[0.95em] w-[0.95em] shrink-0" style={{ color: primary }} />
                <span ref={batchRowRef} className="block min-w-0 flex-1 whitespace-nowrap">
                  <span className="font-semibold" style={{ color: primary }}>Batch: </span>
                  {member.batch ?? "N/A"}
                </span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-[0.3em] whitespace-nowrap">
                <Briefcase className="h-[0.95em] w-[0.95em] shrink-0" style={{ color: primary }} />
                <span ref={professionRowRef} className="block min-w-0 flex-1 whitespace-nowrap">
                  <span className="font-semibold" style={{ color: primary }}>Profession: </span>
                  {member.profession ?? "N/A"}
                </span>
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-y-[0.3em] pr-[0.35em]">
              <span className="inline-flex min-w-0 max-w-full items-center gap-[0.3em] whitespace-nowrap leading-[1.35]">
                <GraduationCap className="h-[0.95em] w-[0.95em] shrink-0" style={{ color: primary }} />
                <span ref={collegeRowRef} className="block min-w-0 flex-1 whitespace-nowrap">
                  <span className="font-semibold" style={{ color: primary }}>College: </span>
                  {collegeDisplay}
                </span>
              </span>
              <div className="flex min-w-0 items-start gap-[0.3em] leading-[1.3]">
                <Building2 className="mt-[0.12em] h-[0.95em] w-[0.95em] shrink-0" style={{ color: primary }} />
                <p className="m-0 min-w-0 flex-1 min-w-0">
                  <span ref={universityRowRef} className="block break-words [overflow-wrap:anywhere] font-semibold" style={{ color: primary }}>
                    {universityLineDisplay}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {member.wishing_message && (
            <div className="rounded-md border px-[0.65em] pb-[0.65em] pt-[0.55em]" style={WISHING_BOX_STYLE}>
              <p className="fs-caption font-semibold leading-snug" style={{ color: "#000000" }}>
                Wishing you
              </p>
              <p className="mt-[0.35em] break-words fs-ui font-normal italic leading-relaxed text-justify text-black [overflow-wrap:anywhere] hyphens-auto pb-px">
                &ldquo;{member.wishing_message}&rdquo;
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
  const fullUniversityLine = `University: ${fullInstitutionForCard(member)}`;
  const shortUni = shortInstitutionForCard(member);
  const shortUniversityLine = shortUni ? `University: ${shortUni}` : fullUniversityLine;
  const wishingText = member.wishing_message
    ? truncateToWordCount(member.wishing_message, EXECUTIVE_WISHING_DISPLAY_WORDS)
    : "";
  const alumniRowRef = useFitSingleLineInlineText(`Alumni Id: ${member.alumni_id ?? "N/A"}`, 0.9, 0.56);
  const batchRowRef = useFitSingleLineInlineText(`Batch: ${member.batch ?? "N/A"}`, 0.9, 0.56);
  const professionRowRef = useFitSingleLineInlineText(`Profession: ${member.profession ?? "N/A"}`, 0.88, 0.54);
  const { ref: universityRowRef, text: universityLineDisplay } = useAdaptiveInlineFitLine(
    fullUniversityLine,
    shortUniversityLine,
    0.82,
    0.5
  );
  const collegeDisplayMember = displayCollegeName(member.college_name);
  const collegeRowRef = useFitSingleLineInlineText(`College: ${collegeDisplayMember}`, 0.82, 0.5);
  const { ref: nameHeadingRef, text: memberNameDisplay } = useAdaptiveHeadingFitLineEm(
    fullNameForCard(member),
    shortNameForCard(member),
    1.45,
    0.78
  );
  const photoBoxRef = useRef<HTMLDivElement | null>(null);
  const [photoDrivenFontPx, setPhotoDrivenFontPx] = useState<number | null>(null);

  const href = `/committee/member/${member.id}`;

  /** Fluid root (≤680px band): scales with viewport; `em` children + photo column stay proportional. */
  const mobileCardUnit: CSSProperties = {
    fontSize: photoDrivenFontPx ? `${photoDrivenFontPx}px` : "clamp(11px, 0.5rem + 1.65vw, 16px)",
  };

  useLayoutEffect(() => {
    const el = photoBoxRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (!w) return;
      // Tie full card typography to photo size so both scale together.
      const next = Math.max(10.5, Math.min(16, w * 0.093));
      setPhotoDrivenFontPx((prev) => (prev !== null && Math.abs(prev - next) < 0.05 ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Link
      to={href}
      aria-label={`Open profile: ${member.name}`}
      className="block w-full"
      onClick={() => saveNavScrollRestore()}
    >
      <motion.div
        data-committee-mobile-card
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[0.85em] border border-border/55 shadow-card pb-[0.35em]"
        style={{
          background: "linear-gradient(135deg, #0a6f62 0%, #075f54 48%, #045248 100%)",
          ...mobileCardUnit,
        }}
      >
        {/* Photo-led row: image covers the left cell (matches text column height; no letterboxing). */}
        <div className="grid min-w-0 grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] items-stretch gap-[0.45em] p-[0.65em] max-[360px]:grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)]">
          <div
            ref={photoBoxRef}
            className="relative min-h-0 w-full min-w-0 overflow-hidden rounded-[0.35em] border border-border/45"
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, transparent 60%)" }} />
            <CommitteePhoto
              photoUrl={member.photo_url}
              name={member.name}
              imgClassName="absolute inset-0 z-10 h-full w-full object-cover object-center"
              cameraClassName="h-[2.25em] w-[2.25em]"
              primary={primary}
              primaryTint={primaryTint}
            />
          </div>

          <div className="flex min-h-full min-w-0 flex-col justify-between space-y-[0.2em] pr-[0.45em]">
            <span
              className="inline-flex w-fit items-center rounded-full border px-[0.45em] py-[0.15em] fs-caption font-bold leading-none"
              style={{ backgroundColor: primaryTint, borderColor: primaryBorder, color: primary }}
            >
              {badgeText}
            </span>

            <h3
              ref={nameHeadingRef}
              title={member.name}
              className="block w-full min-w-0 whitespace-nowrap font-bold"
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontWeight: 900,
                letterSpacing: "0.02em",
                color: "#FFB347",
              }}
            >
              {memberNameDisplay}
            </h3>

            <span
              className="inline-flex w-fit max-w-full min-w-0 shrink-0 self-start items-center rounded-full border px-[0.5em] py-[0.15em] fs-ui font-semibold leading-snug"
              style={{
                backgroundColor: "rgba(251, 146, 60, 0.25)",
                borderColor: "rgba(253, 224, 71, 0.65)",
                color: "#FFF7D6",
                textShadow: "0 1px 4px rgba(0,0,0,0.55)",
              }}
            >
              {role}
            </span>

            <div
              className="mt-[0.15em] flex min-w-0 flex-col gap-y-[0.16em] text-xs leading-[1.3]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#FFFFFF" }}
            >
              <span className="inline-flex min-w-0 items-center gap-[0.35em] whitespace-nowrap">
                <Hash className="h-[1em] w-[1em] shrink-0" style={{ color: "#FFFFFF" }} />
                <span ref={alumniRowRef} className="block min-w-0 flex-1 whitespace-nowrap"><span className="font-semibold">Alumni Id: </span>{member.alumni_id ?? "N/A"}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-[0.35em] whitespace-nowrap">
                <GraduationCap className="h-[1em] w-[1em] shrink-0" style={{ color: "#FFFFFF" }} />
                <span ref={batchRowRef} className="block min-w-0 flex-1 whitespace-nowrap"><span className="font-semibold">Batch: </span>{member.batch ?? "N/A"}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-[0.35em] whitespace-nowrap">
                <Briefcase className="h-[1em] w-[1em] shrink-0" style={{ color: "#FFFFFF" }} />
                <span ref={professionRowRef} className="block min-w-0 flex-1 whitespace-nowrap"><span className="font-semibold">Profession: </span>{member.profession ?? "N/A"}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-[0.3em] whitespace-nowrap fs-ui leading-[1.25]">
                <Building2 className="h-[0.92em] w-[0.92em] shrink-0" style={{ color: "#FFFFFF" }} />
                <span ref={universityRowRef} className="block min-w-0 flex-1 whitespace-nowrap font-semibold">
                  {universityLineDisplay}
                </span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-[0.3em] whitespace-nowrap fs-ui leading-[1.25]">
                <GraduationCap className="h-[0.92em] w-[0.92em] shrink-0" style={{ color: "#FFFFFF" }} />
                <span ref={collegeRowRef} className="block min-w-0 flex-1 whitespace-nowrap"><span className="font-semibold">College: </span>{collegeDisplayMember}</span>
              </span>
            </div>
          </div>
        </div>

      {wishingText && (
        <div
          className="mx-[0.55em] mb-[0.5em] mt-0 min-w-0 rounded-[0.35em] border px-[0.55em] pb-[0.65em] pt-[0.55em]"
          style={WISHING_BOX_STYLE}
        >
          <p className="fs-caption font-semibold leading-snug" style={{ color: "#000000" }}>
            Wishing you
          </p>
          <p
            className="mt-[0.35em] break-words fs-ui font-normal italic leading-relaxed text-muted-foreground [overflow-wrap:anywhere] pb-px"
            style={{ color: "#000000" }}
          >
            &ldquo;{wishingText}&rdquo;
          </p>
        </div>
      )}

      <div className="pb-[0.6em]" />
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
      <p className="mb-2 fs-eyebrow font-semibold tracking-wider font-outfit-section" style={{ color: "var(--committee-intro-eyebrow)" }}>
        HPC Alumni Executive Committee
      </p>
      <h2 className="fs-title font-bold tracking-tight text-foreground font-outfit-section">
        Alumni Executive Committee 2025–2027
      </h2>

      <p className="mt-3 w-full max-w-none fs-body text-muted-foreground leading-relaxed text-justify hyphens-auto">
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
const MOBILE_REF_W = BREAKPOINT_MOBILE_MAX; // mobile band top — cards zoom below this

type CollapsibleSection = Exclude<BoardSectionKey, "governing_body">;
const DEFAULT_SECTION_VISIBLE = 3;
const SECTION_SEE_MORE_STEP = 6;

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
  // Keep sections visible by default so uploaded members appear immediately on all screens.
  const [openExecutive, setOpenExecutive] = useState(true);
  const [openHeads, setOpenHeads] = useState(true);
  const [openMembers, setOpenMembers] = useState(true);
  const [visibleBySection, setVisibleBySection] = useState<Record<CollapsibleSection, number>>({
    executive_committee: DEFAULT_SECTION_VISIBLE,
    committee_heads: DEFAULT_SECTION_VISIBLE,
    committee_members: DEFAULT_SECTION_VISIBLE,
  });

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
      const s = layoutCanvasScale(w, COMMITTEE_DESIGN_W);
      setBoardScale(s);
      setBoardWrapH(Math.round(inner.offsetHeight * s));
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
  }, [openExecutive, openHeads, openMembers, visibleBySection, showAll, totalMembers]);

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

  const visibleCountForSection = (sec: CollapsibleSection, total: number) => {
    if (showAll) return total;
    const raw = visibleBySection[sec] ?? DEFAULT_SECTION_VISIBLE;
    return Math.min(Math.max(raw, DEFAULT_SECTION_VISIBLE), total);
  };

  const showMoreForSection = (sec: CollapsibleSection) => {
    setVisibleBySection((prev) => ({
      ...prev,
      [sec]: (prev[sec] ?? DEFAULT_SECTION_VISIBLE) + SECTION_SEE_MORE_STEP,
    }));
  };

  const showAllForSection = (sec: CollapsibleSection, total: number) => {
    setVisibleBySection((prev) => ({
      ...prev,
      [sec]: total,
    }));
  };

  const resetSectionVisible = (sec: CollapsibleSection) => {
    setVisibleBySection((prev) => ({
      ...prev,
      [sec]: DEFAULT_SECTION_VISIBLE,
    }));
  };

  const isMobile = boardW < COMMITTEE_MOBILE_STACK_MAX;
  // Mobile readability: always render single-column cards.
  const twoColMobile = false;
  // Do NOT zoom-shrink mobile cards; it makes text unreadable.
  const mobileGridZoomStyle = undefined;

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
              <span className="rounded-full bg-muted/90 px-2.5 py-0.5 fs-caption font-semibold tabular-nums text-muted-foreground">
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
          <h3 className="mt-1">
            <span className="committee-governing-heading text-balance">{meta.title}</span>
          </h3>
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
    const meta = BOARD_SECTION_LABELS[sec];
    const items = sectionItemsFor(withSerial, sec);
    const isOpen = sectionIsOpen(sec);
    const visible = visibleCountForSection(sec, items.length);
    const visibleItems = items.slice(0, visible);
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
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-primary",
                  isOpen ? "rotate-180" : "rotate-0"
                )}
              />
            </div>
          </button>
        </div>
        {isOpen
          ? visibleItems.map((item) => {
              const forceSingleColumnOnMobile = sec === "committee_members" && twoColMobile;
              const card = (
                <MobileMemberCard
                  key={item.row.id}
                  member={committeeRowToDBMember(item.row)}
                  serial={item.serial}
                  postTitle={item.postTitle}
                />
              );
              return forceSingleColumnOnMobile ? (
                <div key={`single-${item.row.id}`} className="col-span-2">
                  {card}
                </div>
              ) : (
                card
              );
            })
          : null}
        {!showAll && isOpen && (visible < items.length || visible > DEFAULT_SECTION_VISIBLE) ? (
          <div className={cn(twoColMobile && "col-span-2", "flex items-center justify-center gap-3 pb-1 pt-1")}>
            {visible < items.length ? (
              <>
                <button
                  type="button"
                  onClick={() => showMoreForSection(sec)}
                  className="rounded-full border border-primary/40 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  See More
                </button>
                <button
                  type="button"
                  onClick={() => showAllForSection(sec, items.length)}
                  className="text-xs font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  See All
                </button>
              </>
            ) : null}
            {visible > DEFAULT_SECTION_VISIBLE ? (
              <button
                type="button"
                onClick={() => resetSectionVisible(sec)}
                className="rounded-full border border-muted-foreground/30 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                See Less
              </button>
            ) : null}
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
          <h3>
            <span className="committee-governing-heading text-balance">{meta.title}</span>
          </h3>
        </div>
        {showPresidentHere ? (
          <div className="mx-auto flex w-full min-w-0 justify-center px-0">
            <PresidentHeroCard member={presidentDb} roleLabel={presidentPick.postTitle} />
          </div>
        ) : null}
        {items.length > 0 ? (
          <div
            className="grid w-full min-w-0 gap-5"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" }}
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
    const visible = visibleCountForSection(sec, items.length);
    const visibleItems = items.slice(0, visible);
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
        {visibleItems.length > 0 ? (
          <div
            className="grid w-full min-w-0 gap-5"
            style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" }}
          >
            {visibleItems.map((item) => (
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
        {!showAll && (visible < items.length || visible > DEFAULT_SECTION_VISIBLE) ? (
          <div className="flex items-center justify-center gap-4 pt-1">
            {visible < items.length ? (
              <>
                <button
                  type="button"
                  onClick={() => showMoreForSection(sec)}
                  className="rounded-full border border-primary/40 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  See More
                </button>
                <button
                  type="button"
                  onClick={() => showAllForSection(sec, items.length)}
                  className="text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  See All
                </button>
              </>
            ) : null}
            {visible > DEFAULT_SECTION_VISIBLE ? (
              <button
                type="button"
                onClick={() => resetSectionVisible(sec)}
                className="rounded-full border border-muted-foreground/30 px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                See Less
              </button>
            ) : null}
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
          /* ── MOBILE layout (<680px): stacked proportional cards ── */
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
          /* ── TABLET / DESKTOP layout: transform-scale canvas (≥ 631 px), scales up on 1440+ like PC ratios ── */
          <div className="relative overflow-hidden" style={boardWrapH ? { height: boardWrapH } : undefined}>
            <div
              ref={innerRef}
              className="flex flex-col origin-top-left"
              style={{
                width: `${COMMITTEE_DESIGN_W}px`,
                transform: `scale(${boardScale})`,
                gap: "40px",
              }}
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
