import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FeaturesSection from "@/components/landing/FeaturesSection";
import { useLandingContent } from "@/hooks/useLandingContent";
import { PublicMetaverseChrome } from "@/components/layout/PublicMetaverseChrome";

/** Full-page module grid (headline and intro come from `FeaturesSection` + CMS `features`). */
export default function CoreFeatures() {
  const { data: content } = useLandingContent();

  return (
    <PublicMetaverseChrome footerProps={content?.footer ? { content: content.footer } : undefined}>
      <div className="layout-container px-4 pb-2 pt-2 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-landing-description transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to Home
        </Link>
      </div>
      <FeaturesSection content={content?.features} />
    </PublicMetaverseChrome>
  );
}
