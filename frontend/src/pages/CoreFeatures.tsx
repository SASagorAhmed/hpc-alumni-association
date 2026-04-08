import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FeaturesSection from "@/components/landing/FeaturesSection";
import { useLandingContent } from "@/hooks/useLandingContent";

/** Full-page module grid (headline and intro come from `FeaturesSection` + CMS `features`). */
export default function CoreFeatures() {
  const { data: content } = useLandingContent();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <Navbar />
      <div className="pt-12">
        <main className="w-full flex-1">
          <div className="layout-container px-4 pb-2 pt-16 sm:px-6 sm:pt-20 lg:px-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to Home
            </Link>
          </div>
          <FeaturesSection content={content?.features} />
        </main>
      </div>
      <Footer content={content?.footer} />
    </div>
  );
}
