import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, type CSSProperties } from "react";
import { Award, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { BANNER_DEFAULT_PHOTO_TAGLINE } from "@/constants/bannerCopy";
import { API_BASE_URL } from "@/api-production/api.js";
import { ACHIEVEMENT_BANNER_CROP_ASPECT } from "@/lib/achievementCrop";
import hpcLogo from "@/assets/hpc-logo.png";

/** Five-point star (sketchy celebration style), viewBox 0 0 24 24 */
const LOGO_CELEBRATION_STAR_PATH =
  "M12 1.6 15.1 8.1 22.2 9.1 17.1 14 18.3 21.1 12 17.7 5.7 21.1 6.9 14 1.8 9.1 8.9 8.1z";

type LogoCelebrationHue = "gold" | "white" | "primary";
type LogoCelebrationKind = "star-fill" | "star-outline" | "dot" | "spark";

function logoCelebrationPaint(h: LogoCelebrationHue): { fill: string; stroke: string } {
  if (h === "gold")
    return { fill: "rgba(251, 191, 36, 0.92)", stroke: "rgba(251, 191, 36, 0.88)" };
  if (h === "white")
    return { fill: "rgba(255, 255, 255, 0.9)", stroke: "rgba(255, 255, 255, 0.82)" };
  return { fill: "hsl(var(--primary) / 0.9)", stroke: "hsl(var(--primary) / 0.85)" };
}

interface LogoCelebrationSpec {
  kind: LogoCelebrationKind;
  /** Degrees: 0 = up, clockwise */
  angle: number;
  dist: number;
  delay: number;
  size: number;
  dur: number;
  endScale: number;
  endRot: number;
  hue: LogoCelebrationHue;
}

/** Organic mix: solid stars, outline stars, dots, curved sparks — denser near center in angle spread */
const LOGO_CELEBRATION_SPECS: LogoCelebrationSpec[] = [
  { kind: "star-fill", angle: -6, dist: 30, delay: 0, size: 10, dur: 1.52, endScale: 0.4, endRot: 108, hue: "gold" },
  { kind: "spark", angle: 14, dist: 19, delay: 0.04, size: 4, dur: 1.05, endScale: 0.82, endRot: -14, hue: "white" },
  { kind: "dot", angle: 32, dist: 21, delay: 0.1, size: 5, dur: 1.36, endScale: 0.28, endRot: 0, hue: "gold" },
  { kind: "star-outline", angle: 51, dist: 35, delay: 0.02, size: 12, dur: 1.58, endScale: 0.46, endRot: -88, hue: "white" },
  { kind: "star-fill", angle: 69, dist: 25, delay: 0.16, size: 8, dur: 1.44, endScale: 0.36, endRot: 156, hue: "primary" },
  { kind: "dot", angle: 86, dist: 18, delay: 0.12, size: 4, dur: 1.3, endScale: 0.22, endRot: 0, hue: "white" },
  { kind: "spark", angle: 101, dist: 22, delay: 0.2, size: 3, dur: 0.98, endScale: 0.95, endRot: 22, hue: "gold" },
  { kind: "star-outline", angle: 118, dist: 33, delay: 0.08, size: 9, dur: 1.54, endScale: 0.5, endRot: 76, hue: "primary" },
  { kind: "star-fill", angle: -125, dist: 28, delay: 0.24, size: 7, dur: 1.48, endScale: 0.38, endRot: -142, hue: "gold" },
  { kind: "dot", angle: -108, dist: 17, delay: 0.28, size: 3, dur: 1.26, endScale: 0.2, endRot: 0, hue: "gold" },
  { kind: "spark", angle: -93, dist: 20, delay: 0.11, size: 4, dur: 1.08, endScale: 0.88, endRot: -18, hue: "white" },
  { kind: "star-fill", angle: -76, dist: 32, delay: 0.06, size: 11, dur: 1.5, endScale: 0.42, endRot: 198, hue: "gold" },
  { kind: "star-outline", angle: -58, dist: 27, delay: 0.18, size: 8, dur: 1.46, endScale: 0.52, endRot: 64, hue: "white" },
  { kind: "dot", angle: -41, dist: 23, delay: 0.14, size: 5, dur: 1.38, endScale: 0.26, endRot: 0, hue: "primary" },
  { kind: "star-fill", angle: -24, dist: 36, delay: 0.22, size: 9, dur: 1.56, endScale: 0.44, endRot: -168, hue: "primary" },
  { kind: "spark", angle: 138, dist: 18, delay: 0.26, size: 3, dur: 1.02, endScale: 1, endRot: 16, hue: "gold" },
  { kind: "dot", angle: 154, dist: 24, delay: 0.09, size: 4, dur: 1.34, endScale: 0.3, endRot: 0, hue: "white" },
  { kind: "star-outline", angle: 171, dist: 37, delay: 0.3, size: 10, dur: 1.6, endScale: 0.48, endRot: 92, hue: "gold" },
  { kind: "star-fill", angle: 188, dist: 26, delay: 0.13, size: 6, dur: 1.42, endScale: 0.34, endRot: 132, hue: "white" },
  { kind: "spark", angle: -168, dist: 21, delay: 0.17, size: 4, dur: 1.06, endScale: 0.9, endRot: -24, hue: "primary" },
  { kind: "dot", angle: -152, dist: 20, delay: 0.32, size: 5, dur: 1.4, endScale: 0.24, endRot: 0, hue: "gold" },
  { kind: "star-fill", angle: -136, dist: 34, delay: 0.01, size: 10, dur: 1.53, endScale: 0.4, endRot: -188, hue: "primary" },
  { kind: "star-outline", angle: 206, dist: 29, delay: 0.19, size: 7, dur: 1.47, endScale: 0.54, endRot: -72, hue: "white" },
  { kind: "dot", angle: 223, dist: 19, delay: 0.07, size: 4, dur: 1.32, endScale: 0.32, endRot: 0, hue: "gold" },
  { kind: "spark", angle: 240, dist: 23, delay: 0.29, size: 3, dur: 1, endScale: 0.92, endRot: 28, hue: "white" },
  { kind: "star-fill", angle: 257, dist: 31, delay: 0.15, size: 8, dur: 1.55, endScale: 0.38, endRot: 118, hue: "gold" },
  { kind: "star-outline", angle: 274, dist: 30, delay: 0.25, size: 9, dur: 1.51, endScale: 0.46, endRot: -102, hue: "primary" },
  { kind: "dot", angle: 291, dist: 22, delay: 0.21, size: 3, dur: 1.28, endScale: 0.34, endRot: 0, hue: "white" },
  { kind: "star-fill", angle: 308, dist: 28, delay: 0.33, size: 7, dur: 1.49, endScale: 0.36, endRot: 174, hue: "gold" },
  { kind: "spark", angle: 325, dist: 16, delay: 0.23, size: 4, dur: 0.96, endScale: 1.02, endRot: -8, hue: "primary" },
  { kind: "dot", angle: 342, dist: 26, delay: 0.35, size: 5, dur: 1.37, endScale: 0.26, endRot: 0, hue: "gold" },
  { kind: "star-outline", angle: 4, dist: 39, delay: 0.27, size: 11, dur: 1.62, endScale: 0.5, endRot: 84, hue: "white" },
  { kind: "star-fill", angle: 162, dist: 22, delay: 0.31, size: 6, dur: 1.4, endScale: 0.32, endRot: -156, hue: "primary" },
];

function LogoCelebrationShape({ spec }: { spec: LogoCelebrationSpec }) {
  const { fill, stroke } = logoCelebrationPaint(spec.hue);

  if (spec.kind === "star-fill") {
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full drop-shadow-[0_0_3px_rgba(0,0,0,0.45)]" aria-hidden>
        <path d={LOGO_CELEBRATION_STAR_PATH} fill={fill} />
      </svg>
    );
  }
  if (spec.kind === "star-outline") {
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full drop-shadow-[0_0_2px_rgba(0,0,0,0.35)]" aria-hidden>
        <path
          d={LOGO_CELEBRATION_STAR_PATH}
          fill="rgba(255,255,255,0.07)"
          stroke={stroke}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (spec.kind === "dot") {
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        <circle cx="12" cy="12" r="4.25" fill={fill} className="drop-shadow-[0_0_2px_rgba(0,0,0,0.4)]" />
      </svg>
    );
  }
  /* spark — curved stroke; inner wrapper orients along burst ray */
  return (
    <span
      className="flex h-full w-full items-end justify-center pb-[8%]"
      style={{ transform: `rotate(${spec.angle}deg)` }}
      aria-hidden
    >
      <svg
        viewBox="0 0 10 22"
        className="h-[92%] w-[42%] drop-shadow-[0_0_2px_rgba(0,0,0,0.4)]"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
      >
        <path
          d="M5 20 Q1.5 11 6 2.8"
          fill="none"
          stroke={stroke}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

type BannerAlumniLogoBadgeVariant = "panel" | "fluid" | "corner";

/**
 * Alumni logo: “starburst celebration” — SVG stars, outline stars, dots & curved sparks
 * bursting from the center (reference-style), in brand gold / white / primary.
 * Pauses under `.achievement-winner-paused` (banner hover).
 *
 * - `panel`: fixed max width (desktop / lg side column).
 * - `fluid`: grows with available height in the bottom area (mobile / tablet).
 * - `corner`: minimum footprint for top-right fallback when bottom slot is too tight.
 */
function BannerAlumniLogoBadge({ variant = "panel" }: { variant?: BannerAlumniLogoBadgeVariant }) {
  const isPanel = variant === "panel";
  const isFluid = variant === "fluid";
  const isCorner = variant === "corner";

  return (
    <div
      className={cn(
        "pointer-events-none flex items-center justify-center",
        isPanel && "mx-auto w-full max-w-[6.5rem] px-0.5 sm:max-w-[7.25rem] lg:max-w-[7.75rem]",
        isFluid && "mx-auto h-full min-h-0 w-full max-w-full px-0.5 sm:px-1 md:px-1.5",
        isCorner && "h-9 w-9 shrink-0 sm:h-10 sm:w-10"
      )}
      aria-hidden
    >
      <div
        className={cn(
          "relative flex aspect-square items-center justify-center",
          isPanel && "w-full max-w-[min(100%,5.5rem)] sm:max-w-[6.25rem] lg:max-w-[6.75rem]",
          isFluid &&
            "min-h-0 min-w-0 aspect-square h-[min(100%,var(--achievement-fluid-logo,6.75rem))] w-[min(100%,var(--achievement-fluid-logo,6.75rem))] max-h-full max-w-full",
          isCorner && "h-full w-full max-h-[2.35rem] max-w-[2.35rem] sm:max-h-[2.6rem] sm:max-w-[2.6rem]"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2",
            isCorner ? "h-[155%] w-[155%]" : "h-[190%] w-[190%]"
          )}
          aria-hidden
        >
          <div className="hpc-banner-logo-celebrate-softglow hpc-banner-logo-fx-pauseable pointer-events-none absolute inset-[8%] rounded-full" />
          {LOGO_CELEBRATION_SPECS.map((spec, i) => {
            const rad = ((spec.angle - 90) * Math.PI) / 180;
            const tx = Math.round(Math.cos(rad) * spec.dist * 100) / 100;
            const ty = Math.round(Math.sin(rad) * spec.dist * 100) / 100;
            const h = spec.kind === "spark" ? Math.max(spec.size * 4.2, 14) : spec.size;
            return (
              <span
                key={i}
                className="hpc-banner-logo-celebrate-particle hpc-banner-logo-fx-pauseable pointer-events-none absolute left-1/2 top-1/2 z-[1] flex items-center justify-center"
                style={
                  {
                    width: spec.kind === "spark" ? spec.size * 1.2 : spec.size,
                    height: h,
                    "--tx": `${tx}px`,
                    "--ty": `${ty}px`,
                    "--sf": String(spec.endScale),
                    "--er": `${spec.endRot}deg`,
                    "--dur": `${spec.dur}s`,
                    animationDelay: `${spec.delay}s`,
                  } as CSSProperties
                }
              >
                <LogoCelebrationShape spec={spec} />
              </span>
            );
          })}
        </div>

        <div className="hpc-banner-logo-celebrate-pop hpc-banner-logo-fx-pauseable relative z-[2] flex aspect-square w-full max-w-full items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-background/95 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <img
            src={hpcLogo}
            alt=""
            width={120}
            height={120}
            className="max-h-[82%] max-w-[82%] object-contain object-center"
          />
        </div>
      </div>
    </div>
  );
}

interface Achievement {
  id: string;
  name: string;
  batch: string | null;
  photo_url: string | null;
  achievement_title: string;
  institution: string | null;
  message: string | null;
  tag: string | null;
  is_pinned: boolean;
  banner_photo_batch_text?: string | null;
  banner_photo_tagline?: string | null;
  banner_congratulations_text?: string | null;
  banner_theme?: "default" | "theme2" | null;
}

function bannerPhotoBatchLine(item: Achievement): string | null {
  const custom = item.banner_photo_batch_text?.trim();
  if (custom) return custom;
  const b = item.batch?.trim();
  return b ? `Batch of ${b}` : null;
}

function bannerPhotoTagline(item: Achievement): string {
  return item.banner_photo_tagline?.trim() || BANNER_DEFAULT_PHOTO_TAGLINE;
}

/** Lightweight “winner” decor: falling confetti + trophy drop (CSS only, remounts per slide). */
const CONFETTI_SPECS = [
  { left: "6%", delay: 0, dur: 2.2, rot: -12, w: 5, h: 11, hue: "primary" as const },
  { left: "14%", delay: 0.15, dur: 2.6, rot: 8, w: 4, h: 9, hue: "gold" as const },
  { left: "22%", delay: 0.05, dur: 2.35, rot: 20, w: 6, h: 8, hue: "light" as const },
  { left: "32%", delay: 0.35, dur: 2.5, rot: -25, w: 5, h: 10, hue: "primary" as const },
  { left: "42%", delay: 0.1, dur: 2.15, rot: 15, w: 4, h: 12, hue: "gold" as const },
  { left: "52%", delay: 0.45, dur: 2.7, rot: -8, w: 5, h: 9, hue: "light" as const },
  { left: "62%", delay: 0.2, dur: 2.4, rot: 22, w: 6, h: 10, hue: "primary" as const },
  { left: "72%", delay: 0.55, dur: 2.55, rot: -18, w: 4, h: 8, hue: "gold" as const },
  { left: "82%", delay: 0.08, dur: 2.3, rot: 10, w: 5, h: 11, hue: "light" as const },
  { left: "90%", delay: 0.4, dur: 2.65, rot: -30, w: 5, h: 9, hue: "primary" as const },
  { left: "38%", delay: 0.65, dur: 2.8, rot: 5, w: 4, h: 7, hue: "gold" as const },
  { left: "68%", delay: 0.28, dur: 2.45, rot: -5, w: 6, h: 9, hue: "light" as const },
];

function confettiColor(hue: (typeof CONFETTI_SPECS)[number]["hue"]): string {
  if (hue === "gold") return "rgba(251, 191, 36, 0.92)";
  if (hue === "light") return "rgba(255, 255, 255, 0.55)";
  return "hsl(var(--primary) / 0.85)";
}

const CELEBRATE_PARTICLE_COUNT = 22;

function celebrateParticlesFor(slideKey: string): { dx: number; dy: number; delay: number; size: number }[] {
  let h = 0;
  for (let i = 0; i < slideKey.length; i++) h = (h * 31 + slideKey.charCodeAt(i)) | 0;
  return Array.from({ length: CELEBRATE_PARTICLE_COUNT }, (_, i) => {
    const t = (i / CELEBRATE_PARTICLE_COUNT) * Math.PI * 2;
    const j = (h + i * 17) >>> 0;
    const dist = 52 + (j % 62);
    const wobble = ((j >> 3) % 28) / 100 - 0.14;
    const angle = t + wobble;
    return {
      dx: Math.round(Math.cos(angle) * dist),
      dy: Math.round(Math.sin(angle) * dist * 0.84),
      delay: 0.3 + (i % 9) * 0.03,
      size: 3 + (i % 4),
    };
  });
}

/** Premium “Congratulations” reveal: radial burst + particles; right column only. */
function CongratulationsBurstReveal({
  message,
  heading,
  slideKey,
  isPaused,
  theme2Style,
}: {
  message: string;
  heading?: string | null;
  slideKey: string;
  isPaused: boolean;
  theme2Style?: boolean;
}) {
  const particles = useMemo(() => celebrateParticlesFor(slideKey), [slideKey]);

  return (
    <div
      className={cn(
        "hpc-celebrate-root relative w-full min-w-0 max-w-full overflow-hidden rounded-md border bg-gradient-to-b from-white/[0.1] to-white/[0.04] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[2px] sm:rounded-lg sm:px-3 sm:py-2.5",
        isPaused && "achievement-winner-paused"
      )}
      style={
        theme2Style
          ? {
              borderColor: "var(--achievement-banner-congrats-border)",
              background: "var(--achievement-banner-congrats-bg)",
              backdropFilter: "blur(6px)",
            }
          : { borderColor: "var(--achievement-banner-tag-border)" }
      }
    >
      <div className="pointer-events-none absolute inset-0 z-0 hpc-celebrate-ambient hpc-celebrate-pauseable" aria-hidden />

      {/* Burst + rays: centered on “Congratulations” (full-width box), not offset — matches previous visual balance */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-[1] h-[min(9rem,56%)] w-full max-lg:max-w-full lg:max-w-[min(100%,24rem)] -translate-x-1/2 overflow-hidden sm:top-1 sm:h-[min(10rem,58%)]"
        aria-hidden
      >
        <div className="hpc-celebrate-blast-ring hpc-celebrate-pauseable" />
        <div className="hpc-celebrate-blast-rays hpc-celebrate-pauseable" />
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-[1.2rem] z-[2] w-0 -translate-x-1/2 sm:top-[1.45rem]"
        aria-hidden
      >
        {particles.map((p, i) => (
          <span
            key={`${slideKey}-sp-${i}`}
            className="absolute left-0 top-0 hpc-celebrate-particle hpc-celebrate-pauseable rounded-full bg-gradient-to-br from-amber-50/98 to-amber-500/85 shadow-[0_0_8px_rgba(251,191,36,0.65),0_0_14px_rgba(255,255,255,0.2)]"
            style={{
              width: p.size,
              height: p.size,
              marginLeft: `${-p.size / 2}px`,
              marginTop: `${-p.size / 2}px`,
              ["--dx" as string]: `${p.dx}px`,
              ["--dy" as string]: `${p.dy}px`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full min-w-0 flex-col">
        <div className="flex w-full justify-center px-0.5 pt-0.5">
          <span
            className={cn(
              "hpc-celebrate-title hpc-celebrate-pauseable inline-block text-center text-[clamp(0.72rem,4.5cqw+0.28rem,1.08rem)] font-extrabold uppercase tracking-[0.12em] sm:tracking-[0.14em]",
              "bg-gradient-to-r from-amber-100 via-white to-amber-200/95 bg-clip-text text-transparent"
            )}
          >
            {heading?.trim() || "Congratulations"}
          </span>
        </div>
        <p className="mt-1 min-h-0 w-full max-w-full break-words text-pretty text-[clamp(0.7rem,2.3cqw+0.2rem,0.86rem)] italic leading-snug text-white/85 line-clamp-[10] max-lg:line-clamp-none text-justify hyphens-auto">
          &ldquo;{message}&rdquo;
        </p>
        <p
          className="mt-1.5 shrink-0 border-t border-white/10 pt-1.5 text-right text-[0.58rem] font-semibold uppercase tracking-[0.08em] opacity-90 sm:text-[0.62rem]"
          style={{ color: "var(--achievement-banner-line)" }}
        >
          HPC Alumni Association
        </p>
      </div>
    </div>
  );
}

function AchievementWinnerOverlay({
  slideKey,
  isPaused,
}: {
  slideKey: string;
  isPaused: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[2] w-[56%] max-w-[28rem] overflow-hidden rounded-l-[inherit]",
        isPaused && "achievement-winner-paused"
      )}
      aria-hidden
    >
      {CONFETTI_SPECS.map((c, i) => {
        const drift = -18 + (i % 6) * 7;
        return (
          <span
            key={`${slideKey}-c-${i}`}
            className="hpc-win-anim absolute -top-3 rounded-[1px] shadow-sm will-change-transform"
            style={{
              left: c.left,
              width: c.w,
              height: c.h,
              backgroundColor: confettiColor(c.hue),
              ["--drift" as string]: `${drift}px`,
              ["--rot" as string]: `${c.rot}deg`,
              animationName: "hpc-confetti-fall",
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
              animationTimingFunction: "cubic-bezier(0.28, 0.55, 0.37, 0.98)",
              animationIterationCount: "infinite",
            }}
          />
        );
      })}
      <div
        className="hpc-win-anim absolute right-1.5 top-1.5 sm:right-2 sm:top-2"
        style={{
          animationName: "hpc-winner-trophy",
          animationDuration: "1s",
          animationDelay: "0.08s",
          animationTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          animationFillMode: "both",
          animationIterationCount: "1",
        }}
      >
        <Trophy
          className="h-6 w-6 text-amber-400/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:h-7 sm:w-7"
          strokeWidth={1.75}
        />
      </div>
    </div>
  );
}

function BannerPhotoPanel({
  item,
  isTransitioning,
  awardClassName,
}: {
  item: Achievement;
  isTransitioning: boolean;
  awardClassName: string;
}) {
  const tagline = bannerPhotoTagline(item);
  const batchLine = bannerPhotoBatchLine(item);
  const textShadow = "0 1px 8px rgba(0,0,0,0.95), 0 2px 16px rgba(0,0,0,0.65)";

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-neutral-950 transition-all duration-700 ease-out",
        isTransitioning ? "scale-[1.02] opacity-0" : "scale-100 opacity-100"
      )}
    >
      {item.photo_url ? (
        <>
          {/*
            Natural-ratio layout: the img is block-level with auto height so it
            stretches to its intrinsic aspect ratio. No letterboxing, no cropping.
            The photo column (parent) is also auto-height; the right column
            stretches to match via flex's default align-items:stretch.
          */}
          <img
            src={item.photo_url}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
          />
          {/* Light bottom fade — keeps overlay text readable */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[min(42%,11rem)] bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          {/* Name / batch / tagline pinned to the bottom of the photo */}
          <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col items-start gap-1 px-2 pb-2 pt-8 text-left sm:gap-1.5 sm:px-2.5 sm:pb-2.5 sm:pt-10 md:px-3 md:pb-3 md:pt-12">
            <p
              className="max-w-full break-words font-bold leading-tight text-white [font-size:clamp(0.78rem,5.5cqw+0.32rem,1.12rem)]"
              style={{ textShadow }}
            >
              {item.name}
            </p>
            {batchLine ? (
              <span
                className="inline-flex max-w-full break-words rounded-md border px-1.5 py-0.5 font-bold uppercase tracking-wide shadow-md sm:px-2 sm:py-0.5 [font-size:clamp(0.58rem,2.8cqw+0.2rem,0.75rem)]"
                style={{
                  borderColor: "var(--achievement-banner-tag-border)",
                  backgroundColor: "var(--achievement-banner-tag-bg)",
                  color: "var(--achievement-banner-eyebrow)",
                  textShadow,
                }}
              >
                {batchLine}
              </span>
            ) : null}
            <p
              className="max-w-full break-words font-bold leading-snug [font-size:clamp(0.62rem,3.4cqw+0.22rem,0.82rem)]"
              style={{ color: "var(--achievement-banner-line)", textShadow }}
            >
              {tagline}
            </p>
          </div>
        </>
      ) : (
        /* No-photo fallback: fixed minimum height so the banner isn't a sliver */
        <div
          className="relative flex min-h-[220px] w-full flex-col justify-end sm:min-h-[280px] lg:min-h-[340px]"
          style={{ background: "var(--achievement-banner-side-bg)" }}
        >
          <Award
            className={cn(awardClassName, "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25")}
            aria-hidden
          />
          <div className="relative z-[1] flex flex-col items-start gap-1 px-2 pb-2 pt-4 text-left sm:gap-1.5 sm:px-3 sm:pb-3 sm:pt-6">
            <p
              className="max-w-full break-words font-bold text-white/90 [font-size:clamp(0.78rem,5.5cqw+0.32rem,1.12rem)]"
              style={{ textShadow }}
            >
              {item.name}
            </p>
            {batchLine ? (
              <span
                className="inline-flex max-w-full rounded-md border px-1.5 py-0.5 font-bold uppercase tracking-wide [font-size:clamp(0.58rem,2.8cqw+0.2rem,0.75rem)]"
                style={{
                  borderColor: "var(--achievement-banner-tag-border)",
                  backgroundColor: "var(--achievement-banner-tag-bg)",
                  color: "var(--achievement-banner-eyebrow)",
                }}
              >
                {batchLine}
              </span>
            ) : null}
            <p
              className="max-w-full break-words font-bold [font-size:clamp(0.62rem,3.4cqw+0.22rem,0.82rem)]"
              style={{ color: "var(--achievement-banner-line)" }}
            >
              {tagline}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface Settings {
  banner_enabled: boolean;
  slide_duration: number;
  max_display_count: number | null;
  banner_theme?: "default" | "theme2";
}

/** MySQL / JSON may send 0/1; ignore error-shaped bodies */
function normalizeAchievementSettings(raw: unknown): Settings | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if ("ok" in o && (o as { ok?: boolean }).ok === false) return null;
  if (!("banner_enabled" in o)) return null;
  const be = o.banner_enabled;
  const banner_enabled = be === true || be === 1 || be === "1";
  const sd = Number(o.slide_duration);
  const slide_duration = Number.isFinite(sd) && sd > 0 ? sd : 4;
  const mdc = o.max_display_count;
  let max_display_count: number | null = null;
  if (mdc !== null && mdc !== undefined && mdc !== "") {
    const n = Number(mdc);
    if (Number.isFinite(n)) max_display_count = n;
  }
  const themeRaw = typeof o.banner_theme === "string" ? o.banner_theme.trim().toLowerCase() : "";
  const banner_theme: "default" | "theme2" =
    themeRaw === "theme2" || themeRaw === "tomato" ? "theme2" : "default";
  return { banner_enabled, slide_duration, max_display_count, banner_theme };
}


/** Desktop reference width: the shell is rendered at this width then scaled to fit. */
const DESIGN_W = 960;

const AchievementBanner = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  /** Only remounts the bottom time bar — never tied to congratulations remounts. */
  const [progressTick, setProgressTick] = useState(0);
  /** Remounts burst/confetti/trophy when a single slide loops or when multi-slide content changes needs extra kick. */
  const [animCycle, setAnimCycle] = useState(0);
  const bannerCardRef = useRef<HTMLDivElement>(null);
  const bannerShellRef = useRef<HTMLDivElement>(null);
  const [bannerScale, setBannerScale] = useState(1);
  const [bannerWrapperH, setBannerWrapperH] = useState<number | undefined>(undefined);
  const [bannerCardW, setBannerCardW] = useState(960);
  /** Stacked photo + text layout (no transform scale). Matches Tailwind `lg` — tablets/phones only. */
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );

  // Re-run when banner DOM first appears (achievements go from 0 → loaded).
  // Without this, refs are null on the initial null-render and the ResizeObserver
  // never gets set up, so scaling never kicks in.
  const bannerReady = achievements.length > 0 && !!settings?.banner_enabled;
  useLayoutEffect(() => {
    const card = bannerCardRef.current;
    if (!card) return;

    const update = () => {
      const cardW = card.getBoundingClientRect().width;
      if (!cardW) return;
      setBannerCardW(cardW);

      if (isNarrowViewport) {
        setBannerScale(1);
        setBannerWrapperH(undefined);
        return;
      }

      const shell = bannerShellRef.current;
      if (!shell) return;
      const s = Math.min(1, cardW / DESIGN_W);
      setBannerScale(s);
      setBannerWrapperH(s < 1 ? Math.round(shell.offsetHeight * s) : undefined);
    };

    let raf1 = 0,
      raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(update);
    });
    const ro = new ResizeObserver(update);
    ro.observe(card);
    const shell = bannerShellRef.current;
    if (shell) ro.observe(shell);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [bannerReady, isNarrowViewport]);

  useEffect(() => {
    const fetchData = async () => {
      const [settingsRes, achRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/public/achievement-settings`),
        fetch(`${API_BASE_URL}/api/public/achievements?active=true`),
      ]);
      const settingsRaw = settingsRes.ok ? await settingsRes.json().catch(() => null) : null;
      const normalized = normalizeAchievementSettings(settingsRaw);
      const fallbackSettings: Settings = {
        banner_enabled: true,
        slide_duration: 4,
        max_display_count: null,
      };
      setSettings(normalized ?? fallbackSettings);

      const achData = achRes.ok ? await achRes.json().catch(() => []) : [];
      if (Array.isArray(achData)) {
        const now = new Date().toISOString();
        const filtered = (achData as unknown as (Achievement & { start_date: string | null; end_date: string | null })[]).filter((a) => {
          if (a.start_date && a.start_date > now) return false;
          if (a.end_date && a.end_date < now) return false;
          return true;
        });
        const eff = normalized ?? fallbackSettings;
        const limited =
          eff.max_display_count != null && eff.max_display_count > 0
            ? filtered.slice(0, eff.max_display_count)
            : filtered;
        setAchievements(limited);
      }
    };
    fetchData();
  }, []);

  // Stacked vs scaled banner: use viewport (lg breakpoint), not only measured card width.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsNarrowViewport(mq.matches);
    onChange();
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const goTo = useCallback((index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setProgressTick((t) => t + 1);
      setAnimCycle((a) => a + 1);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % achievements.length);
  }, [current, achievements.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + achievements.length) % achievements.length);
  }, [current, achievements.length, goTo]);

  /** Advance slides (multi) or restart one-slide animations on each admin slide_duration tick. */
  useEffect(() => {
    if (!settings || isPaused || achievements.length < 1) return;
    const delay = (settings.slide_duration || 4) * 1000;
    const tick = () => {
      if (achievements.length === 1) {
        setProgressTick((t) => t + 1);
        setAnimCycle((a) => a + 1);
      } else {
        next();
      }
    };
    const interval = setInterval(tick, delay);
    return () => clearInterval(interval);
  }, [settings, isPaused, achievements.length, next]);

  if (!settings?.banner_enabled || achievements.length === 0) return null;

  const item = achievements[current];
  const duration = (settings.slide_duration || 4) * 1000;
  const itemTheme = String(item.banner_theme ?? "")
    .trim()
    .toLowerCase();
  const fallbackTheme = String(settings.banner_theme ?? "default")
    .trim()
    .toLowerCase();
  const activeBannerTheme =
    itemTheme === "theme2" || itemTheme === "tomato"
      ? "theme2"
      : fallbackTheme === "theme2" || fallbackTheme === "tomato"
        ? "theme2"
        : "default";
  const isTheme2 = activeBannerTheme === "theme2";
  const bannerThemeVars: CSSProperties =
    isTheme2
      ? {
          ["--achievement-banner-side-bg" as string]:
            "linear-gradient(135deg, #0a6f62 0%, #075f54 48%, #045248 100%)",
          ["--achievement-banner-side-overlay" as string]:
            "linear-gradient(to left, #14303d, transparent)",
          ["--achievement-banner-eyebrow" as string]: "#fcd34d",
          ["--achievement-banner-line" as string]: "#fbbf24",
          ["--achievement-banner-progress" as string]: "#3fb8af",
          ["--achievement-banner-tag-fg" as string]: "#fde68a",
          ["--achievement-banner-tag-bg" as string]: "rgba(251, 191, 36, 0.20)",
          ["--achievement-banner-tag-border" as string]: "rgba(251, 191, 36, 0.40)",
          ["--achievement-banner-ach-bg" as string]: "rgba(255, 255, 255, 0.12)",
          ["--achievement-banner-ach-border" as string]: "rgba(255, 149, 89, 0.62)",
          ["--achievement-banner-ach-title" as string]: "#FFF0EA",
          ["--achievement-banner-congrats-bg" as string]: "rgba(255, 255, 255, 0.18)",
          ["--achievement-banner-congrats-border" as string]: "rgba(255, 149, 89, 0.72)",
          ["--achievement-banner-congrats-heading" as string]: "#FFF7D6",
          ["--achievement-banner-icon-accent" as string]: "#3fb8af",
        }
      : {};

  const navBtnClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary/45 bg-primary/[0.08] text-primary shadow-md backdrop-blur-sm transition-all hover:border-primary hover:bg-primary/15 hover:text-primary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 sm:h-10 sm:w-10 dark:border-primary/50 dark:bg-primary/[0.12] dark:hover:bg-primary/20";

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-background pt-10 lg:pt-11" style={bannerThemeVars}>
      <div className="layout-container min-w-0 pb-2 pt-2 sm:pb-2.5 sm:pt-2.5 md:pb-3 md:pt-3">
        <div className="relative mx-auto flex w-full min-w-0 max-w-full items-center justify-center gap-2 overflow-x-hidden px-0.5 sm:gap-3 md:gap-3.5">
        <div
          className="@container/achievement-banner relative flex min-w-0 w-full flex-1 max-w-full flex-col overflow-hidden rounded-xl border border-border/90 bg-background shadow-md ring-1 ring-border/40"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div ref={bannerCardRef} className="relative min-h-0 min-w-0 w-full shrink-0 overflow-hidden">
      {isNarrowViewport ? (
        /* ── NARROW (≤1023px): stacked layout, no desktop scale transform ── */
        <div className={cn("flex flex-col", isTransitioning ? "opacity-0" : "opacity-100")} style={{ transition: "opacity 0.3s" }}>
          {/* Photo — full width, 8∶5 (same as admin crop + desktop column) */}
          <div
            className="relative w-full max-w-full overflow-hidden bg-neutral-950"
            style={{ aspectRatio: ACHIEVEMENT_BANNER_CROP_ASPECT }}
          >
            {item.photo_url ? (
              <>
                <img
                  src={item.photo_url}
                  alt={item.name}
                  className="absolute inset-0 z-0 h-full w-full object-cover object-center"
                  decoding="async"
                  sizes="100vw"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[50%] bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col items-start gap-0.5 px-3 pb-2.5">
                  <p className="font-bold leading-tight text-white text-sm drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                    {item.name}
                  </p>
                  {bannerPhotoBatchLine(item) && (
                    <span
                      className="inline-flex rounded-md border px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
                      style={{ borderColor: "var(--achievement-banner-tag-border)", backgroundColor: "var(--achievement-banner-tag-bg)", color: "var(--achievement-banner-eyebrow)" }}
                    >
                      {bannerPhotoBatchLine(item)}
                    </span>
                  )}
                  <p className="text-[0.65rem] font-semibold leading-snug" style={{ color: "var(--achievement-banner-line)" }}>
                    {bannerPhotoTagline(item)}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Award className="h-16 w-16 text-white/20" aria-hidden />
              </div>
            )}

            {/* Confetti falling over full photo width — same specs as desktop */}
            {CONFETTI_SPECS.map((c, i) => {
              const drift = -18 + (i % 6) * 7;
              return (
                <span
                  key={`mob-c-${item.id}-${animCycle}-${i}`}
                  className={cn("hpc-win-anim absolute -top-3 rounded-[1px] shadow-sm will-change-transform", isPaused && "achievement-winner-paused")}
                  style={{
                    left: c.left,
                    width: c.w,
                    height: c.h,
                    backgroundColor: confettiColor(c.hue),
                    ["--drift" as string]: `${drift}px`,
                    ["--rot" as string]: `${c.rot}deg`,
                    animationName: "hpc-confetti-fall",
                    animationDuration: `${c.dur}s`,
                    animationDelay: `${c.delay}s`,
                    animationTimingFunction: "cubic-bezier(0.28, 0.55, 0.37, 0.98)",
                    animationIterationCount: "infinite",
                  }}
                />
              );
            })}

            {/* Trophy — true top-right corner of photo; key restarts drop animation on each slide */}
            <div
              key={`mob-trophy-${item.id}-${animCycle}`}
              className="absolute right-2 top-2 z-[6]"
              style={{
                animation: "hpc-winner-trophy 1s cubic-bezier(0.34,1.56,0.64,1) 0.08s both",
              }}
            >
              <Trophy className="h-6 w-6 text-amber-400/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" strokeWidth={1.75} />
            </div>
          </div>

          {/* Alumni Spotlight pill row — with prev/next buttons on mobile */}
          <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: "var(--achievement-banner-side-bg)" }}>
            {/* Prev button */}
            {achievements.length > 1 ? (
              <button type="button" onClick={prev} aria-label="Previous slide"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary/45 bg-primary/[0.08] text-primary shadow-sm transition-all hover:border-primary hover:bg-primary/15 active:scale-95"
                style={isTheme2 ? { color: "var(--achievement-banner-icon-accent)", borderColor: "rgba(34,197,94,0.55)", backgroundColor: "rgba(34,197,94,0.12)" } : undefined}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : <span className="w-7" />}

            {/* Pill */}
            <div
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.13em]",
                "font-semibold"
              )}
              style={{
                borderColor: "var(--achievement-banner-tag-border)",
                backgroundColor: "var(--achievement-banner-tag-bg)",
                color: "var(--achievement-banner-eyebrow)",
              }}
            >
              <Award className="h-3 w-3 shrink-0" />
              Alumni Spotlight
              <span className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse" style={{ backgroundColor: "var(--achievement-banner-line)" }} />
            </div>

            {/* Next button */}
            {achievements.length > 1 ? (
              <button type="button" onClick={next} aria-label="Next slide"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary/45 bg-primary/[0.08] text-primary shadow-sm transition-all hover:border-primary hover:bg-primary/15 active:scale-95"
                style={isTheme2 ? { color: "var(--achievement-banner-icon-accent)", borderColor: "rgba(34,197,94,0.55)", backgroundColor: "rgba(34,197,94,0.12)" } : undefined}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : <span className="w-7" />}
          </div>

          {/* Text content — full width, readable native size */}
          <div
            className={cn("relative flex flex-col gap-2.5 px-4 py-3", isPaused && "achievement-winner-paused")}
            style={{ background: "var(--achievement-banner-side-bg)" }}
          >
            {/* Spotlight radial glow — same feel as achievement banner ambient */}
            <div className="pointer-events-none absolute inset-0 z-[1] hpc-celebrate-ambient hpc-celebrate-pauseable" aria-hidden />
            {/* Shimmer overlay — same as desktop right pane */}
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent hpc-banner-right-pauseable hpc-banner-right-bg-shimmer" />
            <div
              className={cn("relative z-10 flex flex-col gap-2", isTransitioning ? "opacity-0" : "opacity-100")}
              style={{ transition: "opacity 0.3s" }}
            >
              {/* Achievement title — staggered enter */}
              {item.achievement_title?.trim() ? (
                <div
                  key={`mob-ach-${item.id}-${animCycle}`}
                  className="hpc-banner-right-enter rounded-lg border bg-white/[0.06] px-3 py-2 backdrop-blur-[2px]"
                  style={{
                    borderColor: isTheme2 ? "var(--achievement-banner-ach-border)" : "var(--achievement-banner-tag-border)",
                    background: isTheme2 ? "var(--achievement-banner-ach-bg)" : undefined,
                    animationDelay: "0.08s",
                  }}
                >
                  <p
                    className="text-[0.6rem] font-semibold uppercase tracking-widest"
                    style={{ color: "#FFFFFF" }}
                  >
                    Achievement
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 break-words leading-snug text-sm",
                      "font-semibold"
                    )}
                    style={{ color: "var(--achievement-banner-line)" }}
                  >
                    {item.achievement_title.trim()}
                  </p>
                </div>
              ) : null}

              {/* Message — with full CongratulationsBurstReveal animation */}
              {item.message?.trim() ? (
                <div
                  key={`mob-msg-${item.id}-${animCycle}`}
                  className="hpc-banner-right-enter"
                  style={{ animationDelay: "0.18s" }}
                >
                  <CongratulationsBurstReveal
                    message={item.message.trim()}
                    heading={item.banner_congratulations_text}
                    slideKey={`mob-${item.id}-${animCycle}`}
                    isPaused={isPaused}
                    theme2Style={isTheme2}
                  />
                </div>
              ) : null}

              {/* Slide counter — mobile only, in-flow at bottom of text section */}
              {achievements.length > 1 && (
                <div className="hpc-banner-right-enter flex justify-center pt-1 pb-0.5" style={{ animationDelay: "0.26s" }}>
                  <span
                    className={cn(
                      "fs-ui rounded-full border border-border/50 bg-background/85 px-3 py-1 font-semibold text-foreground shadow-sm backdrop-blur-sm transition-all duration-300",
                      isTransitioning ? "scale-90 opacity-0" : "scale-100 opacity-100"
                    )}
                  >
                    {current + 1} / {achievements.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── DESKTOP / TABLET layout: transform-scale canvas (≥ 540px) ── */
        <>
        {/* Wrapper: clips and reserves the scaled height */}
        <div
          className="relative overflow-hidden rounded-b-[inherit]"
          style={bannerScale < 1 && bannerWrapperH ? { height: bannerWrapperH } : undefined}
        >
          {/* Shell: fixed at DESIGN_W, scaled down to fit card width */}
          <div
            ref={bannerShellRef}
            className="hpc-achievement-banner-shell flex flex-row overflow-hidden rounded-b-[inherit] origin-top-left"
            style={bannerScale < 1 ? { width: `${DESIGN_W}px`, transform: `scale(${bannerScale})` } : { width: "100%" }}
          >
            {/* Photo column — fixed ratio on tablet/PC; right text area widened */}
            <div
              className="relative z-0 w-[46%] max-w-none min-w-0 shrink-0 overflow-hidden border-r border-border/50"
              style={{ aspectRatio: ACHIEVEMENT_BANNER_CROP_ASPECT }}
            >
              <BannerPhotoPanel
                item={item}
                isTransitioning={isTransitioning}
                awardClassName="h-28 w-28 text-white/20"
              />
              {achievements.length > 1 ? (
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 top-1/2 z-30 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/45 bg-primary/[0.08] text-primary shadow-md backdrop-blur-sm transition-all hover:border-primary hover:bg-primary/15 active:scale-95"
                  style={isTheme2 ? { color: "var(--achievement-banner-icon-accent)", borderColor: "rgba(34,197,94,0.55)", backgroundColor: "rgba(34,197,94,0.12)" } : undefined}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <AchievementWinnerOverlay key={`${item.id}-${animCycle}`} slideKey={`${item.id}-${animCycle}`} isPaused={isPaused} />

            {/* Right column — stretches to photo height via flex align-items:stretch */}
            <div
              className={cn(
                "hpc-achievement-right-pane relative z-[10] box-border flex min-w-0 flex-1 flex-col justify-start overflow-x-hidden overflow-y-hidden pt-6",
                isPaused && "achievement-winner-paused"
              )}
              style={{ background: "var(--achievement-banner-side-bg)" }}
            >
              {achievements.length > 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 top-1/2 z-30 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/45 bg-primary/[0.08] text-primary shadow-md backdrop-blur-sm transition-all hover:border-primary hover:bg-primary/15 active:scale-95"
                  style={isTheme2 ? { color: "var(--achievement-banner-icon-accent)", borderColor: "rgba(34,197,94,0.55)", backgroundColor: "rgba(34,197,94,0.12)" } : undefined}
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent hpc-banner-right-pauseable hpc-banner-right-bg-shimmer" />
              <div
                className={cn(
                  "relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden",
                  item.message?.trim() && "flex-row items-stretch",
                  isTransitioning ? "opacity-0" : "opacity-100"
                )}
              >
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-col justify-start gap-1.5 overflow-x-hidden border-l-[3px] border-primary px-3.5 pb-2",
                    item.message?.trim()
                      ? "hpc-achievement-mobile-text-scroll min-w-0 flex-1 w-full max-w-full overflow-y-auto overscroll-contain pt-0 pr-12 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent]"
                      : "w-full min-w-0 max-w-full flex-1 overflow-y-hidden"
                  )}
                >
                  <div className="hpc-banner-right-enter flex items-center justify-center gap-2" style={{ animationDelay: "0.04s" }}>
                    <div
                      key={`${item.id}-pill`}
                      className={cn(
                        "inline-flex w-fit max-w-full shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.13em]",
                        "font-semibold"
                      )}
                      style={{
                        borderColor: "var(--achievement-banner-tag-border)",
                        backgroundColor: "var(--achievement-banner-tag-bg)",
                        color: "var(--achievement-banner-eyebrow)",
                      }}
                    >
                      <Award className="h-3 w-3 shrink-0" />
                      Alumni Spotlight
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse"
                        style={{ backgroundColor: "var(--achievement-banner-line)" }}
                      />
                    </div>
                  </div>

                  {item.achievement_title?.trim() ? (
                    <div
                      key={`${item.id}-ach-${animCycle}`}
                      className="hpc-banner-right-enter w-full min-w-0 shrink-0"
                      style={{ animationDelay: "0.12s" }}
                    >
                      <div
                        className="hpc-banner-right-box-glow hpc-banner-right-pauseable w-full rounded-lg border bg-white/[0.06] px-2.5 py-1.5 backdrop-blur-[2px]"
                        style={{
                          borderColor: isTheme2 ? "var(--achievement-banner-ach-border)" : "var(--achievement-banner-tag-border)",
                          background: isTheme2 ? "var(--achievement-banner-ach-bg)" : undefined,
                        }}
                      >
                        <p
                          className="text-[0.58rem] font-semibold uppercase tracking-widest"
                          style={{ color: "#FFFFFF" }}
                        >
                          Achievement
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 break-words leading-snug text-[clamp(0.68rem,2.6cqw+0.18rem,0.8125rem)]",
                            "font-semibold"
                          )}
                          style={{ color: "var(--achievement-banner-line)" }}
                        >
                          {item.achievement_title.trim()}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {item.message?.trim() ? (
                    <div
                      key={`${item.id}-msg-${animCycle}`}
                      className="hpc-banner-right-enter min-w-0 w-full shrink-0"
                      style={{ animationDelay: "0.2s" }}
                    >
                      <CongratulationsBurstReveal
                        message={item.message.trim()}
                        heading={item.banner_congratulations_text}
                        slideKey={`${item.id}-${animCycle}`}
                        isPaused={isPaused}
                        theme2Style={isTheme2}
                      />
                    </div>
                  ) : null}
                </div>

              </div>
            </div>
          </div>
        </div>
        </>
      )}
          </div>

      {achievements.length > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 sm:bottom-6 max-sm:hidden">
          <span
            className={cn(
              "fs-ui rounded-full border border-border/50 bg-background/85 px-3 py-1 font-semibold text-foreground shadow-sm backdrop-blur-sm transition-all duration-300",
              isTransitioning ? "scale-90 opacity-0" : "scale-100 opacity-100"
            )}
          >
            {current + 1} / {achievements.length}
          </span>
        </div>
      ) : null}
      {/* Time load: fills over slide_duration; progressTick remount restarts the bar without tearing down congratulations. */}
      <div
        className="relative z-20 h-1.5 w-full shrink-0 bg-border/60"
        aria-hidden
      >
        <div
          key={progressTick}
          className="h-full origin-left rounded-r-sm"
          style={{
            backgroundColor: "var(--achievement-banner-progress)",
            animation: isPaused ? "none" : `progress-fill ${duration}ms linear forwards`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>

      <style>{`
        @keyframes progress-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes hpc-confetti-fall {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--rot, 0deg));
            opacity: 0;
          }
          10% {
            opacity: 0.92;
          }
          100% {
            transform: translate3d(var(--drift, 0px), 400px, 0)
              rotate(calc(var(--rot, 0deg) + 520deg));
            opacity: 0.08;
          }
        }
        @keyframes hpc-winner-trophy {
          0% {
            transform: translate3d(0, -120%, 0) rotate(-18deg) scale(0.5);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
        }
        .achievement-winner-paused .hpc-win-anim {
          animation-play-state: paused !important;
        }
        .achievement-winner-paused .hpc-banner-right-pauseable {
          animation-play-state: paused !important;
        }
        .achievement-winner-paused .hpc-celebrate-pauseable {
          animation-play-state: paused !important;
        }
        .achievement-winner-paused .hpc-banner-logo-fx-pauseable {
          animation-play-state: paused !important;
        }

        /* Mobile / tablet: narrow scrollbar so achievement + congratulations can use column width */
        @media (max-width: 1023px) {
          .hpc-achievement-mobile-text-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .hpc-achievement-mobile-text-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.22);
            border-radius: 9999px;
          }
        }

        /* —— Banner alumni logo: sketch-style starburst (stars · dots · sparks) —— */
        @keyframes hpc-banner-logo-celebrate-burst {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(0.12) rotate(-6deg);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(var(--tx, 0px), var(--ty, 0px)) scale(var(--sf, 0.45))
              rotate(var(--er, 0deg));
            opacity: 0;
          }
        }
        .hpc-banner-logo-celebrate-particle {
          transform-origin: center center;
          animation-name: hpc-banner-logo-celebrate-burst;
          animation-duration: var(--dur, 1.45s);
          animation-timing-function: cubic-bezier(0.07, 0.92, 0.18, 1);
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }

        @keyframes hpc-banner-logo-celebrate-softglow-kf {
          0%,
          100% {
            opacity: 0.32;
            transform: scale(0.94);
          }
          50% {
            opacity: 0.52;
            transform: scale(1.03);
          }
        }
        .hpc-banner-logo-celebrate-softglow {
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.08) 0%,
            rgba(251, 191, 36, 0.16) 32%,
            hsl(var(--primary) / 0.08) 52%,
            transparent 68%
          );
          animation: hpc-banner-logo-celebrate-softglow-kf 3.1s ease-in-out infinite;
        }

        @keyframes hpc-banner-logo-celebrate-pop-kf {
          0%,
          100% {
            transform: translateZ(0) scale(1);
          }
          50% {
            transform: translateZ(0) scale(1.035);
          }
        }
        .hpc-banner-logo-celebrate-pop {
          transform-origin: center center;
          animation: hpc-banner-logo-celebrate-pop-kf 2.65s ease-in-out infinite;
        }
        /* Right column: calm staggered fade-up (not bouncy) */
        @keyframes hpc-banner-right-item-in {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .hpc-banner-right-enter {
          animation: hpc-banner-right-item-in 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* —— Congratulations burst reveal (right column message only) —— */
        @keyframes hpc-celebrate-ambient {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .hpc-celebrate-ambient {
          animation: hpc-celebrate-ambient 0.32s ease-out forwards;
          background: radial-gradient(ellipse 96% 80% at 50% 12%, hsl(var(--primary) / 0.26), transparent 60%);
        }

        @keyframes hpc-celebrate-blast-ring {
          0% {
            transform: translate(-50%, -50%) scale(0.18);
            opacity: 0;
          }
          18% {
            opacity: 0.95;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.62);
            opacity: 0;
          }
        }
        .hpc-celebrate-blast-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 132%;
          aspect-ratio: 1;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.32) 0%,
            rgba(251, 191, 36, 0.48) 26%,
            rgba(251, 191, 36, 0.14) 48%,
            transparent 72%
          );
          filter: blur(1px);
          animation: hpc-celebrate-blast-ring 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
        }

        @keyframes hpc-celebrate-blast-rays {
          0% {
            transform: translate(-50%, -50%) scale(0.22) rotate(-8deg);
            opacity: 0;
          }
          26% {
            opacity: 0.72;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.38) rotate(0deg);
            opacity: 0;
          }
        }
        .hpc-celebrate-blast-rays {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 248%;
          height: 248%;
          transform: translate(-50%, -50%);
          background: repeating-conic-gradient(
            from 0deg at 50% 50%,
            rgba(255, 255, 255, 0.18) 0deg 3.5deg,
            transparent 3.5deg 17deg
          );
          opacity: 0;
          animation: hpc-celebrate-blast-rays 0.86s cubic-bezier(0.22, 1, 0.36, 1) 0.12s forwards;
          mask-image: radial-gradient(circle, black 10%, transparent 72%);
          -webkit-mask-image: radial-gradient(circle, black 10%, transparent 72%);
        }

        @keyframes hpc-celebrate-particle {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0;
          }
          14% {
            opacity: 0.92;
          }
          100% {
            transform: translate(var(--dx, 0px), var(--dy, 0px)) scale(0.18);
            opacity: 0;
          }
        }
        .hpc-celebrate-particle {
          animation: hpc-celebrate-particle 1.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes hpc-celebrate-title {
          0% {
            opacity: 0;
            transform: translate3d(0, 22px, 0) scale(0.62);
          }
          55% {
            opacity: 1;
            transform: translate3d(0, -3px, 0) scale(1.12);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes hpc-celebrate-title-glow {
          0%,
          100% {
            text-shadow:
              0 0 18px rgba(251, 191, 36, 0.55),
              0 0 32px rgba(251, 191, 36, 0.22),
              0 2px 0 rgba(0, 0, 0, 0.45);
          }
          50% {
            text-shadow:
              0 0 28px rgba(251, 191, 36, 0.75),
              0 0 48px rgba(255, 255, 255, 0.22),
              0 0 64px rgba(251, 191, 36, 0.18),
              0 2px 0 rgba(0, 0, 0, 0.5);
          }
        }
        .hpc-celebrate-title {
          animation:
            hpc-celebrate-title 0.98s cubic-bezier(0.22, 1, 0.36, 1) 0.14s forwards,
            hpc-celebrate-title-glow 2.5s ease-in-out 0.95s infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .hpc-banner-logo-celebrate-particle,
          .hpc-banner-logo-celebrate-softglow,
          .hpc-banner-logo-celebrate-pop {
            animation: none !important;
          }
          .hpc-banner-logo-celebrate-particle {
            display: none !important;
          }
          .hpc-banner-logo-celebrate-softglow {
            opacity: 0.45;
            transform: none;
          }
          .hpc-banner-logo-celebrate-pop {
            transform: none;
          }
          .hpc-celebrate-title,
          .hpc-celebrate-blast-ring,
          .hpc-celebrate-blast-rays,
          .hpc-celebrate-particle,
          .hpc-celebrate-ambient {
            animation: none !important;
          }
          .hpc-celebrate-title {
            opacity: 1;
            transform: none;
            text-shadow:
              0 0 16px rgba(251, 191, 36, 0.45),
              0 0 28px rgba(251, 191, 36, 0.2),
              0 2px 0 rgba(0, 0, 0, 0.4);
          }
          .hpc-celebrate-blast-ring,
          .hpc-celebrate-blast-rays,
          .hpc-celebrate-particle {
            display: none !important;
          }
          .hpc-celebrate-ambient {
            opacity: 1;
            background: radial-gradient(ellipse 96% 64% at 50% 12%, hsl(var(--primary) / 0.14), transparent 56%);
          }
        }

        @media (max-width: 639px) {
          .hpc-celebrate-blast-ring {
            animation-duration: 0.78s;
          }
          .hpc-celebrate-particle {
            animation-duration: 1.18s;
          }
        }

        @keyframes hpc-banner-right-bg-shimmer {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.72;
          }
        }
        .hpc-banner-right-bg-shimmer {
          animation: hpc-banner-right-bg-shimmer 4.2s ease-in-out infinite;
        }

        @keyframes hpc-banner-right-box-glow {
          0%,
          100% {
            box-shadow: inset 0 0 0 1px hsl(var(--primary) / 0.06);
          }
          50% {
            box-shadow: inset 0 0 12px -4px hsl(var(--primary) / 0.18);
          }
        }
        .hpc-banner-right-box-glow {
          animation: hpc-banner-right-box-glow 3.2s ease-in-out infinite;
        }

      `}</style>
        </div>

        </div>
      </div>
    </div>
  );
};

export default AchievementBanner;
