import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Briefcase, BadgeCheck, Phone, Mail, Hash, Facebook, Instagram, Linkedin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getInitials } from "@/data/members";
import { API_BASE_URL } from "@/api-production/api.js";

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBackToCommittee = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/#committee");
    }
  };

  const { data: member, isLoading } = useQuery({
    queryKey: ["committee-member", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/members/${id}`);
      if (!res.ok) throw new Error("Failed to load member");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Member not found</h1>
          <button
            type="button"
            onClick={handleBackToCommittee}
            className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft size={16} /> Back to Committee
          </button>
        </div>
      </div>
    );
  }

  const gmailHref = member.email
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(member.email)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-hpc pb-32 pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-6">
          <button
            type="button"
            onClick={handleBackToCommittee}
            className="mb-8 inline-flex items-center gap-2 rounded-full bg-background/20 px-4 py-2 text-sm font-medium text-foreground/80 backdrop-blur-sm transition-colors hover:bg-background/30"
          >
            <ArrowLeft size={16} /> Back to Committee
          </button>
        </div>
      </div>

      <div className="relative mx-auto -mt-24 max-w-4xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
        >
          <div className="flex flex-col items-center px-6 pb-8 pt-10 text-center sm:px-10">
            <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-hpc text-5xl font-bold text-accent-foreground shadow-2xl ring-4 ring-background overflow-hidden">
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(member.name)
              )}
            </div>
            <h1 className="mt-6 text-3xl font-bold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {member.name}
            </h1>
            <p className="mt-1 text-lg font-semibold text-primary">{member.designation}</p>
          </div>

          <div className="border-t border-border bg-muted/30 px-6 py-8 sm:px-10">
            <div className="grid gap-6 sm:grid-cols-2">
              <InfoItem icon={<GraduationCap size={20} className="text-primary" />} label="Batch" value={member.batch ?? "N/A"} />
              <InfoItem icon={<Hash size={20} className="text-primary" />} label="Alumni ID" value={(member as { alumni_id?: string }).alumni_id ?? "N/A"} />
              <InfoItem icon={<BadgeCheck size={20} className="text-primary" />} label="University name" value={member.institution ?? "N/A"} />
              <InfoItem icon={<Briefcase size={20} className="text-primary" />} label="Profession" value={(member as { profession?: string }).profession ?? "N/A"} />
              <InfoItem icon={<Briefcase size={20} className="text-primary" />} label="Job Status" value={member.job_status ?? "N/A"} />
              <InfoItem icon={<GraduationCap size={20} className="text-primary" />} label="College name" value={(member as { college_name?: string }).college_name ?? "N/A"} />
              <InfoItem icon={<Phone size={20} className="text-primary" />} label="Phone" value={(member as { phone?: string }).phone ?? "N/A"} />
              <InfoItem
                icon={<Mail size={20} className="text-primary" />}
                label="Email"
                value={
                  (member as { email?: string }).email && gmailHref ? (
                    <a href={gmailHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {(member as { email?: string }).email}
                    </a>
                  ) : (
                    "N/A"
                  )
                }
              />
            </div>
          </div>

        <div className="px-6 py-6 sm:px-10">
          <div className="flex items-center gap-4">
            {(member as any).facebook_url ? (
              <a
                href={(member as any).facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            ) : null}
            {(member as any).instagram_url ? (
              <a
                href={(member as any).instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            ) : null}
            {(member as any).linkedin_url ? (
              <a
                href={(member as any).linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            ) : null}
          </div>
        </div>
        </motion.div>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

export default MemberDetail;
