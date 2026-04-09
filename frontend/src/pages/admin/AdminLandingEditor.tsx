import { useState, useEffect } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RotateCcw, Plus, Trash2, LayoutTemplate } from "lucide-react";
import { useLandingContent, useSaveLandingContent, useDeleteLandingContent } from "@/hooks/useLandingContent";
import { LANDING_ICON_NAMES } from "@/lib/landingIcons";

/** Order matches `Index.tsx` (only CMS-driven blocks). Committee, achievements, memories load elsewhere. */
const sections: { key: string; label: string; hint: string }[] = [
  { key: "hero", label: "Hero", hint: "Top banner: headline, CTAs, stats row (icons optional)." },
  { key: "about", label: "About", hint: "Intro copy + objective cards (icon per card optional)." },
  { key: "goals", label: "Goals", hint: "Vision / mission / values grid (icon per card optional)." },
  {
    key: "features",
    label: "Features",
    hint: "Home teaser + CTA to /core-features. Full module grid is edited visually on the Core Features page (same CMS fields for intro & summary).",
  },
  { key: "notices", label: "Notices", hint: "Section title & description. Cards come from Admin → Notices (Public)." },
  { key: "academics", label: "Academics", hint: "Programs & achievement figures." },
  { key: "campus", label: "Campus", hint: "Facilities, clubs, activity categories." },
  { key: "community", label: "Community", hint: "Copy, Telegram/Facebook URLs, stat cards, button labels." },
  { key: "join", label: "Join", hint: "Registration CTA block; set button text and internal or external links." },
  { key: "contact", label: "Contact", hint: "Contact rows (optional link + icon). Administration & quick info." },
  { key: "footer", label: "Footer", hint: "Branding, nav labels, social links (Telegram, Facebook, optional Instagram)." },
];

