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

  return (
    <section id="campus" className="border-t border-border/60 bg-background py-14 md:py-16">
      <div className="layout-container">
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }} className="mb-12">
          <p className="fs-eyebrow mb-2 font-semibold tracking-wider text-primary" style={{ fontFamily: "'Outfit', sans-serif" }}>{sectionLabel}</p>
          <h2 className="fs-title font-bold tracking-tight text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{heading}</h2>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}>
            <h3 className="fs-card-title mb-4 font-semibold text-foreground">Facilities</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facilities.map((f: any) => (
                <div key={f.label} className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-all duration-300 hover:border-primary/35 hover:shadow-md">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                    <f.icon size={16} className="text-primary" />
                  </div>
                  <span className="fs-body font-medium text-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05, ease: [0.2, 0, 0, 1] }}>
            <h3 className="fs-card-title mb-4 font-semibold text-foreground">Student Clubs & Organizations</h3>
            <div className="flex flex-wrap gap-2">
              {clubs.map((club: string) => (
                <span key={club} className="fs-ui rounded-full border border-border bg-card px-3 py-1.5 font-medium text-muted-foreground shadow-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">{club}</span>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }} className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-muted shadow-sm sm:grid-cols-3">
          {activities.map((cat: any) => (
            <div key={cat.title} className="bg-card p-6 transition-colors hover:bg-muted/30">
              <h4 className="fs-eyebrow mb-3 font-semibold tracking-wider text-primary">{cat.title.toUpperCase()}</h4>
              <ul className="space-y-2">
                {cat.items.map((item: string) => (
                  <li key={item} className="fs-body text-muted-foreground max-lg:text-justify max-lg:hyphens-auto">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CampusSection;
