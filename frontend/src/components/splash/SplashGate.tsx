import { AnimatePresence } from "framer-motion";
import { type ReactNode, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useIsRestoring } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAchievementBannerData } from "@/hooks/useAchievementBannerData";
import { useLandingContent } from "@/hooks/useLandingContent";
import { readUserDisplayCache } from "@/lib/userDisplayCache";
import { SplashScreen } from "./SplashScreen";

/**
 * Covers first paint while persisted React Query cache restores, session resolves,
 * and (on the homepage) public CMS + achievement banner queries settle.
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, user } = useAuth();
  const location = useLocation();
  const isRestoring = useIsRestoring();

  const isHome = location.pathname === "/" || location.pathname === "";
  const isPublicAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";

  const banner = useAchievementBannerData({ enabled: isHome });
  const landing = useLandingContent({ enabled: isHome });

  const homeBlocking = isHome && (banner.isPending || landing.isPending);

  const globalBlocking = !isPublicAuthRoute && (isRestoring || authLoading);
  const showSplash = homeBlocking || globalBlocking;

  useEffect(() => {
    if (showSplash) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showSplash]);

  const welcomeName = useMemo(() => {
    if (user?.name) return user.name;
    return readUserDisplayCache()?.name ?? null;
  }, [user?.name]);

  return (
    <>
      {children}
      <AnimatePresence mode="wait">
        {showSplash ? <SplashScreen key="splash" welcomeName={welcomeName} /> : null}
      </AnimatePresence>
    </>
  );
}
