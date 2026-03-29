import * as React from "react";
import { BREAKPOINT_MOBILE_MAX } from "@/lib/breakpoints";

/** Sheet / overlay sidebar: phones only (≤630px); tablet and desktop use full layout from 631px. */
const MOBILE_MAX = BREAKPOINT_MOBILE_MAX;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth <= MOBILE_MAX);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth <= MOBILE_MAX);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
