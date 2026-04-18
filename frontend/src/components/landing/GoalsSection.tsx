import { motion } from "framer-motion";
import { Eye, Compass, Target, Heart } from "lucide-react";
import { getLandingIcon } from "@/lib/landingIcons";

const defaultGoals = [
  {
    icon: Eye,
    title: "Vision",
    description:
      "HPC Alumni Association (Hamdard Public College Alumni Association - হামদার্দ পাবলিক কলেজ অ্যালামনাই অ্যাসোসিয়েশন) aims to become the most connected and impactful alumni network in Bangladesh, bringing together all HPC alumni to build lifelong relationships, leadership, and opportunities across the country and beyond.",
    color: "from-cyan-600 to-blue-700",
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/15 group-hover:bg-cyan-400/20",
  },
  {
    icon: Compass,
    title: "Mission",
    description:
      "The mission of HPC Alumni Association is to reconnect every Hamdard Public College (HPC) graduate, support current students through mentorship and guidance, and strengthen the college's growth, reputation, and alumni network both nationally and globally.",
    color: "from-orange-600 to-amber-600",
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/15 group-hover:bg-orange-400/20",
  },
  {
    icon: Target,
    title: "Goals",
    description:
      "HPC Alumni Network focuses on building a strong and active alumni community by reaching over 5,000 members, launching scholarship programs, organizing alumni reunions and networking events, and creating a job placement and career support platform for Hamdard Public College alumni in Bangladesh.",
    color: "from-orange-500 to-amber-600",
    iconColor: "text-orange-300",
    iconBg: "bg-orange-500/15 group-hover:bg-orange-400/20",
  },
  {
    icon: Heart,
    title: "Values",
    description:
      "HPC Alumni Association believes in brotherhood, unity, academic excellence, social responsibility, leadership, and giving back to the community, fostering a strong connection among Hamdard Public College alumni (HPC Alumni BD) and contributing positively to society.",
    color: "from-rose-600 to-amber-500",
    iconColor: "text-rose-300",
    iconBg: "bg-rose-500/15 group-hover:bg-rose-400/20",
  },
];

const iconMap: Record<string, any> = { Vision: Eye, Mission: Compass, Goals: Target, Values: Heart };
const colorMap: Record<string, string> = {
  Vision: "from-cyan-600 to-blue-700",
  Mission: "from-orange-600 to-amber-600",
  Goals: "from-orange-500 to-amber-600",
  Values: "from-rose-600 to-amber-500",
};
const iconColorMap: Record<string, string> = {
  Vision: "text-cyan-400",
  Mission: "text-orange-400",
  Goals: "text-orange-300",
  Values: "text-rose-300",
};
const iconBgMap: Record<string, string> = {
  Vision: "bg-cyan-500/15 group-hover:bg-cyan-400/20",
  Mission: "bg-orange-500/15 group-hover:bg-orange-400/20",
  Goals: "bg-orange-500/15 group-hover:bg-orange-400/20",
  Values: "bg-rose-500/15 group-hover:bg-rose-400/20",
};

interface GoalsProps { content?: Record<string, any>; }

const GoalsSection = ({ content }: GoalsProps) => {
  const sectionLabel = content?.sectionLabel ?? "OUR PURPOSE";
  const heading = content?.heading ?? "Vision, Mission & Goals";
  const goals = content?.items
    ? content.items.map((g: any, i: number) => ({
        icon: getLandingIcon(g.iconKey, iconMap[g.title] || [Eye, Compass, Target, Heart][i % 4]),
        title: g.title,
        description: g.description,
        color: colorMap[g.title] || defaultGoals[i % 4].color,
        iconColor: iconColorMap[g.title] || defaultGoals[i % 4].iconColor,
        iconBg: iconBgMap[g.title] || defaultGoals[i % 4].iconBg,
      }))
    : defaultGoals;

  return (
    <section id="goals" className="border-t border-border/60 bg-background py-14 md:py-16">
      <div className="layout-container">
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }} className="mb-12 text-center">
          <p className="font-outfit-section fs-eyebrow mb-2 font-semibold tracking-wider text-primary">{sectionLabel}</p>
          <h2 className="font-outfit-section fs-title font-bold tracking-tight text-foreground">
            {heading}
          </h2>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {goals.map((goal: any, i: number) => (
            <motion.div
              key={goal.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 320, damping: 28, delay: i * 0.06 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="landing-rgbro-glass-card group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-shadow duration-300 hover:shadow-[0_20px_48px_-12px_rgba(255,149,0,0.22),0_16px_40px_-14px_rgba(0,209,255,0.18)]"
            >
              <div className="absolute left-0 right-0 top-0 h-1 bg-[linear-gradient(90deg,#00d1ff,#ff9100,#ffb800,#ffd600)]" />
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 transition-colors duration-300 group-hover:bg-orange-500/15">
                <goal.icon size={24} className="text-cyan-400 transition-colors group-hover:text-orange-300" />
              </div>
              <h3 className="fs-card-title-lg mb-2 font-bold text-foreground">{goal.title}</h3>
              <p className="fs-ui text-landing-description text-justify">{goal.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GoalsSection;
