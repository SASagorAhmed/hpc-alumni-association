import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Globe } from "lucide-react";
import { getLandingIcon } from "@/lib/landingIcons";

const defaultContactInfo = [
  { icon: MapPin, label: "Address", value: "23/G/7 Panthapath, Dhaka-1205, Bangladesh" },
  { icon: Phone, label: "Phone", value: "01817509896 / +8802-9614540" },
  { icon: Mail, label: "Email", value: "info@hamdardpsc.org" },
  { icon: Globe, label: "Website", value: "hamdardpubliccollege.edu.bd" },
];

const iconMap: Record<string, any> = { Address: MapPin, Phone: Phone, Email: Mail, Website: Globe };

const defaultAdmin = [
  { role: "Founder", name: "Dr. Hakim Md. Yousuf Harun Bhuiyan" },
  { role: "Chairman", name: "Lt. Gen. A.T.M. Zahirul Alam" },
  { role: "Principal (Acting)", name: "Md. Nazrul Islam" },
];

const defaultQuickInfo = [
  { label: "Board", value: "Dhaka" },
  { label: "EIIN", value: "134209" },
  { label: "College Code", value: "1170" },
  { label: "Type", value: "Private" },
];

interface ContactProps { content?: Record<string, any>; }

const ContactSection = ({ content }: ContactProps) => {
  const sectionLabel = content?.sectionLabel ?? "CONTACT US";
  const heading = content?.heading ?? "Get in Touch";
  const description = content?.description ?? "Whether you're a prospective student, alumni member, or just curious about HPC, we'd love to hear from you. Reach out through any of the channels below.";
  const contactInfo = content?.contactInfo
    ? content.contactInfo.map((c: any) => ({
        icon: getLandingIcon(c.iconKey, iconMap[c.label] || MapPin),
        label: c.label,
        value: c.value,
        href: typeof c.href === "string" && c.href.trim() ? c.href.trim() : undefined,
      }))
    : defaultContactInfo;
  const administration = content?.administration ?? defaultAdmin;
  const quickInfo = content?.quickInfo ?? defaultQuickInfo;

  return (
    <section id="contact" className="relative overflow-hidden border-t border-border/60 bg-background py-14 md:py-16">
      <div className="layout-container relative">
        <div className="grid gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}>
            <p className="fs-eyebrow mb-2 font-semibold tracking-wider text-primary">{sectionLabel}</p>
            <h2 className="mb-5 fs-title font-bold tracking-tight text-foreground">
              {heading}
            </h2>
            <p className="mb-6 fs-body text-muted-foreground text-pretty text-justify hyphens-auto">{description}</p>
            <div className="space-y-4">
              {contactInfo.map((info: any) => (
                <div key={info.label} className="group flex items-start gap-4 rounded-lg p-2 transition-all duration-300 hover:bg-muted">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                    <info.icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="fs-caption font-medium tracking-wider text-muted-foreground">{info.label.toUpperCase()}</p>
                    {info.href ? (
                      <a
                        href={info.href}
                        className="fs-card-title font-medium text-foreground hover:underline"
                        target={/^https?:\/\//i.test(info.href) ? "_blank" : undefined}
                        rel={/^https?:\/\//i.test(info.href) ? "noopener noreferrer" : undefined}
                      >
                        {info.value}
                      </a>
                    ) : (
                      <p className="fs-card-title font-medium text-foreground">{info.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05, ease: [0.2, 0, 0, 1] }} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="fs-eyebrow mb-4 font-semibold tracking-wider text-muted-foreground">ADMINISTRATION</h3>
              <div className="space-y-4">
                {administration.map((person: any) => (
                  <div key={person.role} className="flex items-center gap-3">
                    <div className="fs-ui flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary">
                      {person.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="fs-card-title font-semibold text-foreground">{person.name}</p>
                      <p className="fs-caption text-muted-foreground">{person.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="fs-eyebrow mb-3 font-semibold tracking-wider text-muted-foreground">QUICK INFO</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickInfo.map((item: any) => (
                  <div key={item.label}>
                    <p className="fs-caption font-medium tracking-wider text-muted-foreground">{item.label.toUpperCase()}</p>
                    <p className="fs-mono-stat font-mono font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
