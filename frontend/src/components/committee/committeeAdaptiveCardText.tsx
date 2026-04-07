import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import {
  FIT_WIDTH_SLOP_PX,
  fitLargestFontSingleLine,
  setOverflowSingleLineFit,
} from "@/components/committee/committeeTextFit";

function applyHeadingEllipsisIfNeeded(el: HTMLElement) {
  if (el.scrollWidth > el.clientWidth + FIT_WIDTH_SLOP_PX) {
    el.style.textOverflow = "ellipsis";
  }
}

/**
 * Single-line heading: show `full` at max size; if it overflows and `shortOpt` is set, use short, then shrink-to-fit.
 */
export function useAdaptiveHeadingFitLine(
  full: string,
  shortOpt: string | null | undefined,
  maxPx: number,
  minPx: number,
): { ref: RefObject<HTMLHeadingElement | null>; text: string } {
  const shortTrim = shortOpt?.trim() || "";
  const [text, setText] = useState(full);
  const elRef = useRef<HTMLHeadingElement | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  const run = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    flushSync(() => setText(full));
    const el0 = elRef.current;
    if (!el0) return;

    el0.style.textOverflow = "";
    setOverflowSingleLineFit(el0);
    el0.style.fontSize = `${maxPx}px`;

    if (el0.scrollWidth <= el0.clientWidth + FIT_WIDTH_SLOP_PX) {
      fitLargestFontSingleLine(el0, minPx, maxPx);
      applyHeadingEllipsisIfNeeded(el0);
      return;
    }

    if (shortTrim) {
      flushSync(() => setText(shortTrim));
      const el1 = elRef.current;
      if (!el1) return;
      el1.style.textOverflow = "";
      setOverflowSingleLineFit(el1);
      el1.style.fontSize = `${maxPx}px`;
      fitLargestFontSingleLine(el1, minPx, maxPx);
      applyHeadingEllipsisIfNeeded(el1);
      return;
    }

    fitLargestFontSingleLine(el0, minPx, maxPx);
    applyHeadingEllipsisIfNeeded(el0);
  }, [full, shortTrim, maxPx, minPx]);

  useLayoutEffect(() => {
    requestAnimationFrame(run);
    const el = elRef.current;
    const parent = el?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(parent);
    return () => ro.disconnect();
  }, [run, resizeTick]);

  return { ref: elRef, text };
}

/** Mobile card headings: max/min in `em` vs `[data-committee-mobile-card]` root font size. */
export function useAdaptiveHeadingFitLineEm(
  full: string,
  shortOpt: string | null | undefined,
  maxEm: number,
  minEm: number,
): { ref: RefObject<HTMLHeadingElement | null>; text: string } {
  const shortTrim = shortOpt?.trim() || "";
  const [text, setText] = useState(full);
  const elRef = useRef<HTMLHeadingElement | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  const run = useCallback(() => {
    const el = elRef.current;
    if (!el) return;

    const root = el.closest("[data-committee-mobile-card]") as HTMLElement | null;
    const basePx = root ? parseFloat(getComputedStyle(root).fontSize) || 16 : 16;
    const maxPx = maxEm * basePx;
    const minPx = minEm * basePx;

    flushSync(() => setText(full));
    const el0 = elRef.current;
    if (!el0) return;

    el0.style.whiteSpace = "nowrap";
    el0.style.textOverflow = "";
    setOverflowSingleLineFit(el0);
    el0.style.fontSize = `${maxPx}px`;

    if (el0.scrollWidth <= el0.clientWidth + FIT_WIDTH_SLOP_PX) {
      fitLargestFontSingleLine(el0, minPx, maxPx);
      el0.style.lineHeight = "1.25";
      return;
    }

    if (shortTrim) {
      flushSync(() => setText(shortTrim));
      const el1 = elRef.current;
      if (!el1) return;
      el1.style.whiteSpace = "nowrap";
      el1.style.textOverflow = "";
      setOverflowSingleLineFit(el1);
      el1.style.fontSize = `${maxPx}px`;
      fitLargestFontSingleLine(el1, minPx, maxPx);
      el1.style.lineHeight = "1.25";
      return;
    }

    fitLargestFontSingleLine(el0, minPx, maxPx);
    el0.style.lineHeight = "1.25";
  }, [full, shortTrim, maxEm, minEm]);

  useLayoutEffect(() => {
    requestAnimationFrame(run);
    const el = elRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    const root = el.closest("[data-committee-mobile-card]") as HTMLElement | null;
    if (root) ro.observe(root);
    return () => ro.disconnect();
  }, [run, resizeTick]);

  return { ref: elRef, text };
}

