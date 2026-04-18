import { Send, Instagram } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";

interface FooterProps {
  content?: Record<string, any>;
  /** Warm premium landing palette (Index only); other routes stay neutral. */
  warmLanding?: boolean;
}

const Footer = ({ content, warmLanding = false }: FooterProps) => {
  const collegeName = content?.collegeName ?? "Hamdard Public College";
  const motto = content?.motto ?? "Promoting Knowledge, Promoting Learning";
  const copyright = content?.copyright ?? "Hamdard Public College Alumni Association. Parent Organization: Hamdard Laboratories (Waqf) Bangladesh.";
  const navLinks = content?.navLinks ?? ["About", "Committee", "Features", "Community", "Contact"];
  const telegramUrl = content?.telegramUrl ?? "https://t.me/hpcalumni";
  const facebookUrl = content?.facebookUrl ?? "https://facebook.com/hpcalumni";
  const instagramUrl = typeof content?.instagramUrl === "string" ? content.instagramUrl.trim() : "";

  const surface = warmLanding
    ? "linear-gradient(165deg, #020818 0%, #050b2a 45%, #070d28 100%)"
    : "#0f172a";
  const borderTone = warmLanding ? "border-cyan-500/20" : "border-border";
  const dividerClass = warmLanding
    ? "mb-8 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent"
    : "mb-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent";
  const textStrong = warmLanding ? "text-slate-100" : "text-white";
  const textSoft = warmLanding ? "text-slate-400" : "text-white/80";
  const linkClass = warmLanding
    ? "fs-ui font-medium text-slate-400 transition-colors hover:text-cyan-300"
    : "fs-ui font-medium text-white/80 transition-colors hover:text-white";
  const iconShell = warmLanding
    ? "border border-cyan-400/30 bg-white/5 text-slate-200 transition-colors hover:border-orange-400/50 hover:text-white"
    : "border border-white/35 bg-black/25 text-white transition-colors hover:border-white/60 hover:text-white";
  const legalBorder = warmLanding ? "border-white/10" : "border-white/25";
  const legalText = warmLanding ? "text-slate-500" : "text-white/75";

  return (
    <footer
      className={`relative overflow-hidden border-t py-8 ${borderTone}`}
      style={{ background: surface }}
    >
      <div className="layout-container">
        <div className={dividerClass} />
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <img src={hpcLogo} alt="HPC" className="h-8 w-8" />
            <div>
              <p className={`fs-body font-semibold ${textStrong}`}>{collegeName}</p>
              <p className={`fs-caption ${textSoft}`}>{motto}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {navLinks.map((link: string) => (
              <a key={link} href={`#${link.toLowerCase()}`} className={linkClass}>
                {link}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-9 w-9 items-center justify-center rounded-full ${iconShell}`}
              aria-label="Telegram"
            >
              <Send size={14} />
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`fs-ui flex h-9 w-9 items-center justify-center rounded-full font-bold ${iconShell}`}
              aria-label="Facebook"
            >
              f
            </a>
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex h-9 w-9 items-center justify-center rounded-full ${iconShell}`}
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>
            ) : null}
          </div>
        </div>
        <div className={`mt-8 border-t pt-6 text-center ${legalBorder}`}>
          <p className={`landing-footer-legal fs-caption ${legalText}`}>
            © {new Date().getFullYear()} {copyright}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
