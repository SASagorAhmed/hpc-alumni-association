import { Link } from "react-router-dom";
import { UserPlus, ArrowRight } from "lucide-react";

interface JoinProps { content?: Record<string, any>; }

const JoinSection = ({ content }: JoinProps) => {
  const sectionLabel = content?.sectionLabel ?? "Become an Alumni";
  const heading = content?.heading ?? "Our Alumni Network";
  const description = content?.description ?? "Former student of Hamdard Public College? Register today to connect with over 1,500 alumni, access exclusive events, elections, and stay updated with the community.";
  const ctaPrimary = content?.ctaPrimary ?? "Register Now";
  const ctaSecondary = content?.ctaSecondary ?? "Already a member? Login";

  return (
    <section id="join" className="relative overflow-hidden border-t border-b border-border/60 bg-muted/25 py-14 md:py-16">
      <div className="layout-container relative max-w-2xl text-center">
        <div className="fs-ui mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 font-medium text-primary shadow-sm">
          <UserPlus className="h-4 w-4" />
          {sectionLabel}
        </div>
        <h2 className="mb-3 fs-title font-bold text-foreground">
          Join <span className="text-primary underline decoration-primary/30 underline-offset-4">{heading}</span>
        </h2>
        <p className="mx-auto mb-6 max-w-lg fs-body text-muted-foreground text-justify hyphens-auto">{description}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="fs-button-text inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            {ctaPrimary} <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="fs-button-text inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-[0.98]"
          >
            {ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default JoinSection;
