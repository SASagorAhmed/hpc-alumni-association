import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Multi-paragraph body with the same alignment pattern as the banner congratulations message:
 * justified lines, last line of each paragraph left-aligned, no auto hyphens.
 */
export function JustifiedDetailText({ text, className }: { text: string; className?: string }) {
  const paragraphs = useMemo(() => {
    const n = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const paras = n
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (paras.length > 0) return paras;
    const t = n.trim();
    return t ? [t] : [];
  }, [text]);

  const bodyClass =
    "text-justify [text-align-last:left] hyphens-none break-normal [word-break:normal] [overflow-wrap:normal] text-pretty whitespace-pre-line fs-body leading-relaxed text-foreground/90";

  if (paragraphs.length === 0) return null;
  if (paragraphs.length === 1) {
    return <p className={cn(bodyClass, className)}>{paragraphs[0]}</p>;
  }
  return (
    <div className={cn("space-y-2", className)}>
      {paragraphs.map((para, i) => (
        <p key={i} className={bodyClass}>
          {para}
        </p>
      ))}
    </div>
  );
}
