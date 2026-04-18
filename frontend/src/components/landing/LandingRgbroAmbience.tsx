import { useEffect, useState } from "react";

/** Electric cyan #00D1FF + warm orange ambient — matches landing stack (no purple). */
const C = {
  electric: "0, 209, 255",
  electricDeep: "30, 136, 255",
  warm: "255, 149, 0",
  orange: "255, 184, 0",
  yellow: "255, 214, 0",
} as const;

export function LandingRgbroAmbience() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMq = () => setReduceMotion(mq.matches);
    syncMq();
    mq.addEventListener("change", syncMq);
    const onMove = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      mq.removeEventListener("change", syncMq);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const { x, y } = pos;

  const glowBackground = reduceMotion
    ? [
        `radial-gradient(ellipse 120% 90% at 18% 12%, rgba(${C.electric}, 0.2), transparent 58%)`,
        `radial-gradient(ellipse 100% 75% at 85% 68%, rgba(${C.electricDeep}, 0.14), transparent 56%)`,
        `radial-gradient(ellipse 80% 58% at 55% 100%, rgba(${C.warm}, 0.12), transparent 52%)`,
        `radial-gradient(ellipse 70% 50% at 70% 28%, rgba(${C.orange}, 0.09), transparent 50%)`,
      ].join(", ")
    : [
        /* Tight pointer-follow accents (small footprint, no fullscreen haze) */
        `radial-gradient(200px at ${x}px ${y}px, rgba(${C.electric}, 0.14), transparent 72%)`,
        `radial-gradient(160px at ${x + 48}px ${y - 32}px, rgba(${C.electricDeep}, 0.1), transparent 72%)`,
        `radial-gradient(140px at ${x - 40}px ${y + 36}px, rgba(${C.warm}, 0.09), transparent 74%)`,
        `radial-gradient(110px at ${x - 16}px ${y + 10}px, rgba(${C.orange}, 0.07), transparent 74%)`,
        `radial-gradient(90px at ${x + 28}px ${y - 18}px, rgba(${C.yellow}, 0.06), transparent 75%)`,
      ].join(", ");

  return (
    <div className="landing-rgbro-ambience pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: glowBackground,
          transition: "background 0.2s ease-out",
        }}
      />
      {!reduceMotion ? (
        <>
          <div className="landing-rgbro-orb landing-rgbro-orb-a absolute -left-16 top-[12%] h-[min(16rem,42vw)] w-[min(16rem,42vw)] rounded-full bg-[rgba(0,209,255,0.1)] blur-[48px]" />
          <div className="landing-rgbro-orb landing-rgbro-orb-b absolute -right-12 top-[4%] h-[min(14rem,38vw)] w-[min(14rem,38vw)] rounded-full bg-[rgba(30,136,255,0.09)] blur-[44px]" />
          <div className="landing-rgbro-orb landing-rgbro-orb-c absolute right-[10%] top-[40%] h-[min(11rem,30vw)] w-[min(11rem,30vw)] rounded-full bg-[rgba(255,149,0,0.1)] blur-[40px]" />
        </>
      ) : null}
    </div>
  );
}
