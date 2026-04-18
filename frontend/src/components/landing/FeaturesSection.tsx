import { motion } from "framer-motion";
import {
  KeyRound, MailCheck, Lock, ShieldCheck,
  UserCircle, Eye, Search,
  LayoutDashboard, Settings2,
  UsersRound, UserCog, ShieldAlert,
  Vote, UserPlus, CheckSquare, Trophy,
  Award, CalendarDays, Megaphone, FileText, BellRing,
  HeartHandshake, ClipboardList, Wrench,
  type LucideIcon,
} from "lucide-react";

interface Module { title: string; description: string; icon: LucideIcon; }
interface Category { name: string; icon: LucideIcon; gradient: string; iconBg: string; modules: Module[]; }

const categories: Category[] = [
  {
    name: "Access & Security", icon: ShieldCheck, gradient: "from-cyan-600 to-blue-700", iconBg: "bg-cyan-500/15 text-cyan-300",
    modules: [
      { title: "Authentication", description: "Register with email, OTP verification, alumni & admin login with session management.", icon: KeyRound },
      { title: "Email Verification", description: "Gmail OTP delivery, expiry timer, resend option, and verified account status.", icon: MailCheck },
      { title: "Password Management", description: "Forgot password flow, reset via OTP, change password after login.", icon: Lock },
      { title: "System Security", description: "Password hashing, login attempt protection, role-based access control.", icon: ShieldCheck },
    ],
  },
  {
    name: "Profile & Directory", icon: UserCircle, gradient: "from-amber-500 to-orange-600", iconBg: "bg-amber-500/15 text-amber-200",
    modules: [
      { title: "User Profile", description: "Photo, batch, department, profession, bio, university, and full contact details.", icon: UserCircle },
      { title: "Profile Privacy", description: "Admin-controlled visibility, profile change approvals, directory hiding.", icon: Eye },
      { title: "Alumni Directory", description: "Auto-generated directory with search by name, batch, department, profession, or company.", icon: Search },
    ],
  },
  {
    name: "Dashboards", icon: LayoutDashboard, gradient: "from-orange-600 to-amber-600", iconBg: "bg-orange-500/15 text-orange-300",
    modules: [
      { title: "Alumni Dashboard", description: "Welcome section, committee preview, notices, events, donations, election status.", icon: LayoutDashboard },
      { title: "Admin Dashboard", description: "User stats, committee terms, active elections, candidates, winners, and campaign status.", icon: Settings2 },
    ],
  },
  {
    name: "Organization", icon: UsersRound, gradient: "from-sky-600 to-indigo-700", iconBg: "bg-sky-500/15 text-sky-300",
    modules: [
      { title: "Committee Management", description: "Create terms, assign posts (President, মহাসচিব, etc.), manage members with photos and serial.", icon: UsersRound },
      { title: "User Management", description: "Approve, reject, block, unblock users. Promote to admin. View pending/verified/blocked lists.", icon: UserCog },
      { title: "Permissions & Approvals", description: "Content publishing control, profile edit approvals, visibility rules for all modules.", icon: ShieldAlert },
    ],
  },
  {
    name: "Elections", icon: Vote, gradient: "from-red-700 to-red-600", iconBg: "bg-red-100 text-red-700",
    modules: [
      { title: "Election System", description: "Create elections with title, term, start/end time. Stages: draft, scheduled, live, closed.", icon: Vote },
      { title: "Candidate Management", description: "Add candidates with photo, manifesto, alumni ID, batch, and assigned post.", icon: UserPlus },
      { title: "Voting System", description: "One vote per post, verified-only voting, secure storage, confirmation and locking.", icon: CheckSquare },
      { title: "Winner Management", description: "Publish winners with congratulations banner, displayed on dashboard and winner page.", icon: Trophy },
    ],
  },
  {
    name: "Content & Communication", icon: Megaphone, gradient: "from-sky-500 to-orange-600", iconBg: "bg-orange-500/15 text-orange-200",
    modules: [
      { title: "Achievements", description: "Post alumni achievements with photo, university, job title, and auto-sliding carousel.", icon: Award },
      { title: "Events", description: "Create events with banner, date, time, location. Publish/unpublish and cancel support.", icon: CalendarDays },
      { title: "Notices", description: "Official notices with attachments, pinned status, and dashboard visibility.", icon: Megaphone },
      { title: "Documents", description: "Upload constitution, forms, reports, meeting minutes. Users can view and download.", icon: FileText },
      { title: "Notifications", description: "Alerts for new notices, election start/end, events, donations, and achievements.", icon: BellRing },
    ],
  },
  {
    name: "Finance & System", icon: HeartHandshake, gradient: "from-amber-500 to-orange-600", iconBg: "bg-amber-500/15 text-amber-200",
    modules: [
      { title: "Donation System", description: "Campaigns with target amount, payment method, proof submission, and admin approval.", icon: HeartHandshake },
      { title: "Audit Logs", description: "Track all admin actions — approvals, blocks, elections, edits — with timestamps.", icon: ClipboardList },
      { title: "System Settings", description: "Configure committee posts, directory rules, voting rules, OTP, and email settings.", icon: Wrench },
    ],
  },
];