const defaults: Record<string, Record<string, unknown>> = {
  hero: {
    badge: "EIIN: 134209",
    headline: "HPC Alumni Association – Connecting Alumni for Life",
    description:
      "Hamdard Public College Alumni Association connects graduates across Bangladesh. Join our growing network to build connections, share achievements, and create opportunities for the future. Official HPC Alumni Network for students, Teacher, professionals, and community leaders.",
    ctaPrimary: "Join the Network",
    ctaSecondary: "Learn More",
    ctaPrimaryHref: "/register",
    ctaSecondaryHref: "#about",
    motto: "HAMDARD PUBLIC COLLEGE, DHAKA",
    stats: [
      { label: "Est.", value: "2010", iconKey: "Calendar" },
      { label: "Alumni", value: "1,500+", iconKey: "Award" },
      { label: "Location", value: "Panthapath, Dhaka", iconKey: "MapPin" },
    ],
  },
  about: {
    sectionLabel: "ABOUT THE ASSOCIATION",
    heading: "Building a Legacy Together",
    paragraphs: [
      "The Hamdard Public College Alumni Network is a community of former students established to reconnect graduates, celebrate achievements, and support current students of the college.",
      "Since its establishment in 2010, HPC has produced many talented graduates who are now contributing across universities, companies, research institutions, and organizations throughout Bangladesh and abroad.",
      "Our vision is to build a global network of Hamdard Public College graduates who contribute to society and support the development of their alma mater.",
    ],
    objectives: [
      {
        title: "Connect Alumni",
        description: "Reconnect former students of Hamdard Public College across the globe.",
        iconKey: "Users",
      },
      {
        title: "Mentorship",
        description: "Support current students with career guidance and university advice.",
        iconKey: "GraduationCap",
      },
      {
        title: "Professional Network",
        description: "Build collaborative relationships between alumni and the college.",
        iconKey: "Handshake",
      },
      {
        title: "Promote Values",
        description: "Uphold the academic excellence and reputation of HPC.",
        iconKey: "Target",
      },
    ],
  },
  goals: {
    sectionLabel: "OUR PURPOSE",
    heading: "Vision, Mission & Goals",
    items: [
      {
        title: "Vision",
        description:
          "HPC Alumni Association (Hamdard Public College Alumni Association - হামদার্দ পাবলিক কলেজ অ্যালামনাই অ্যাসোসিয়েশন) aims to become the most connected and impactful alumni network in Bangladesh, bringing together all HPC alumni to build lifelong relationships, leadership, and opportunities across the country and beyond.",
        iconKey: "Eye",
      },
      {
        title: "Mission",
        description:
          "The mission of HPC Alumni Association is to reconnect every Hamdard Public College (HPC) graduate, support current students through mentorship and guidance, and strengthen the college's growth, reputation, and alumni network both nationally and globally.",
        iconKey: "Compass",
      },
      {
        title: "Goals",
        description:
          "HPC Alumni Network focuses on building a strong and active alumni community by reaching over 5,000 members, launching scholarship programs, organizing alumni reunions and networking events, and creating a job placement and career support platform for Hamdard Public College alumni in Bangladesh.",
        iconKey: "Target",
      },
      {
        title: "Values",
        description:
          "HPC Alumni Association believes in brotherhood, unity, academic excellence, social responsibility, leadership, and giving back to the community, fostering a strong connection among Hamdard Public College alumni (HPC Alumni BD) and contributing positively to society.",
        iconKey: "Heart",
      },
    ],
  },
  features: {
    teaserHeading: "Learn about this website",
    teaserBody:
      "To find out what this platform offers and how it works, open the Core Features section. There you will find a detailed overview of our platform and its capabilities — every major module in one place.",
    ctaLabel: "View Core Features",
    sectionLabel: "PLATFORM MODULES",
    heading: "Core Features of the Platform",
    subtitle: "22 integrated modules covering authentication, elections, committees, donations, and everything your alumni association needs.",
    summaryNumber: "22",
    summaryText: "Integrated Modules · One Powerful Platform",
  },
  academics: {
    sectionLabel: "ACADEMICS",
    heading: "Programs & Achievements",
    groups: [
      { title: "Science", description: "Physics, Chemistry, Biology, Mathematics, and ICT with well-equipped laboratories." },
      { title: "Business Studies", description: "Accounting, Business Organization, Finance, and Management curriculum." },
      { title: "Humanities", description: "Bangla, English, History, Geography, and Social Science programs." },
    ],
    achievements: [
      { value: "19th", label: "Rank in Dhaka Board (2014)" },
      { value: "100%", label: "Pass Rate (2015–16)" },
      { value: "56+", label: "Experienced Faculty" },
      { value: "9/10", label: "Botany Olympiad Prizes" },
    ],
  },
  campus: {
    sectionLabel: "CAMPUS LIFE",
    heading: "Beyond the Classroom",
    facilities: ["Science Labs", "Library", "ICT Lab", "Sports", "Auditorium"],
    clubs: ["Science Club", "Debate Club", "Photography Club", "IT Club", "Business Club", "Sports Club", "Language Club", "Quiz Club", "Cultural Club", "Art Club", "Band Club", "Math Club"],
    activities: [
      { title: "Cultural", items: ["Debate competitions", "Drama & recitation", "Music festivals", "Annual cultural week"] },
      { title: "Academic", items: ["Science fair", "Quiz competitions", "Academic seminars", "Olympiad participation"] },
      { title: "Sports", items: ["Football & Cricket", "Volleyball & Basketball", "Indoor games", "Annual sports week"] },
    ],
  },
  notices: {
    sectionLabel: "ANNOUNCEMENTS",
    heading: "Latest notices",
    description:
      "Official updates from the association. Only notices published with audience “Public” appear in this homepage section; members may see additional items after logging in.",
  },
  community: {
    sectionLabel: "COMMUNITY",
    heading: "Join Our Growing Community",
    description: "Connect with fellow HPC alumni on Telegram. Share opportunities, discuss ideas, and stay updated with the latest news from your alma mater.",
    telegramUrl: "https://t.me/hpcalumni",
    facebookUrl: "https://facebook.com/hpcalumni",
    telegramButtonLabel: "Join Telegram Group",
    facebookButtonLabel: "Facebook Group",
    stats: [
      { value: "1,500+", label: "Alumni Members", iconKey: "Users" },
      { value: "15+", label: "Countries", iconKey: "Globe" },
      { value: "500+", label: "Active on Telegram", iconKey: "MessageCircle" },
      { value: "50+", label: "Events Hosted", iconKey: "Send" },
    ],
  },
  join: {
    sectionLabel: "Become an Alumni",
    heading: "Join Our Alumni Network",
    description: "Former student of Hamdard Public College? Register today to connect with over 1,500 alumni, access exclusive events, elections, and stay updated with the community.",
    ctaPrimary: "Register Now",
    ctaSecondary: "Already a member? Login",
    ctaPrimaryHref: "/register",
    ctaSecondaryHref: "/login",
  },
  contact: {
    sectionLabel: "CONTACT US",
    heading: "Get in Touch",
    description: "Whether you're a prospective student, alumni member, or just curious about HPC, we'd love to hear from you. Reach out through any of the channels below.",
    contactInfo: [
      { label: "Address", value: "23/G/7 Panthapath, Dhaka-1205, Bangladesh", iconKey: "MapPin" },
      { label: "Phone", value: "01817509896 / +8802-9614540", iconKey: "Phone" },
      { label: "Email", value: "info@hamdardpsc.org", iconKey: "Mail", href: "mailto:info@hamdardpsc.org" },
      { label: "Website", value: "hamdardpubliccollege.edu.bd", iconKey: "Globe", href: "https://hamdardpubliccollege.edu.bd" },
    ],
    administration: [
      { role: "Founder", name: "Dr. Hakim Md. Yousuf Harun Bhuiyan" },
      { role: "Chairman", name: "Lt. Gen. A.T.M. Zahirul Alam" },
      { role: "Principal (Acting)", name: "Md. Nazrul Islam" },
    ],
    quickInfo: [
      { label: "Board", value: "Dhaka" },
      { label: "EIIN", value: "134209" },
      { label: "College Code", value: "1170" },
      { label: "Type", value: "Private" },
    ],
  },
  footer: {
    collegeName: "Hamdard Public College",
    motto: "Promoting Knowledge, Promoting Learning",
    copyright: "Hamdard Public College Alumni Association. Parent Organization: Hamdard Laboratories (Waqf) Bangladesh.",
    navLinks: ["About", "Committee", "Features", "Community", "Contact"],
    telegramUrl: "https://t.me/hpcalumni",
    facebookUrl: "https://facebook.com/hpcalumni",
    instagramUrl: "",
  },
};

