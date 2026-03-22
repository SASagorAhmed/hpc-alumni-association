import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Palette } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  /** Classes on the root (positioning). Default: inline in navbar. */
  rootClassName?: string;
  /** Extra classes on the icon button */
  buttonClassName?: string;
  /** Override palette icon color (e.g. `text-white` on dark headers) */
  iconClassName?: string;
};

/**
 * Icon-only control; opens theme list on click. Root should be `relative` (navbar)
 * or wrapped in a `fixed` container (auth / member pages).
 */
export function ThemeToggle({ rootClassName, buttonClassName, iconClassName }: ThemeToggleProps) {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = themes.find((t) => t.id === theme) ?? themes[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative shrink-0", rootClassName)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Theme: ${current.name}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted/60 hover:text-primary",
          buttonClassName
        )}
      >
        <Palette className={cn("h-4 w-4 shrink-0 text-primary", iconClassName)} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            role="listbox"
            className="absolute right-0 top-full z-[100] mt-1.5 w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          >
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Choose theme
              </p>
            </div>

            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={theme === t.id}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-[12px] font-medium transition-colors",
                  theme === t.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                )}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-border shadow-sm"
                  style={{ background: t.swatch }}
                />
                <span className="min-w-0 flex-1 truncate text-left">
                  {t.emoji} {t.name}
                </span>
                {theme === t.id ? <span className="text-primary font-bold text-sm leading-none">✓</span> : null}
              </button>
            ))}

            <div className="border-t border-border px-3 py-2">
              <p className="text-center text-[10px] text-muted-foreground">Saved automatically</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
