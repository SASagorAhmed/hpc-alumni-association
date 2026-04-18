import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useFreezeBackgroundScroll } from "@/hooks/useFreezeBackgroundScroll";

type FullScreenRouteLayerProps = {
  children: ReactNode;
  preserveTopNavbar?: boolean;
};

export function FullScreenRouteLayer({ children, preserveTopNavbar = false }: FullScreenRouteLayerProps) {
  useFreezeBackgroundScroll(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, []);

  return (
    <div
      ref={scrollRef}
      className="hpc-fullscreen-metaverse-layer fixed inset-x-0 bottom-0 z-[120] overflow-y-auto overscroll-contain"
      style={{
        top: preserveTopNavbar ? "var(--hpc-navbar-height, 0px)" : "0px",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children}
    </div>
  );
}
