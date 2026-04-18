import { motion } from "framer-motion";
import { Microscope, BookOpenCheck, Monitor, Dumbbell, Music } from "lucide-react";

const defaultFacilities = [
  { icon: Microscope, label: "Science Labs" },
  { icon: BookOpenCheck, label: "Library" },
  { icon: Monitor, label: "ICT Lab" },
  { icon: Dumbbell, label: "Sports" },
  { icon: Music, label: "Auditorium" },
];

const defaultClubs = ["Science Club", "Debate Club", "Photography Club", "IT Club", "Business Club", "Sports Club", "Language Club", "Quiz Club", "Cultural Club", "Art Club", "Band Club", "Math Club"];

const defaultActivities = [
  { title: "Cultural", items: ["Debate competitions", "Drama & recitation", "Music festivals", "Annual cultural week"] },
  { title: "Academic", items: ["Science fair", "Quiz competitions", "Academic seminars", "Olympiad participation"] },
  { title: "Sports", items: ["Football & Cricket", "Volleyball & Basketball", "Indoor games", "Annual sports week"] },
];

const facilityIconMap: Record<string, any> = { "Science Labs": Microscope, Library: BookOpenCheck, "ICT Lab": Monitor, Sports: Dumbbell, Auditorium: Music };

interface CampusProps { content?: Record<string, any>; }

const CampusSection = ({ content }: CampusProps) => {
  const sectionLabel = content?.sectionLabel ?? "CAMPUS LIFE";
  const heading = content?.heading ?? "Beyond the Classroom";
  const facilityNames = content?.facilities ?? defaultFacilities.map((f) => f.label);
  const facilities = facilityNames.map((name: string) => ({ icon: facilityIconMap[name] || Microscope, label: name }));
  const clubs = content?.clubs ?? defaultClubs;
  const activities = content?.activities ?? defaultActivities;
  const sectionSubheadingClass = "font-outfit-section fs-card-title mb-4 font-semibold tracking-tight text-foreground";
  const activityTitleClass = "font-outfit-section fs-eyebrow mb-3 font-semibold tracking-wider text-primary";

  return (
    <section id="campus" className="border-t border-border/60 bg-background py-14 md:py-16">
      <div className="layout-container">
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }} className="mb-12">
          <p className="fs-eyebrow mb-2 font-semibold tracking-wider text-primary font-outfit-section">{sectionLabel}</p>
          <h2 className="fs-title font-bold tracking-tight text-foreground font-outfit-section">{heading}</h2>
        </motion.div>

        <div className="space-y-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}>
              <h3 className={sectionSubheadingClass}>Facilities</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {facilities.map((f: any) => (
                  <div key={f.label} className="group flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm transition-all duration-300 hover:border-primary/35 hover:shadow-md sm:gap-3 sm:px-4 sm:py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                      <f.icon size={16} className="text-primary" />
                    </div>
                    <span className="fs-body min-w-0 break-words font-medium leading-snug text-foreground [overflow-wrap:anywhere]">{f.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05, ease: [0.2, 0, 0, 1] }}>
              <h3 className={sectionSubheadingClass}>Student Clubs & Organizations</h3>
              <div className="flex flex-wrap gap-2">
                {clubs.map((club: string) => (
                  <span key={club} className="fs-body max-w-full min-w-0 break-words rounded-full border border-border bg-card px-3 py-1.5 font-medium text-landing-description shadow-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground [overflow-wrap:anywhere]">{club}</span>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-px md:overflow-hidden md:rounded-xl md:border md:border-border md:bg-muted md:shadow-sm"
          >
            {activities.map((cat: any) => (
              <div key={cat.title} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors hover:bg-muted/30 md:rounded-none md:border-0 md:shadow-none">
                <div className="p-4 sm:p-5 md:p-6">
                  <h4 className={activityTitleClass}>{cat.title.toUpperCase()}</h4>
                  <ul className="space-y-2">
                    {cat.items.map((item: string) => (
                      <li key={item} className="fs-body break-words leading-relaxed text-landing-description [overflow-wrap:anywhere]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CampusSection;
