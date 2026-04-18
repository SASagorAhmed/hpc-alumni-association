import { motion } from "framer-motion";
import { MessageCircle, Send, Users, Globe, ArrowRight } from "lucide-react";
import { getLandingIcon } from "@/lib/landingIcons";

const defaultStats = [
  { icon: Users, value: "1,500+", label: "Alumni Members" },
  { icon: Globe, value: "15+", label: "Countries" },
  { icon: MessageCircle, value: "500+", label: "Active on Telegram" },
  { icon: Send, value: "50+", label: "Events Hosted" },
];

const iconMap: Record<string, any> = { "Alumni Members": Users, Countries: Globe, "Active on Telegram": MessageCircle, "Events Hosted": Send };
const statIconColors = ["text-primary", "text-accent", "text-primary", "text-muted-foreground"];

interface CommunityProps { content?: Record<string, any>; }

const CommunitySection = ({ content }: CommunityProps) => {
  const sectionLabel = content?.sectionLabel ?? "COMMUNITY";
  const heading = content?.heading ?? "Join Our Growing Community";
  const description = content?.description ?? "Connect with fellow HPC alumni on Telegram. Share opportunities, discuss ideas, and stay updated with the latest news from your alma mater.";
  const telegramUrl = content?.telegramUrl ?? "https://t.me/hpcalumni";
  const facebookUrl = content?.facebookUrl ?? "https://facebook.com/hpcalumni";
  const stats = content?.stats
    ? content.stats.map((s: any, i: number) => ({
        icon: getLandingIcon(s.iconKey, iconMap[s.label] || [Users, Globe, MessageCircle, Send][i % 4]),
        value: s.value,
        label: s.label,
      }))
    : defaultStats;

  const telegramButtonLabel = content?.telegramButtonLabel ?? "Join Telegram Group";
  const facebookButtonLabel = content?.facebookButtonLabel ?? "Facebook Group";

  return (
    <section id="community" className="relative overflow-hidden border-t border-border/60 bg-background py-14 md:py-16">
      <div className="layout-container relative">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <p className="fs-eyebrow mb-2 font-semibold tracking-wider text-primary">{sectionLabel}</p>
            <h2 className="mb-5 fs-title font-bold tracking-tight text-foreground">
              {heading}
            </h2>
            <p className="mb-6 fs-banner-message-body text-landing-description text-pretty text-justify [text-align-last:left] hyphens-none break-normal [word-break:normal] [overflow-wrap:normal]">{description}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fs-button-text inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] active:scale-[0.97]"
              >
                <Send size={16} /> {telegramButtonLabel}
              </a>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fs-button-text inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 font-semibold text-primary transition-all hover:bg-muted shadow-sm active:scale-[0.97]"
              >
                {facebookButtonLabel} <ArrowRight size={16} />
              </a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-2 gap-4">
            {stats.map((stat: any, i: number) => (
              <div key={stat.label} className="group rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/50">
                <stat.icon size={24} className={`mx-auto mb-3 ${statIconColors[i % 4]}`} />
                <p className="fs-stat-lg font-mono font-bold text-foreground">{stat.value}</p>
                <p className="fs-ui mt-1 font-medium text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
