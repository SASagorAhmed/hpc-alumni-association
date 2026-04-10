import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type NoticeEmailTemplateVariant = {
  subject_template: string;
  badge_label: string;
  greeting_template: string;
  cta_label: string;
  official_line_template: string;
  issued_label: string;
  portal_label: string;
  sent_by_template: string;
  office_subtitle: string;
  website_label: string;
  facebook_label: string;
  group_label: string;
};

export type NoticeEmailTemplateConfig = {
  urgent: NoticeEmailTemplateVariant;
  normal: NoticeEmailTemplateVariant;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: NoticeEmailTemplateConfig | null;
  loading?: boolean;
  saving?: boolean;
  resetting?: boolean;
  error?: string | null;
  onChange: (next: NoticeEmailTemplateConfig) => void;
  onSave: () => void;
  onReset: () => void;
};

const FIELD_HELP = [
  { key: "subject_template", label: "Subject template", help: "Must include {{title}}", multiline: false },
  { key: "badge_label", label: "Badge label", help: "Example: Urgent Notice / Official Notice", multiline: false },
  { key: "greeting_template", label: "Greeting template", help: "Must include {{recipient_name}}", multiline: false },
  { key: "cta_label", label: "CTA button text", help: "Button text for the notice link", multiline: false },
  { key: "official_line_template", label: "Official line", help: "Can include {{brand_name}}", multiline: true },
  { key: "issued_label", label: "Issued label", help: "Example: Issued", multiline: false },
  { key: "portal_label", label: "Portal label", help: "Example: Open notices portal", multiline: false },
  { key: "sent_by_template", label: "Sent-by template", help: "Must include {{president_name}}", multiline: false },
  { key: "office_subtitle", label: "Office subtitle", help: "Subtitle under signer line", multiline: true },
  { key: "website_label", label: "Website label", help: "Footer website text", multiline: false },
  { key: "facebook_label", label: "Facebook label", help: "Footer Facebook text", multiline: false },
  { key: "group_label", label: "Group label", help: "Footer alumni group text", multiline: false },
] as const;

function VariantFields({
  variantKey,
  config,
  onChange,
}: {
  variantKey: "urgent" | "normal";
  config: NoticeEmailTemplateConfig;
  onChange: (next: NoticeEmailTemplateConfig) => void;
}) {
  const variant = config[variantKey];
  return (
    <div className="space-y-3">
      {FIELD_HELP.map((f) => {
        const id = `${variantKey}-${f.key}`;
        const value = String(variant[f.key] || "");
        return (
          <div key={id} className="space-y-1">
            <Label htmlFor={id}>{f.label}</Label>
            {f.multiline ? (
              <Textarea
                id={id}
                value={value}
                onChange={(e) =>
                  onChange({
                    ...config,
                    [variantKey]: {
                      ...variant,
                      [f.key]: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            ) : (
              <Input
                id={id}
                value={value}
                onChange={(e) =>
                  onChange({
                    ...config,
                    [variantKey]: {
                      ...variant,
                      [f.key]: e.target.value,
                    },
                  })
                }
              />
            )}
            <p className="text-[11px] text-muted-foreground">{f.help}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function NoticeEmailTemplateEditor({
  open,
  onOpenChange,
  config,
  loading,
  saving,
  resetting,
  error,
  onChange,
  onSave,
  onReset,
}: Props) {
  const [activeTab, setActiveTab] = useState<"urgent" | "normal">("urgent");
  const canEdit = useMemo(() => Boolean(config), [config]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-0 max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Template Text Editor</DialogTitle>
          <DialogDescription>
            Edit urgent and normal notice email text blocks. Saved values are used for future sends until changed.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive break-words">
            {error}
          </div>
        ) : null}

        {!canEdit || loading ? (
          <p className="text-sm text-muted-foreground">Loading template configuration...</p>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "urgent" | "normal")} className="space-y-3">
            <TabsList>
              <TabsTrigger value="urgent">Urgent Template</TabsTrigger>
              <TabsTrigger value="normal">Normal Template</TabsTrigger>
            </TabsList>
            <TabsContent value="urgent">
              <VariantFields variantKey="urgent" config={config} onChange={onChange} />
            </TabsContent>
            <TabsContent value="normal">
              <VariantFields variantKey="normal" config={config} onChange={onChange} />
            </TabsContent>
          </Tabs>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            className="w-full sm:w-auto"
            variant="outline"
            onClick={onReset}
            disabled={!canEdit || !!loading || !!saving || !!resetting}
          >
            {resetting ? "Resetting..." : "Reset to Default"}
          </Button>
          <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={onSave} disabled={!canEdit || !!loading || !!saving || !!resetting}>
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
