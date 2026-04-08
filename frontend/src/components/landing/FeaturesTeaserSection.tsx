import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutGrid } from "lucide-react";

interface Props {
  content?: Record<string, unknown>;
}

/**
 * Compact block on the home page (`#features`). Full module grid lives on `/core-features`.
 */
const FeaturesTeaserSection = ({ content }: Props) => {
  const teaserHeading = String(content?.teaserHeading ?? "Learn about this website");
  const teaserBody =
    String(
      content?.teaserBody ??
        "To find out what this platform offers and how it works, open the Core Features section. There you will find a detailed overview of our platform and its capabilities — every major module in one place."
    );
  const ctaLabel = String(content?.ctaLabel ?? "View Core Features");

  return (
    <section id="features" className="border-t border-border/60 bg-muted/20 py-14 md:py-16">
      <div className="layout-container max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <div className="fs-eyebrow mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-semibold uppercase tracking-wider text-primary">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Platform
          </div>
          <h2 className="fs-title mb-3 font-bold tracking-tight text-foreground font-outfit-section">
            {teaserHeading}
          </h2>
          <p className="fs-body mb-6 text-muted-foreground text-justify hyphens-auto leading-relaxed">{teaserBody}</p>
          <Link
            to="/core-features"
            className="fs-button-text inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesTeaserSection;