interface FeaturesProps { content?: Record<string, any>; }

const FeaturesSection = ({ content }: FeaturesProps) => {
  const sectionLabel = content?.sectionLabel ?? "PLATFORM MODULES";
  const heading = content?.heading ?? "Core Features of the Platform";
  const subtitle = content?.subtitle ?? "22 integrated modules covering authentication, elections, committees, donations, and everything your alumni association needs.";
  const summaryNumber = content?.summaryNumber ?? "22";
  const summaryText = content?.summaryText ?? "Integrated Modules · One Powerful Platform";

  return (
    <section id="features" className="bg-background py-16 md:py-20">
      <div className="layout-container">
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }} className="mb-16 text-center">
          <p className="fs-eyebrow mb-2 bg-gradient-to-r from-cyan-400 via-orange-400 to-amber-300 bg-clip-text font-semibold tracking-[0.2em] text-transparent font-outfit-section">{sectionLabel}</p>
          <h2 className="fs-title font-extrabold tracking-tight text-foreground font-outfit-section">
            {heading}
          </h2>
          <p className="fs-banner-message-body mx-auto mt-4 max-w-2xl text-landing-description text-justify [text-align-last:left] hyphens-none break-normal [word-break:normal] [overflow-wrap:normal]">
            {subtitle}
          </p>
        </motion.div>

        <div className="space-y-20">
          {categories.map((category, catIdx) => (
            <motion.div key={category.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: catIdx * 0.05 }}>
              <div className="mb-8 flex items-center gap-5">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${category.gradient} shadow-lg`}>
                  <category.icon size={26} className="text-white" />
                </div>
                <div className="flex flex-1 items-center gap-4">
                  <h3 className="fs-card-title-lg font-bold tracking-wide text-foreground font-outfit-section">{category.name}</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/40 via-orange-500/40 to-transparent" />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.modules.map((mod, i) => (
                  <motion.div key={mod.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-2">
                    <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition-all duration-300 group-hover:border-cyan-400/35" />
                    <div className="relative">
                      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${category.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                        <mod.icon size={22} />
                      </div>
                      <h4 className="fs-card-title mb-2 font-bold text-foreground font-outfit-section">{mod.title}</h4>
                      <p className="fs-ui text-landing-description text-justify">
                        {mod.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-16 flex justify-center">
          <div
            className="inline-flex items-center gap-3 rounded-full border border-white/10 px-8 py-4 text-white shadow-[0_0_28px_rgba(255,92,157,0.25),0_8px_32px_-8px_rgba(0,209,255,0.2)]"
            style={{
              background: "linear-gradient(115deg, #ff9a1a 0%, #ff7a00 35%, #ffb020 70%, #00d1ff 100%)",
            }}
          >
            <span className="fs-stat-xl font-extrabold text-white">{summaryNumber}</span>
            <span className="fs-ui font-semibold text-white/90">{summaryText}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
