import { createContext, useContext, useLayoutEffect, useState } from "react";

export type ThemeId = "green" | "ocean" | "purple" | "amber" | "lemon" | "night";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  emoji: string;
  swatch: string;
}

export const themes: ThemeOption[] = [
  { id: "green",  name: "Forest Green", emoji: "🌿", swatch: "linear-gradient(135deg, #064e3b 0%, #059669 100%)" },
  { id: "ocean",  name: "Ocean Blue",   emoji: "🌊", swatch: "linear-gradient(135deg, #0c1445 0%, #1565c0 100%)" },
  { id: "purple", name: "Royal Purple", emoji: "👑", swatch: "linear-gradient(135deg, #1a0533 0%, #6d28d9 100%)" },
  { id: "amber",  name: "Amber Gold",   emoji: "✨", swatch: "linear-gradient(135deg, #451a03 0%, #b45309 100%)" },
  { id: "lemon",  name: "Zesty Lemon",  emoji: "🍋", swatch: "linear-gradient(135deg, #B3B347 0%, #FFFF66 100%)" },
  { id: "night",  name: "Night Mode",   emoji: "🌙", swatch: "linear-gradient(135deg, #0f172a 0%, #334155 100%)" },
];

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themes: ThemeOption[];
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    let initial: ThemeId = "green";
    try {
      initial = (localStorage.getItem("hpc_theme") as ThemeId) || "green";
    } catch {
      initial = "green";
    }

    // Prevent first-paint theme flash by applying data-theme immediately.
    try {
      const root = document.documentElement;
      if (initial === "green") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", initial);
    } catch {
      // ignore (e.g. non-browser env)
    }
    return initial;
  });

  const setTheme = (id: ThemeId) => {
    setThemeState(id);
    try { localStorage.setItem("hpc_theme", id); } catch { /* ignore */ }
  };

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "green") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme, themes }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