/** Inline single line (e.g. `University: …`): full line first, then optional shorter line. */
export function useAdaptiveInlineFitLine(
  fullLine: string,
  shortLine: string | null | undefined,
  maxEm: number,
  minEm: number,
): { ref: RefObject<HTMLSpanElement | null>; text: string } {
  const shortTrim = shortLine?.trim() || "";
  const hasAlt = shortTrim.length > 0 && shortTrim !== fullLine;
  const [text, setText] = useState(fullLine);
  const elRef = useRef<HTMLSpanElement | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  const run = useCallback(() => {
    const el = elRef.current;
    if (!el) return;

    const root = el.closest("[data-committee-mobile-card]") as HTMLElement | null;
    const basePx = root ? parseFloat(getComputedStyle(root).fontSize) || 16 : 16;
    const maxPx = maxEm * basePx;
    const minPx = minEm * basePx;

    flushSync(() => setText(fullLine));
    const el0 = elRef.current;
    if (!el0) return;

    el0.style.whiteSpace = "nowrap";
    el0.style.textOverflow = "";
    setOverflowSingleLineFit(el0);
    el0.style.fontSize = `${maxPx}px`;
    el0.style.lineHeight = "1.3";

    if (el0.scrollWidth <= el0.clientWidth + FIT_WIDTH_SLOP_PX) {
      fitLargestFontSingleLine(el0, minPx, maxPx);
      el0.style.lineHeight = "1.3";
      return;
    }

    if (hasAlt) {
      flushSync(() => setText(shortTrim));
      const el1 = elRef.current;
      if (!el1) return;
      el1.style.whiteSpace = "nowrap";
      el1.style.textOverflow = "";
      setOverflowSingleLineFit(el1);
      el1.style.fontSize = `${maxPx}px`;
      el1.style.lineHeight = "1.3";
      fitLargestFontSingleLine(el1, minPx, maxPx);
      el1.style.lineHeight = "1.3";
      return;
    }

    fitLargestFontSingleLine(el0, minPx, maxPx);
    el0.style.lineHeight = "1.3";
  }, [fullLine, shortTrim, hasAlt, maxEm, minEm]);

  useLayoutEffect(() => {
    requestAnimationFrame(run);
    const el = elRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    const root = el.closest("[data-committee-mobile-card]") as HTMLElement | null;
    if (root) ro.observe(root);
    return () => ro.disconnect();
  }, [run, resizeTick]);

  return { ref: elRef, text };
}

/**
 * Wrapped / break-words institution value only (no "University:" prefix): prefer full; if nowrap overflows, use short.
 */
export function useAdaptiveInstitutionBreakValue(
  full: string,
  shortOpt: string | null | undefined,
): { ref: RefObject<HTMLSpanElement | null>; text: string } {
  const shortTrim = shortOpt?.trim() || "";
  const [text, setText] = useState(full);
  const elRef = useRef<HTMLSpanElement | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  useLayoutEffect(() => {
    queueMicrotask(() => {
      flushSync(() => setText(full));
      const el = elRef.current;
      if (!el) return;
      if (!shortTrim) return;
      const prevWs = el.style.whiteSpace;
      el.style.whiteSpace = "nowrap";
      const overflow = el.scrollWidth > el.clientWidth + FIT_WIDTH_SLOP_PX;
      el.style.whiteSpace = prevWs;
      if (overflow) flushSync(() => setText(shortTrim));
    });
  }, [full, shortTrim, resizeTick]);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el?.parentElement) return;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);

  return { ref: elRef, text };
}

/** Structured list / simple headings — only full vs short swap at a fixed font size. */
export function useAdaptiveStaticHeadingLine(
  full: string,
  shortOpt: string | null | undefined,
  fontSizePx: number,
): { ref: RefObject<HTMLHeadingElement | null>; text: string } {
  const shortTrim = shortOpt?.trim() || "";
  const [text, setText] = useState(full);
  const elRef = useRef<HTMLHeadingElement | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  useLayoutEffect(() => {
    queueMicrotask(() => {
      flushSync(() => setText(full));
      const el = elRef.current;
      if (!el) return;
      if (!shortTrim) return;
      el.style.fontSize = `${fontSizePx}px`;
      el.style.whiteSpace = "nowrap";
      const overflow = el.scrollWidth > el.clientWidth + FIT_WIDTH_SLOP_PX;
      el.style.whiteSpace = "";
      if (overflow) flushSync(() => setText(shortTrim));
    });
  }, [full, shortTrim, fontSizePx, resizeTick]);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el?.parentElement) return;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);

  return { ref: elRef, text };
}
