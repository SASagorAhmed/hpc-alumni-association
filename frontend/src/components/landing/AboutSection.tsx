import { motion } from "framer-motion";
import { Target, Users, Handshake, GraduationCap } from "lucide-react";
import { getLandingIcon } from "@/lib/landingIcons";

const defaultObjectives = [
  { icon: Users, title: "Connect Alumni", description: "Reconnect former students of Hamdard Public College across the globe." },
  { icon: GraduationCap, title: "Mentorship", description: "Support current students with career guidance and university advice." },
  { icon: Handshake, title: "Professional Network", description: "Build collaborative relationships between alumni and the college." },
  { icon: Target, title: "Promote Values", description: "Uphold the academic excellence and reputation of HPC." },
];

const iconMap: Record<string, any> = { "Connect Alumni": Users, Mentorship: GraduationCap, "Professional Network": Handshake, "Promote Values": Target };

const iconColors = ["text-primary", "text-primary", "text-primary", "text-primary"];
const iconBgs = ["bg-primary/10 group-hover:bg-primary/15", "bg-primary/10 group-hover:bg-primary/15", "bg-primary/10 group-hover:bg-primary/15", "bg-primary/10 group-hover:bg-primary/15"];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0, 0, 1] as const } } };

interface AboutProps { content?: Record<string, any>; }

const AboutSection = ({ content }: AboutProps) => {
  const sectionLabel = content?.sectionLabel ?? "ABOUT THE ASSOCIATION";
  const heading = content?.heading ?? "Building a Legacy Together";
  const paragraphs = content?.paragraphs ?? [
    "The Hamdard Public College Alumni Network is a community of former students established to reconnect graduates, celebrate achievements, and support current students of the college.",
    "Since its establishment in 2010, HPC has produced many talented graduates who are now contributing across universities, companies, research institutions, and organizations throughout Bangladesh and abroad.",
    "Our vision is to build a global network of Hamdard Public College graduates who contribute to society and support the development of their alma mater.",
  ];
  const objectives = content?.objectives
    ? content.objectives.map((o: any, i: number) => ({
        icon: getLandingIcon(o.iconKey, iconMap[o.title] || [Users, GraduationCap, Handshake, Target][i % 4]),
        title: o.title,
        description: o.description,
      }))
    : defaultObjectives;

  return (
    <section id="about" className="bg-background py-14 md:py-16">
      <div className="layout-container">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid gap-12 lg:grid-cols-2">
          <motion.div variants={fadeUp}>
            <p className="font-outfit-section fs-eyebrow mb-2 font-semibold tracking-wider text-primary">{sectionLabel}</p>
            <h2 className="font-outfit-section mb-5 fs-title font-bold tracking-tight text-foreground">
              {heading.includes("Legacy") ? <>Building a <span className="text-primary">Legacy</span> Together</> : heading}
            </h2>
            <div className="space-y-3.5 fs-banner-message-body text-landing-description text-pretty [&_p]:text-justify [&_p]:[text-align-last:left] [&_p]:hyphens-none [&_p]:break-normal [&_p]:[word-break:normal] [&_p]:[overflow-wrap:normal]">
              {paragraphs.map((p: string, i: number) => <p key={i}>{p}</p>)}
            </div>
          </motion.div>
          <motion.div variants={stagger} className="grid gap-3 sm:grid-cols-2">
            {objectives.map((obj: any, i: number) => (
              <motion.div key={obj.title} variants={fadeUp} className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/35">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${iconBgs[i % 4]} transition-colors duration-300`}>
                  <obj.icon size={20} className={iconColors[i % 4]} />
                </div>
                <h3 className="fs-card-title mb-1 font-semibold text-foreground">{obj.title}</h3>
                <p className="fs-ui text-landing-description text-justify">{obj.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
