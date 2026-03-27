import { useState, useEffect } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useLandingContent, useSaveLandingContent, useDeleteLandingContent } from "@/hooks/useLandingContent";

const sections = [
  { key: "hero", label: "Hero" },
  { key: "about", label: "About" },
  { key: "goals", label: "Goals" },
  { key: "features", label: "Features" },
  { key: "academics", label: "Academics" },
  { key: "campus", label: "Campus" },
  { key: "community", label: "Community" },
  { key: "join", label: "Join" },
  { key: "contact", label: "Contact" },
  { key: "footer", label: "Footer" },
];

// Default content for each section
const defaults: Record<string, Record<string, any>> = {
  hero: {
    badge: "EIIN: 134209",
    headline: "HPC Alumni Association – Connecting Alumni for Life",
    description:
      "Hamdard Public College Alumni Association connects graduates across Bangladesh. Join our growing network to build connections, share achievements, and create opportunities for the future. Official HPC Alumni Network for students, Teacher, professionals, and community leaders.",
    ctaPrimary: "Join the Network",
    ctaSecondary: "Learn More",
    motto: "HAMDARD PUBLIC COLLEGE, DHAKA",
    stats: [
      { label: "Est.", value: "2010" },
      { label: "Alumni", value: "1,500+" },
      { label: "Location", value: "Panthapath, Dhaka" },
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
      { title: "Connect Alumni", description: "Reconnect former students of Hamdard Public College across the globe." },
      { title: "Mentorship", description: "Support current students with career guidance and university advice." },
      { title: "Professional Network", description: "Build collaborative relationships between alumni and the college." },
      { title: "Promote Values", description: "Uphold the academic excellence and reputation of HPC." },
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
      },
      {
        title: "Mission",
        description:
          "The mission of HPC Alumni Association is to reconnect every Hamdard Public College (HPC) graduate, support current students through mentorship and guidance, and strengthen the college's growth, reputation, and alumni network both nationally and globally.",
      },
      {
        title: "Goals",
        description:
          "HPC Alumni Network focuses on building a strong and active alumni community by reaching over 5,000 members, launching scholarship programs, organizing alumni reunions and networking events, and creating a job placement and career support platform for Hamdard Public College alumni in Bangladesh.",
      },
      {
        title: "Values",
        description:
          "HPC Alumni Association believes in brotherhood, unity, academic excellence, social responsibility, leadership, and giving back to the community, fostering a strong connection among Hamdard Public College alumni (HPC Alumni BD) and contributing positively to society.",
      },
    ],
  },
  features: {
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
  community: {
    sectionLabel: "COMMUNITY",
    heading: "Join Our Growing Community",
    description: "Connect with fellow HPC alumni on Telegram. Share opportunities, discuss ideas, and stay updated with the latest news from your alma mater.",
    telegramUrl: "https://t.me/hpcalumni",
    facebookUrl: "https://facebook.com/hpcalumni",
    stats: [
      { value: "1,500+", label: "Alumni Members" },
      { value: "15+", label: "Countries" },
      { value: "500+", label: "Active on Telegram" },
      { value: "50+", label: "Events Hosted" },
    ],
  },
  join: {
    sectionLabel: "Become an Alumni",
    heading: "Join Our Alumni Network",
    description: "Former student of Hamdard Public College? Register today to connect with over 1,500 alumni, access exclusive events, elections, and stay updated with the community.",
    ctaPrimary: "Register Now",
    ctaSecondary: "Already a member? Login",
  },
  contact: {
    sectionLabel: "CONTACT US",
    heading: "Get in Touch",
    description: "Whether you're a prospective student, alumni member, or just curious about HPC, we'd love to hear from you. Reach out through any of the channels below.",
    contactInfo: [
      { label: "Address", value: "23/G/7 Panthapath, Dhaka-1205, Bangladesh" },
      { label: "Phone", value: "01817509896 / +8802-9614540" },
      { label: "Email", value: "info@hamdardpsc.org" },
      { label: "Website", value: "hamdardpubliccollege.edu.bd" },
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
  },
};

// Generic array editor
const ArrayEditor = ({
  items,
  fields,
  onChange,
  addLabel = "Add Item",
}: {
  items: any[];
  fields: { key: string; label: string; type?: "text" | "textarea" }[];
  onChange: (items: any[]) => void;
  addLabel?: string;
}) => {
  const addItem = () => {
    const newItem: any = {};
    fields.forEach((f) => (newItem[f.key] = ""));
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
        <div key={idx} className="flex gap-2 items-start p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex-1 space-y-2">
            {fields.map((f) => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={item[f.key] || ""}
                    onChange={(e) => updateItem(idx, f.key, e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                ) : (
                  <Input
                    value={item[f.key] || ""}
                    onChange={(e) => updateItem(idx, f.key, e.target.value)}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="shrink-0 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
        <Plus className="w-3.5 h-3.5" /> {addLabel}
      </Button>
    </div>
  );
};

// String list editor
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
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    ))}
    <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])} className="gap-1">
      <Plus className="w-3.5 h-3.5" /> {addLabel}
    </Button>
  </div>
);

