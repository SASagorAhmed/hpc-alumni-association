import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  '[role="button"]:not([aria-disabled="true"])',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  "input",
  "select",
  "textarea",
  "summary",
  "label[for]",
].join(", ");

function isInteractive(el: Element | null): boolean {
  if (!el || !(el instanceof Element)) return false;
  return Boolean(el.closest(INTERACTIVE_SELECTOR));
}

/**
 * Subtle pointer-follow ambient light behind app content. Purely decorative; pointer-events none.
 * Stronger when the cursor is over typical clickable controls.
 */
export function CursorAmbientGlow() {
  const blobsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const blobs = blobsRef.current;
    if (!blobs) return;

    let raf = 0;
    let alive = true;
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.45;
    let curX = targetX;
    let curY = targetY;
    let interactive = false;

    const tick = () => {
      if (!alive) return;
      curX += (targetX - curX) * 0.11;
      curY += (targetY - curY) * 0.11;
      blobs.style.setProperty("--hx", `${curX}px`);
      blobs.style.setProperty("--hy", `${curY}px`);
      blobs.style.setProperty("--hi", interactive ? "1" : "0");
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      interactive = isInteractive(hit);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden hpc-cursor-glow-root" aria-hidden>
      <div ref={blobsRef} className="hpc-cursor-glow-blobs absolute inset-0" />
    </div>,
    document.body,
  );
}
