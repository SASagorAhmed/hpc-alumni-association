import { AnimatePresence } from "framer-motion";
import { type ReactNode, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useIsRestoring } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { readUserDisplayCache } from "@/lib/userDisplayCache";
import { SplashScreen } from "./SplashScreen";

/**
 * Covers first paint while persisted React Query cache restores and session resolves.
 * Homepage sections render progressively from their own loading states.
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, user } = useAuth();
  const location = useLocation();
  const isRestoring = useIsRestoring();

  const isPublicAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";

  const globalBlocking = !isPublicAuthRoute && (isRestoring || authLoading);
  const showSplash = globalBlocking;

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
