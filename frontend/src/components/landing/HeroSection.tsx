import { motion } from "framer-motion";
import { ArrowRight, MapPin, Calendar, Award } from "lucide-react";
import { Link } from "react-router-dom";
import heroCampus from "@/assets/hero-campus.jpg";
import { getLandingIcon } from "@/lib/landingIcons";

const defaultStats = [
  { icon: Calendar, label: "Est.", value: "2010" },
  { icon: Award, label: "Alumni", value: "1,500+" },
  { icon: MapPin, label: "Location", value: "Panthapath, Dhaka" },
];

const iconMap: Record<string, any> = { "Est.": Calendar, Alumni: Award, Location: MapPin };

interface HeroProps {
  content?: Record<string, any>;
}

const HeroSection = ({ content }: HeroProps) => {
  const badge = content?.badge ?? "EIIN: 134209";
  const headline = content?.headline ?? "HPC Alumni Association – Connecting Alumni for Life";
  const description =
    content?.description ??
    "Hamdard Public College Alumni Association connects graduates across Bangladesh. Join our growing network to build connections, share achievements, and create opportunities for the future. Official HPC Alumni Network for students, Teacher, professionals, and community leaders.";
  const ctaPrimary = content?.ctaPrimary ?? "Join the Network";
  const ctaSecondary = content?.ctaSecondary ?? "Learn More";
  const motto = content?.motto ?? "HAMDARD PUBLIC COLLEGE, DHAKA";
  const stats = content?.stats
    ? content.stats.map((s: any) => ({
        icon: getLandingIcon(s.iconKey, iconMap[s.label] || Calendar),
        label: s.label,
        value: s.value,
      }))
    : defaultStats;

  const ctaPrimaryHref = content?.ctaPrimaryHref ?? "/register";
  const ctaSecondaryHref = content?.ctaSecondaryHref ?? "#about";

  const primaryIsExternal = /^https?:\/\//i.test(ctaPrimaryHref);
  const secondaryIsExternal = /^https?:\/\//i.test(ctaSecondaryHref);
  const secondaryIsHash = ctaSecondaryHref.startsWith("#");

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="layout-container relative min-w-0 pb-10 pt-10 md:pb-12 md:pt-12">
        {/* Mobile: badge → headline → campus photo → description → CTAs. lg+: text column left, image right (row-span-2). */}
        <div className="grid min-w-0 grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
            className="min-w-0 lg:col-start-1 lg:row-start-1"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 shadow-sm max-lg:max-w-full max-lg:flex-wrap">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="fs-eyebrow font-medium text-muted-foreground max-lg:min-w-0 max-lg:max-w-full max-lg:break-words">
                {badge}
              </span>
            </div>
            <h1 className="fs-display mb-0 font-bold tracking-tight text-foreground max-lg:max-w-full max-lg:text-pretty max-lg:break-words lg:mb-5">
              {headline}
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0, 0, 1] }}
            className="relative mx-auto w-full min-w-0 max-w-[min(100%,40rem)] justify-self-center lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:mx-0 lg:max-w-[min(100%,38rem)] lg:justify-self-end"
          >
            <div className="mt-5 min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-md lg:mt-0">
              <img
                src={heroCampus}
                alt="Hamdard Public College Campus"
                className="h-auto w-full max-w-full object-contain"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-3 left-4 rounded-lg border border-primary/25 bg-card/95 p-2.5 shadow-md max-lg:max-w-[min(18rem,calc(100%-1.5rem))] max-lg:p-3 md:left-5">
              <p className="relative overflow-hidden fs-eyebrow font-semibold leading-snug text-foreground max-lg:text-pretty max-lg:break-words max-lg:leading-relaxed">
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[hpcMottoShine_3.2s_ease-in-out_infinite]" />
                {motto}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.2, 0, 0, 1] }}
            className="min-w-0 lg:col-start-1 lg:row-start-2"
          >
            {/* lg+: measure + pretty wrap. Phone/tablet: full width + justified body (see index.css line-height). */}
            <p className="fs-body mb-6 text-muted-foreground max-lg:w-full max-lg:max-w-none text-justify hyphens-auto max-lg:text-pretty max-lg:leading-relaxed max-lg:break-words lg:max-w-[54ch] lg:text-pretty">
              {description}
            </p>
            <div className="flex flex-wrap gap-3 max-lg:min-w-0 max-sm:flex-col max-sm:gap-2.5">
              {primaryIsExternal ? (
                <a
                  href={ctaPrimaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fs-button-text inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] max-lg:min-h-10 max-lg:max-w-full max-lg:whitespace-normal max-lg:text-center max-sm:w-full max-sm:py-3"
                >
                  {ctaPrimary} <ArrowRight className="h-[1em] w-[1em] shrink-0" strokeWidth={2} />
                </a>
              ) : (
                <Link
                  to={ctaPrimaryHref}
                  className="fs-button-text inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] max-lg:min-h-10 max-lg:max-w-full max-lg:whitespace-normal max-lg:text-center max-sm:w-full max-sm:py-3"
                >
                  {ctaPrimary} <ArrowRight className="h-[1em] w-[1em] shrink-0" strokeWidth={2} />
                </Link>
              )}
              {secondaryIsExternal || secondaryIsHash ? (
                <a
                  href={ctaSecondaryHref}
                  {...(secondaryIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="fs-button-text inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-[0.98] max-lg:min-h-10 max-lg:max-w-full max-lg:whitespace-normal max-lg:text-center max-sm:w-full max-sm:py-3"
                >
                  {ctaSecondary}
                </a>
              ) : (
                <Link
                  to={ctaSecondaryHref}
                  className="fs-button-text inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-[0.98] max-lg:min-h-10 max-lg:max-w-full max-lg:whitespace-normal max-lg:text-center max-sm:w-full max-sm:py-3"
                >
                  {ctaSecondary}
                </Link>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.2, 0, 0, 1] }}
          className="mt-10 md:mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3"
        >
          {stats.map((stat: any) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 bg-card px-4 py-4 transition-colors hover:bg-muted/40 max-lg:min-w-0 max-sm:py-3.5"
            >
              <stat.icon size={20} className="text-primary shrink-0 max-sm:h-[18px] max-sm:w-[18px]" />
              <div className="max-lg:min-w-0">
                <p className="fs-caption font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="fs-mono-stat font-mono font-bold leading-snug text-foreground max-lg:break-words max-sm:text-[0.8125rem]">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
