import type { ComponentProps, ReactNode } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { LandingRgbroAmbience } from "@/components/landing/LandingRgbroAmbience";
import { cn } from "@/lib/utils";

export type PublicMetaverseChromeProps = {
  children: ReactNode;
  /** Full-screen route over landing: hide nav/footer, tight top padding. */
  overlayMode?: boolean;
  showNavbar?: boolean;
  showFooter?: boolean;
  footerProps?: ComponentProps<typeof Footer>;
  /** Extra classes on the mesh `<section>` (direct child of `<main>`). */
  sectionClassName?: string;
};

/**
 * Public routes: same document chrome as home — metaverse outer, RGBRO tokens + section mesh, pointer ambience.
 */
export function PublicMetaverseChrome({
  children,
  overlayMode = false,
  showNavbar = true,
  showFooter = true,
  footerProps,
  sectionClassName,
}: PublicMetaverseChromeProps) {
  return (
    <div className="hpc-public-premium-shell landing-metaverse-page flex min-h-screen flex-col overflow-x-hidden bg-[#0a051b] text-foreground antialiased">
      {showNavbar ? <Navbar landingMetaverse /> : null}
      <div className={cn("flex min-h-0 flex-1 flex-col", showNavbar && "pt-12")}>
        <main className="landing-copy-scale landing-rgbro landing-metaverse isolate relative flex min-h-0 min-w-0 flex-1 flex-col">
          <LandingRgbroAmbience />
          <section
            className={cn(
              "relative z-[2] flex min-h-0 w-full min-w-0 flex-1 flex-col",
              overlayMode ? "pt-4 sm:pt-6" : "pt-12 sm:pt-16",
              sectionClassName
            )}
          >
            {children}
          </section>
        </main>
      </div>
      {showFooter ? <Footer warmLanding {...footerProps} /> : null}
    </div>
  );
}