type FieldDef = { key: string; label: string; type?: "text" | "textarea" | "icon" | "url" };

function IconKeySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const v = value?.trim() || "";
  return (
    <Select value={v || "__none"} onValueChange={(next) => onChange(next === "__none" ? "" : next)}>
      <SelectTrigger className="mt-1 h-9 text-xs">
        <SelectValue placeholder="Default (auto by title)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">Default (auto by title)</SelectItem>
        {LANDING_ICON_NAMES.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ArrayEditor = ({
  items,
  fields,
  onChange,
  addLabel = "Add Item",
}: {
  items: Record<string, unknown>[];
  fields: FieldDef[];
  onChange: (items: Record<string, unknown>[]) => void;
  addLabel?: string;
}) => {
  const addItem = () => {
    const newItem: Record<string, unknown> = {};
    fields.forEach((f) => {
      newItem[f.key] = f.type === "textarea" ? "" : "";
    });
    onChange([...items, newItem]);
  };

  const updateItem = (idx: number, key: string, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="min-w-0 flex-1 space-y-2">
            {fields.map((f) => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={String(item[f.key] ?? "")}
                    onChange={(e) => updateItem(idx, f.key, e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                ) : f.type === "icon" ? (
                  <IconKeySelect value={String(item[f.key] ?? "")} onChange={(v) => updateItem(idx, f.key, v)} />
                ) : f.type === "url" ? (
                  <Input
                    type="url"
                    value={String(item[f.key] ?? "")}
                    onChange={(e) => updateItem(idx, f.key, e.target.value)}
                    className="mt-1"
                    placeholder="https://… or mailto:…"
                  />
                ) : (
                  <Input
                    value={String(item[f.key] ?? "")}
                    onChange={(e) => updateItem(idx, f.key, e.target.value)}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="shrink-0 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
};

const StringListEditor = ({
  items,
  onChange,
  addLabel = "Add",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
}) => (
  <div className="space-y-2">
    {items.map((item, idx) => (
      <div key={idx} className="flex gap-2">
        <Input
          value={item}
          onChange={(e) => {
            const updated = [...items];
            updated[idx] = e.target.value;
            onChange(updated);
          }}
          className="flex-1"
        />
        <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, i) => i !== idx))} className="shrink-0 text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
    <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])} className="gap-1">
      <Plus className="h-3.5 w-3.5" /> {addLabel}
    </Button>
  </div>
);

const SectionEditor = ({
  sectionKey,
  content,
  onSave,
  onReset,
  saving,
}: {
  sectionKey: string;
  content: Record<string, unknown>;
  onSave: (content: Record<string, unknown>) => void;
  onReset: () => void;
  saving: boolean;
}) => {
  const [data, setData] = useState<Record<string, unknown>>(content);

  useEffect(() => {
    setData(content);
  }, [content]);

  const set = (key: string, value: unknown) => setData((prev) => ({ ...prev, [key]: value }));

  const renderFields = () => {
    switch (sectionKey) {
      case "hero":
        return (
          <div className="space-y-4">
            <div>
              <Label>Badge</Label>
              <Input value={String(data.badge ?? "")} onChange={(e) => set("badge", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Headline</Label>
              <Textarea value={String(data.headline ?? "")} onChange={(e) => set("headline", e.target.value)} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={String(data.description ?? "")} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Primary button text</Label>
                <Input value={String(data.ctaPrimary ?? "")} onChange={(e) => set("ctaPrimary", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Secondary button text</Label>
                <Input value={String(data.ctaSecondary ?? "")} onChange={(e) => set("ctaSecondary", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Primary link</Label>
                <Input
                  value={String(data.ctaPrimaryHref ?? "")}
                  onChange={(e) => set("ctaPrimaryHref", e.target.value)}
                  className="mt-1 font-mono text-xs"
                  placeholder="/register or https://…"
                />
                <p className="mt-1 text-[0.65rem] text-muted-foreground">App route (e.g. /register) or full URL.</p>
              </div>
              <div>
                <Label>Secondary link</Label>
                <Input
                  value={String(data.ctaSecondaryHref ?? "")}
                  onChange={(e) => set("ctaSecondaryHref", e.target.value)}
                  className="mt-1 font-mono text-xs"
                  placeholder="#about or /path"
                />
              </div>
            </div>
            <div>
              <Label>Motto (card on hero image)</Label>
              <Input value={String(data.motto ?? "")} onChange={(e) => set("motto", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Stats row</Label>
              <ArrayEditor
                items={(data.stats as Record<string, unknown>[]) || []}
                fields={[
                  { key: "label", label: "Label" },
                  { key: "value", label: "Value" },
                  { key: "iconKey", label: "Icon", type: "icon" },
                ]}
                onChange={(v) => set("stats", v)}
                addLabel="Add stat"
              />
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <div>
              <Label>Section label</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Paragraphs</Label>
              <StringListEditor items={(data.paragraphs as string[]) || []} onChange={(v) => set("paragraphs", v)} addLabel="Add paragraph" />
            </div>
            <div>
              <Label>Objectives (cards)</Label>
              <ArrayEditor
                items={(data.objectives as Record<string, unknown>[]) || []}
                fields={[
                  { key: "title", label: "Title" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "iconKey", label: "Icon", type: "icon" },
                ]}
                onChange={(v) => set("objectives", v)}
                addLabel="Add objective"
              />
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-4">
            <div>
              <Label>Section label</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Items</Label>
              <ArrayEditor
                items={(data.items as Record<string, unknown>[]) || []}
                fields={[
                  { key: "title", label: "Title" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "iconKey", label: "Icon", type: "icon" },
                ]}
                onChange={(v) => set("items", v)}
                addLabel="Add item"
              />
            </div>
          </div>
        );

      case "features":
        return (
          <div className="space-y-4">
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              The <strong className="text-foreground">home page</strong> shows a short teaser with a button to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">/core-features</code>. The{" "}
              <strong className="text-foreground">full module list</strong> uses the fields below (same copy on the Core Features page).
            </p>
            <div>
              <Label>Home teaser — heading</Label>
              <Input value={String(data.teaserHeading ?? "")} onChange={(e) => set("teaserHeading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Home teaser — body text</Label>
              <Textarea value={String(data.teaserBody ?? "")} onChange={(e) => set("teaserBody", e.target.value)} className="mt-1" rows={4} />
            </div>
            <div>
              <Label>Home teaser — button label</Label>
              <Input value={String(data.ctaLabel ?? "")} onChange={(e) => set("ctaLabel", e.target.value)} className="mt-1" placeholder="View Core Features" />
            </div>
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium text-foreground">Core Features page (full grid)</p>
            </div>
            <div>
              <Label>Section label (eyebrow)</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Textarea value={String(data.subtitle ?? "")} onChange={(e) => set("subtitle", e.target.value)} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Summary number</Label>
                <Input value={String(data.summaryNumber ?? "")} onChange={(e) => set("summaryNumber", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Summary text</Label>
                <Input value={String(data.summaryText ?? "")} onChange={(e) => set("summaryText", e.target.value)} className="mt-1" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Module cards are defined in code; you control headlines and the bottom summary strip.</p>
          </div>
        );

      case "academics":
        return (
          <div className="space-y-4">
            <div>
              <Label>Section label</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Study groups</Label>
              <ArrayEditor
                items={(data.groups as Record<string, unknown>[]) || []}
                fields={[
                  { key: "title", label: "Title" },
                  { key: "description", label: "Description", type: "textarea" },
                ]}
                onChange={(v) => set("groups", v)}
                addLabel="Add group"
              />
            </div>
            <div>
              <Label>Achievements</Label>
              <ArrayEditor
                items={(data.achievements as Record<string, unknown>[]) || []}
                fields={[
                  { key: "value", label: "Value" },
                  { key: "label", label: "Label" },
                ]}
                onChange={(v) => set("achievements", v)}
                addLabel="Add achievement"
              />
            </div>
          </div>
        );

      case "campus":
        return (
          <div className="space-y-4">
            <div>
              <Label>Section label</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Facilities</Label>
              <StringListEditor items={(data.facilities as string[]) || []} onChange={(v) => set("facilities", v)} addLabel="Add facility" />
            </div>
            <div>
              <Label>Clubs</Label>
              <StringListEditor items={(data.clubs as string[]) || []} onChange={(v) => set("clubs", v)} addLabel="Add club" />
            </div>
            <div>
              <Label>Activity categories</Label>
              {((data.activities as { title?: string; items?: string[] }[]) || []).map((act, idx) => (
                <div key={idx} className="mt-2 space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={act.title || ""}
                      onChange={(e) => {
                        const updated = [...((data.activities as typeof act[]) || [])];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        set("activities", updated);
                      }}
                      placeholder="Category title"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => set("activities", ((data.activities as typeof act[]) || []).filter((_, i) => i !== idx))}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <StringListEditor
                    items={act.items || []}
                    onChange={(items) => {
                      const updated = [...((data.activities as typeof act[]) || [])];
                      updated[idx] = { ...updated[idx], items };
                      set("activities", updated);
                    }}
                    addLabel="Add line"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => set("activities", [...((data.activities as { title: string; items: string[] }[]) || []), { title: "", items: [] }])}
                className="mt-2 gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add category
              </Button>
            </div>
          </div>
        );

      case "community":
        return (
          <div className="space-y-4">
            <div>
              <Label>Section label</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={String(data.description ?? "")} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Telegram URL</Label>
                <Input value={String(data.telegramUrl ?? "")} onChange={(e) => set("telegramUrl", e.target.value)} className="mt-1" type="url" />
              </div>
              <div>
                <Label>Facebook URL</Label>
                <Input value={String(data.facebookUrl ?? "")} onChange={(e) => set("facebookUrl", e.target.value)} className="mt-1" type="url" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Telegram button label</Label>
                <Input value={String(data.telegramButtonLabel ?? "")} onChange={(e) => set("telegramButtonLabel", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Facebook button label</Label>
                <Input value={String(data.facebookButtonLabel ?? "")} onChange={(e) => set("facebookButtonLabel", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Stat cards</Label>
              <ArrayEditor
                items={(data.stats as Record<string, unknown>[]) || []}
                fields={[
                  { key: "value", label: "Value" },
                  { key: "label", label: "Label" },
                  { key: "iconKey", label: "Icon", type: "icon" },
                ]}
                onChange={(v) => set("stats", v)}
                addLabel="Add stat"
              />
            </div>
          </div>
        );

      case "notices":
        return (
          <div className="space-y-4">
            <div>
              <Label>Section label</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={String(data.description ?? "")} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={4} />
            </div>
            <p className="text-xs text-muted-foreground">
              Cards are loaded from published notices with audience <strong className="text-foreground">Public</strong>. Edit entries under{" "}
              <strong className="text-foreground">Admin → Notices</strong>.
            </p>
          </div>
        );

      case "join":
        return (
          <div className="space-y-4">
            <div>
              <Label>Badge label</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={String(data.description ?? "")} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Primary button</Label>
                <Input value={String(data.ctaPrimary ?? "")} onChange={(e) => set("ctaPrimary", e.target.value)} className="mt-1" />
                <Input
                  value={String(data.ctaPrimaryHref ?? "")}
                  onChange={(e) => set("ctaPrimaryHref", e.target.value)}
                  className="mt-1 font-mono text-xs"
                  placeholder="Link"
                />
              </div>
              <div>
                <Label>Secondary button</Label>
                <Input value={String(data.ctaSecondary ?? "")} onChange={(e) => set("ctaSecondary", e.target.value)} className="mt-1" />
                <Input
                  value={String(data.ctaSecondaryHref ?? "")}
                  onChange={(e) => set("ctaSecondaryHref", e.target.value)}
                  className="mt-1 font-mono text-xs"
                  placeholder="Link"
                />
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4">
            <div>
              <Label>Section label</Label>
              <Input value={String(data.sectionLabel ?? "")} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Heading</Label>
              <Input value={String(data.heading ?? "")} onChange={(e) => set("heading", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={String(data.description ?? "")} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={3} />
            </div>
            <div>
              <Label>Contact rows</Label>
              <ArrayEditor
                items={(data.contactInfo as Record<string, unknown>[]) || []}
                fields={[
                  { key: "label", label: "Label" },
                  { key: "value", label: "Display text" },
                  { key: "href", label: "Optional link", type: "url" },
                  { key: "iconKey", label: "Icon", type: "icon" },
                ]}
                onChange={(v) => set("contactInfo", v)}
                addLabel="Add row"
              />
            </div>
            <div>
              <Label>Administration</Label>
              <ArrayEditor
                items={(data.administration as Record<string, unknown>[]) || []}
                fields={[
                  { key: "role", label: "Role" },
                  { key: "name", label: "Name" },
                ]}
                onChange={(v) => set("administration", v)}
                addLabel="Add person"
              />
            </div>
            <div>
              <Label>Quick info</Label>
              <ArrayEditor
                items={(data.quickInfo as Record<string, unknown>[]) || []}
                fields={[
                  { key: "label", label: "Label" },
                  { key: "value", label: "Value" },
                ]}
                onChange={(v) => set("quickInfo", v)}
                addLabel="Add row"
              />
            </div>
          </div>
        );

      case "footer":
        return (
          <div className="space-y-4">
            <div>
              <Label>College name</Label>
              <Input value={String(data.collegeName ?? "")} onChange={(e) => set("collegeName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Motto</Label>
              <Input value={String(data.motto ?? "")} onChange={(e) => set("motto", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Copyright line</Label>
              <Input value={String(data.copyright ?? "")} onChange={(e) => set("copyright", e.target.value)} className="mt-1" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Telegram URL</Label>
                <Input value={String(data.telegramUrl ?? "")} onChange={(e) => set("telegramUrl", e.target.value)} className="mt-1" type="url" />
              </div>
              <div>
                <Label>Facebook URL</Label>
                <Input value={String(data.facebookUrl ?? "")} onChange={(e) => set("facebookUrl", e.target.value)} className="mt-1" type="url" />
              </div>
              <div>
                <Label>Instagram URL (optional)</Label>
                <Input value={String(data.instagramUrl ?? "")} onChange={(e) => set("instagramUrl", e.target.value)} className="mt-1" type="url" placeholder="Leave empty to hide" />
              </div>
            </div>
            <div>
              <Label>Footer nav labels</Label>
              <p className="mb-1 text-[0.65rem] text-muted-foreground">Must match section IDs: About, Committee, Features, Community, Contact, etc.</p>
              <StringListEditor items={(data.navLinks as string[]) || []} onChange={(v) => set("navLinks", v)} addLabel="Add label" />
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">No editor for this key.</p>;
    }
  };

  return (
    <div className="space-y-4">
      {renderFields()}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button onClick={() => onSave(data)} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save section"}
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
      </div>
    </div>
  );
};

const AdminLandingEditor = () => {
  const { data: content, isLoading } = useLandingContent();
  const saveMutation = useSaveLandingContent();
  const deleteMutation = useDeleteLandingContent();

  const getContent = (key: string) => {
    const merged = { ...(defaults[key] as Record<string, unknown>), ...(content?.[key] as Record<string, unknown> | undefined) };
    return merged;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <LayoutTemplate className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Landing page content</h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Edit public homepage copy, buttons, links, and icons. Section order follows the live site (hero → … → footer). Committee, achievements carousel, and
            memories are managed in their own admin screens.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <Tabs defaultValue="hero" className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="lg:w-56 lg:shrink-0">
            <nav className="sticky top-4 rounded-xl border border-border bg-card p-2 shadow-sm">
              <p className="mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Sections</p>
              <TabsList className="flex h-auto w-full flex-col gap-0.5 bg-transparent p-0">
                {sections.map((s) => (
                  <TabsTrigger
                    key={s.key}
                    value={s.key}
                    className="w-full justify-start rounded-md px-3 py-2 text-left text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </nav>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            {sections.map((s) => (
              <TabsContent key={s.key} value={s.key} className="mt-0 space-y-3">
                <Card>
                  <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="text-lg">{s.label}</CardTitle>
                    <CardDescription>{s.hint}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SectionEditor
                      sectionKey={s.key}
                      content={getContent(s.key)}
                      onSave={(data) => saveMutation.mutate({ sectionKey: s.key, content: data as Record<string, unknown> })}
                      onReset={() => deleteMutation.mutate(s.key)}
                      saving={saveMutation.isPending}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}
    </div>
  );
};

export default AdminLandingEditor;
