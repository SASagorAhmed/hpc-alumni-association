import { Send, Instagram } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";

interface FooterProps { content?: Record<string, any>; }

const Footer = ({ content }: FooterProps) => {
  const collegeName = content?.collegeName ?? "Hamdard Public College";
  const motto = content?.motto ?? "Promoting Knowledge, Promoting Learning";
  const copyright = content?.copyright ?? "Hamdard Public College Alumni Association. Parent Organization: Hamdard Laboratories (Waqf) Bangladesh.";
  const navLinks = content?.navLinks ?? ["About", "Committee", "Features", "Community", "Contact"];
  const telegramUrl = content?.telegramUrl ?? "https://t.me/hpcalumni";
  const facebookUrl = content?.facebookUrl ?? "https://facebook.com/hpcalumni";
  const instagramUrl = typeof content?.instagramUrl === "string" ? content.instagramUrl.trim() : "";

  return (
    <footer
      className="relative overflow-hidden border-t border-border py-8"
      style={{
        background: "#0f172a",
      }}
    >
      <div className="layout-container">
        <div className="mb-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <img src={hpcLogo} alt="HPC" className="h-8 w-8" />
            <div>
              <p className="fs-body font-semibold text-white">{collegeName}</p>
              <p className="fs-caption text-white/80">{motto}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {navLinks.map((link: string) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="fs-ui font-medium text-white/80 transition-colors hover:text-white"
              >
                {link}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-black/25 text-white transition-colors hover:border-white/60 hover:text-white"
              aria-label="Telegram"
            >
              <Send size={14} />
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="fs-ui flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-black/25 font-bold text-white transition-colors hover:border-white/60 hover:text-white"
              aria-label="Facebook"
            >
              f
            </a>
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-black/25 text-white transition-colors hover:border-white/60 hover:text-white"
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>
            ) : null}
          </div>
        </div>
        <div className="mt-8 border-t border-white/25 pt-6 text-center">
          <p className="landing-footer-legal fs-caption text-white/75">© {new Date().getFullYear()} {copyright}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