// Section editor components
const SectionEditor = ({
  sectionKey,
  content,
  onSave,
  onReset,
  saving,
}: {
  sectionKey: string;
  content: Record<string, any>;
  onSave: (content: Record<string, any>) => void;
  onReset: () => void;
  saving: boolean;
}) => {
  const [data, setData] = useState<Record<string, any>>(content);

  useEffect(() => {
    setData(content);
  }, [content]);

  const set = (key: string, value: any) => setData((prev) => ({ ...prev, [key]: value }));

  const renderFields = () => {
    switch (sectionKey) {
      case "hero":
        return (
          <div className="space-y-4">
            <div><Label>Badge Text</Label><Input value={data.badge || ""} onChange={(e) => set("badge", e.target.value)} className="mt-1" /></div>
            <div><Label>Headline</Label><Textarea value={data.headline || ""} onChange={(e) => set("headline", e.target.value)} className="mt-1" rows={2} /></div>
            <div><Label>Description</Label><Textarea value={data.description || ""} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Primary CTA</Label><Input value={data.ctaPrimary || ""} onChange={(e) => set("ctaPrimary", e.target.value)} className="mt-1" /></div>
              <div><Label>Secondary CTA</Label><Input value={data.ctaSecondary || ""} onChange={(e) => set("ctaSecondary", e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label>Motto</Label><Input value={data.motto || ""} onChange={(e) => set("motto", e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Stats</Label>
              <ArrayEditor items={data.stats || []} fields={[{ key: "label", label: "Label" }, { key: "value", label: "Value" }]} onChange={(v) => set("stats", v)} addLabel="Add Stat" />
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <div><Label>Section Label</Label><Input value={data.sectionLabel || ""} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" /></div>
            <div><Label>Heading</Label><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Paragraphs</Label>
              <StringListEditor items={data.paragraphs || []} onChange={(v) => set("paragraphs", v)} addLabel="Add Paragraph" />
            </div>
            <div>
              <Label>Objectives</Label>
              <ArrayEditor items={data.objectives || []} fields={[{ key: "title", label: "Title" }, { key: "description", label: "Description", type: "textarea" }]} onChange={(v) => set("objectives", v)} addLabel="Add Objective" />
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-4">
            <div><Label>Section Label</Label><Input value={data.sectionLabel || ""} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" /></div>
            <div><Label>Heading</Label><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Items (Vision, Mission, Goals, Values)</Label>
              <ArrayEditor items={data.items || []} fields={[{ key: "title", label: "Title" }, { key: "description", label: "Description", type: "textarea" }]} onChange={(v) => set("items", v)} addLabel="Add Item" />
            </div>
          </div>
        );

      case "features":
        return (
          <div className="space-y-4">
            <div><Label>Section Label</Label><Input value={data.sectionLabel || ""} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" /></div>
            <div><Label>Heading</Label><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} className="mt-1" /></div>
            <div><Label>Subtitle</Label><Textarea value={data.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className="mt-1" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Summary Number</Label><Input value={data.summaryNumber || ""} onChange={(e) => set("summaryNumber", e.target.value)} className="mt-1" /></div>
              <div><Label>Summary Text</Label><Input value={data.summaryText || ""} onChange={(e) => set("summaryText", e.target.value)} className="mt-1" /></div>
            </div>
          </div>
        );

      case "academics":
        return (
          <div className="space-y-4">
            <div><Label>Section Label</Label><Input value={data.sectionLabel || ""} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" /></div>
            <div><Label>Heading</Label><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Study Groups</Label>
              <ArrayEditor items={data.groups || []} fields={[{ key: "title", label: "Title" }, { key: "description", label: "Description", type: "textarea" }]} onChange={(v) => set("groups", v)} addLabel="Add Group" />
            </div>
            <div>
              <Label>Achievements</Label>
              <ArrayEditor items={data.achievements || []} fields={[{ key: "value", label: "Value" }, { key: "label", label: "Label" }]} onChange={(v) => set("achievements", v)} addLabel="Add Achievement" />
            </div>
          </div>
        );

      case "campus":
        return (
          <div className="space-y-4">
            <div><Label>Section Label</Label><Input value={data.sectionLabel || ""} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" /></div>
            <div><Label>Heading</Label><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Facilities</Label>
              <StringListEditor items={data.facilities || []} onChange={(v) => set("facilities", v)} addLabel="Add Facility" />
            </div>
            <div>
              <Label>Clubs</Label>
              <StringListEditor items={data.clubs || []} onChange={(v) => set("clubs", v)} addLabel="Add Club" />
            </div>
            <div>
              <Label>Activity Categories</Label>
              {(data.activities || []).map((act: any, idx: number) => (
                <div key={idx} className="mt-2 p-3 border border-border rounded-lg space-y-2">
                  <div className="flex gap-2 items-center">
                    <Input value={act.title || ""} onChange={(e) => {
                      const updated = [...(data.activities || [])];
                      updated[idx] = { ...updated[idx], title: e.target.value };
                      set("activities", updated);
                    }} placeholder="Category title" className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => set("activities", (data.activities || []).filter((_: any, i: number) => i !== idx))} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <StringListEditor items={act.items || []} onChange={(items) => {
                    const updated = [...(data.activities || [])];
                    updated[idx] = { ...updated[idx], items };
                    set("activities", updated);
                  }} addLabel="Add Activity" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("activities", [...(data.activities || []), { title: "", items: [] }])} className="mt-2 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Category
              </Button>
            </div>
          </div>
        );

      case "community":
        return (
          <div className="space-y-4">
            <div><Label>Section Label</Label><Input value={data.sectionLabel || ""} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" /></div>
            <div><Label>Heading</Label><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={data.description || ""} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telegram URL</Label><Input value={data.telegramUrl || ""} onChange={(e) => set("telegramUrl", e.target.value)} className="mt-1" /></div>
              <div><Label>Facebook URL</Label><Input value={data.facebookUrl || ""} onChange={(e) => set("facebookUrl", e.target.value)} className="mt-1" /></div>
            </div>
            <div>
              <Label>Stats</Label>
              <ArrayEditor items={data.stats || []} fields={[{ key: "value", label: "Value" }, { key: "label", label: "Label" }]} onChange={(v) => set("stats", v)} addLabel="Add Stat" />
            </div>
          </div>
        );

      case "join":
        return (
          <div className="space-y-4">
            <div><Label>Badge Label</Label><Input value={data.sectionLabel || ""} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" /></div>
            <div><Label>Heading</Label><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={data.description || ""} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Primary CTA</Label><Input value={data.ctaPrimary || ""} onChange={(e) => set("ctaPrimary", e.target.value)} className="mt-1" /></div>
              <div><Label>Secondary CTA</Label><Input value={data.ctaSecondary || ""} onChange={(e) => set("ctaSecondary", e.target.value)} className="mt-1" /></div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4">
            <div><Label>Section Label</Label><Input value={data.sectionLabel || ""} onChange={(e) => set("sectionLabel", e.target.value)} className="mt-1" /></div>
            <div><Label>Heading</Label><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={data.description || ""} onChange={(e) => set("description", e.target.value)} className="mt-1" rows={3} /></div>
            <div>
              <Label>Contact Info</Label>
              <ArrayEditor items={data.contactInfo || []} fields={[{ key: "label", label: "Label" }, { key: "value", label: "Value" }]} onChange={(v) => set("contactInfo", v)} addLabel="Add Contact" />
            </div>
            <div>
              <Label>Administration</Label>
              <ArrayEditor items={data.administration || []} fields={[{ key: "role", label: "Role" }, { key: "name", label: "Name" }]} onChange={(v) => set("administration", v)} addLabel="Add Person" />
            </div>
            <div>
              <Label>Quick Info</Label>
              <ArrayEditor items={data.quickInfo || []} fields={[{ key: "label", label: "Label" }, { key: "value", label: "Value" }]} onChange={(v) => set("quickInfo", v)} addLabel="Add Info" />
            </div>
          </div>
        );

      case "footer":
        return (
          <div className="space-y-4">
            <div><Label>College Name</Label><Input value={data.collegeName || ""} onChange={(e) => set("collegeName", e.target.value)} className="mt-1" /></div>
            <div><Label>Motto</Label><Input value={data.motto || ""} onChange={(e) => set("motto", e.target.value)} className="mt-1" /></div>
            <div><Label>Copyright Text</Label><Input value={data.copyright || ""} onChange={(e) => set("copyright", e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telegram URL</Label><Input value={data.telegramUrl || ""} onChange={(e) => set("telegramUrl", e.target.value)} className="mt-1" /></div>
              <div><Label>Facebook URL</Label><Input value={data.facebookUrl || ""} onChange={(e) => set("facebookUrl", e.target.value)} className="mt-1" /></div>
            </div>
            <div>
              <Label>Navigation Links</Label>
              <StringListEditor items={data.navLinks || []} onChange={(v) => set("navLinks", v)} addLabel="Add Link" />
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">No editor available for this section.</p>;
    }
  };

  return (
    <div className="space-y-4">
      {renderFields()}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button onClick={() => onSave(data)} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Reset to Default
        </Button>
      </div>
    </div>
  );
};

const AdminLandingEditor = () => {
  const { data: content, isLoading } = useLandingContent();
  const saveMutation = useSaveLandingContent();
  const deleteMutation = useDeleteLandingContent();

  const getContent = (key: string) => content?.[key] || defaults[key] || {};

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Landing Page Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit the content displayed on the public landing page.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs defaultValue="hero">
            <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
              {sections.map((s) => (
                <TabsTrigger key={s.key} value={s.key} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-3 py-1.5 text-sm">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((s) => (
              <TabsContent key={s.key} value={s.key}>
                <Card>
                  <CardHeader>
                    <CardTitle>{s.label} Section</CardTitle>
                    <CardDescription>Edit the {s.label.toLowerCase()} section content. Changes will appear immediately on the landing page.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SectionEditor
                      sectionKey={s.key}
                      content={getContent(s.key)}
                      onSave={(data) => saveMutation.mutate({ sectionKey: s.key, content: data })}
                      onReset={() => deleteMutation.mutate(s.key)}
                      saving={saveMutation.isPending}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default AdminLandingEditor;
