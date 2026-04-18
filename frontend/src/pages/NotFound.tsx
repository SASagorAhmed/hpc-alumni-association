import { Link } from "react-router-dom";
import { PublicMetaverseChrome } from "@/components/layout/PublicMetaverseChrome";

const NotFound = () => {
  return (
    <PublicMetaverseChrome>
      <div className="layout-container flex min-h-[min(85dvh,720px)] w-full flex-col items-center justify-center py-12 text-center">
        <h1 className="mb-3 font-outfit-section text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          404
        </h1>
        <p className="mb-8 max-w-md text-lg text-landing-description sm:text-xl">Oops! Page not found</p>
        <Link
          to="/"
          className="landing-nav-cta-gradient inline-flex h-9 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent px-5 fs-ui font-semibold shadow-lg transition-transform active:scale-[0.98]"
        >
          Return to Home
        </Link>
      </div>
    </PublicMetaverseChrome>
  );
};

export default NotFound;
