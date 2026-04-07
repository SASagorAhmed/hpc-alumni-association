import { Link } from "react-router-dom";
import { useAdaptiveStaticHeadingLine } from "@/components/committee/committeeAdaptiveCardText";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";
import { motion } from "framer-motion";
import { GraduationCap, User, Crown, Mail, Phone, Hash } from "lucide-react";
import { Camera } from "lucide-react";

export interface CommitteeMemberRow {
  id: string;
  name: string;
  /** Optional shorter label for cards when full name is too long */
  name_short?: string | null;
  designation: string;
  category: string;
  batch: string | null;
  alumni_id?: string | null;
  phone?: string | null;
  email?: string | null;
  candidate_number?: string | null;
  institution: string | null;
  /** Optional shorter label for cards when full university name is too long */
  institution_short?: string | null;
  college_name?: string | null;
  job_status: string | null;
  profession?: string | null;
  about: string | null;
  wishing_message?: string | null;
  winner_about?: string | null;
  location: string | null;
  expertise: string | null;
  photo_url: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  display_order: number;
  is_active?: boolean;
}

export interface CommitteePostBlock {
  id: string;
  term_id: string;
  title: string;
  allows_multiple: number | boolean;
  is_highlight: number | boolean;
  display_order: number;
  /** Alumni board grouping: governing_body | executive_committee | committee_heads | committee_members */
  board_section?: string | null;
  members: CommitteeMemberRow[];
}

export interface CommitteeTermInfo {
  id: string;
  name: string;
  description: string | null;
  status?: string;
  is_current?: number | boolean;
}

export interface StructuredCommitteePayload {
  term: CommitteeTermInfo;
  posts: CommitteePostBlock[];
}

function bool(v: number | boolean | undefined) {
  return v === true || v === 1;
}

const MemberRow = ({
  member,
  highlighted,
  postTitle,
}: {
  member: CommitteeMemberRow;
  highlighted?: boolean;
  /** Committee post name (e.g. Bangla) — always shown under the member name */
  postTitle?: string;
}) => {
  const size = highlighted ? "min-w-[140px] w-[140px] h-[140px]" : "min-w-[120px] w-[120px] h-[120px]";
  const { ref: nameTitleRef, text: nameTitleDisplay } = useAdaptiveStaticHeadingLine(
    member.name,
    member.name_short,
    18
  );
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`flex w-full gap-4 sm:gap-6 rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md ${
        highlighted ? "border-amber-400/50 ring-1 ring-amber-400/30 bg-gradient-to-r from-amber-50/40 via-card to-emerald-50/30" : "border-border"
      }`}
    >
      <Link
        to={`/member/${member.id}`}
        className={`relative shrink-0 overflow-hidden rounded-2xl border-2 border-border/80 bg-muted ${size}`}
        onClick={() => saveNavScrollRestore()}
      >
        {member.photo_url ? (
          <img src={member.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Camera className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {highlighted && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <Crown className="h-3 w-3" /> Highlight
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <Link to={`/member/${member.id}`} className="group" onClick={() => saveNavScrollRestore()}>
          <h3
            ref={nameTitleRef}
            className="text-lg font-bold text-foreground transition-colors group-hover:text-primary"
            style={{ fontFamily: "'Outfit', sans-serif" }}
            title={member.name}
          >
            {nameTitleDisplay}
          </h3>
        </Link>
        {postTitle ? (
          <p className="text-base font-semibold text-primary leading-snug">{postTitle}</p>
        ) : (
          <p className="text-sm font-semibold text-primary/90">{member.designation}</p>
        )}
        {postTitle && member.designation && member.designation.trim() !== postTitle.trim() ? (
          <p className="text-sm text-muted-foreground">{member.designation}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {member.batch && (
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 shrink-0 text-emerald-600" />
              Batch {member.batch}
            </span>
          )}
          {member.alumni_id && (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              ID: {member.alumni_id}
            </span>
          )}
          {member.profession && (
            <span className="inline-flex items-center gap-1.5">{member.profession}</span>
          )}
        </div>
        {(member.phone || member.email) && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {member.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {member.phone}
              </span>
            )}
            {member.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {member.email}
              </span>
            )}
            {member.candidate_number && (
              <span className="inline-flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" /> {member.candidate_number}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
};

export function StructuredCommitteeDisplay({
  data,
  showIntro = true,
}: {
  data: StructuredCommitteePayload;
  showIntro?: boolean;
}) {
  const { term, posts: rawPosts } = data;
  const posts = [...rawPosts].sort((a, b) => Number(a.display_order) - Number(b.display_order));

  return (
    <div className="space-y-10">
      {showIntro && (
        <div className="text-center">
          <p className="mb-2 text-[13px] font-semibold tracking-wider text-amber-600" style={{ fontFamily: "'Outfit', sans-serif" }}>
            EXECUTIVE COMMITTEE
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {term.name}
          </h2>
          {term.description && <p className="mt-3 w-full max-w-none text-[15px] text-muted-foreground">{term.description}</p>}
        </div>
      )}

      <div className="space-y-10">
        {posts.map((post) => {
          const members = post.members || [];
          const postHighlight = bool(post.is_highlight);
          return (
            <section key={post.id} className="space-y-4">
              <div className="border-b border-border pb-2">
                <h3 className="text-xl font-bold text-foreground leading-snug" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {post.title}
                </h3>
                {!bool(post.allows_multiple) && (
                  <p className="text-xs text-muted-foreground">Single seat</p>
                )}
              </div>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground italic rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
                  No members assigned to this post yet.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {members.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      postTitle={post.title}
                      highlighted={postHighlight && members.indexOf(m) === 0}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
