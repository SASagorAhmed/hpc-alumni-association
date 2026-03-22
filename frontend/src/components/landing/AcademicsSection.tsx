import { motion } from "framer-motion";
import { FlaskConical, Briefcase, BookOpen, Trophy } from "lucide-react";

const defaultGroups = [
  { icon: FlaskConical, title: "Science", description: "Physics, Chemistry, Biology, Mathematics, and ICT with well-equipped laboratories." },
  { icon: Briefcase, title: "Business Studies", description: "Accounting, Business Organization, Finance, and Management curriculum." },
  { icon: BookOpen, title: "Humanities", description: "Bangla, English, History, Geography, and Social Science programs." },
];

const defaultAchievements = [
  { value: "19th", label: "Rank in Dhaka Board (2014)" },
  { value: "100%", label: "Pass Rate (2015–16)" },
  { value: "56+", label: "Experienced Faculty" },
  { value: "9/10", label: "Botany Olympiad Prizes" },
];

const iconMap: Record<string, any> = { Science: FlaskConical, "Business Studies": Briefcase, Humanities: BookOpen };

const cardIconColors = ["text-primary", "text-accent", "text-primary"];
const cardIconBgs = ["bg-primary/10 group-hover:bg-primary/20", "bg-accent/10 group-hover:bg-accent/20", "bg-primary/10 group-hover:bg-primary/20"];

interface AcademicsProps { content?: Record<string, any>; }

const AcademicsSection = ({ content }: AcademicsProps) => {
  const sectionLabel = content?.sectionLabel ?? "ACADEMICS";
  const heading = content?.heading ?? "Programs & Achievements";
  const groups = content?.groups
    ? content.groups.map((g: any, i: number) => ({ icon: iconMap[g.title] || [FlaskConical, Briefcase, BookOpen][i % 3], title: g.title, description: g.description }))
    : defaultGroups;
  const achievements = content?.achievements ?? defaultAchievements;

  return (
    <section id="academics" className="border-t border-border/60 bg-background py-14 md:py-16">
      <div className="layout-container">
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }} className="mb-12">
          <p className="fs-eyebrow mb-2 font-semibold tracking-wider text-primary" style={{ fontFamily: "'Outfit', sans-serif" }}>{sectionLabel}</p>
          <h2 className="fs-title font-bold tracking-tight text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{heading}</h2>
        </motion.div>

        <div className="mb-16 grid gap-4 md:grid-cols-3">
          {groups.map((group: any, i: number) => (
            <motion.div key={group.title} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05, ease: [0.2, 0, 0, 1] }} className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/50">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${cardIconBgs[i % 3]} transition-colors duration-300`}>
                <group.icon size={24} className={cardIconColors[i % 3]} />
              </div>
              <h3 className="fs-card-title-lg mb-2 font-semibold text-foreground">{group.title}</h3>
              <p className="fs-body text-muted-foreground max-lg:text-justify max-lg:hyphens-auto">{group.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }} className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-muted shadow-sm md:grid-cols-4">
          {achievements.map((a: any) => (
            <div key={a.label} className="group flex flex-col items-center justify-center bg-card px-4 py-8 text-center transition-colors hover:bg-muted/60">
              <Trophy size={16} className="mb-2 text-primary" />
              <p className="font-mono text-2xl font-bold text-primary">{a.value}</p>
              <p className="fs-caption mt-1 font-medium text-muted-foreground">{a.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AcademicsSection;
