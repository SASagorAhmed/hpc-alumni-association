import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Eye, EyeOff, Lock, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIVE_RESULT_MODES, type LiveResultSettings as LRS } from "@/constants/electionPosts";

interface Props {
  settings: LRS;
  onUpdate: (settings: LRS) => void;
}

const DEFAULT_SETTINGS: LRS = {
  mode: "hidden",
  show_vote_count: true,
  show_percentage: true,
  show_ranking: true,
  update_interval: 10,
  frozen: false,
};

export function parseLiveResultSettings(raw: any): LRS {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...raw };
}

export default function LiveResultSettingsPanel({ settings, onUpdate }: Props) {
  const s = settings;
  const set = <K extends keyof LRS>(key: K, val: LRS[K]) =>
    onUpdate({ ...s, [key]: val });

  const modeInfo = LIVE_RESULT_MODES.find(m => m.value === s.mode);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Live Result Settings
          {s.frozen && <Badge variant="destructive" className="text-[10px] gap-1"><Pause className="w-3 h-3" /> Frozen</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode */}
        <div className="space-y-1.5">
          <Label>Result Mode</Label>
          <Select value={s.mode} onValueChange={(v: LRS["mode"]) => set("mode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LIVE_RESULT_MODES.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {modeInfo && (
            <p className="text-xs text-muted-foreground">{modeInfo.description}</p>
          )}
        </div>

        {/* Only show controls for non-hidden modes */}
        {s.mode !== "hidden" && (
          <>
            {/* Data visibility toggles */}
            {(s.mode === "live" || s.mode === "admin_only") && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-xs">Vote Count</Label>
                  <Switch checked={s.show_vote_count} onCheckedChange={v => set("show_vote_count", v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-xs">Percentage</Label>
                  <Switch checked={s.show_percentage} onCheckedChange={v => set("show_percentage", v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-xs">Ranking</Label>
                  <Switch checked={s.show_ranking} onCheckedChange={v => set("show_ranking", v)} />
                </div>
              </div>
            )}

            {/* Update Interval */}
            <div className="space-y-1.5">
              <Label>Update Interval</Label>
              <Select value={String(s.update_interval)} onValueChange={v => set("update_interval", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 seconds</SelectItem>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Freeze toggle */}
            <Button
              variant={s.frozen ? "default" : "outline"}
              size="sm"
              className="gap-1.5 w-full"
              onClick={() => set("frozen", !s.frozen)}
            >
              {s.frozen ? <><Play className="w-3.5 h-3.5" /> Resume Live Updates</> : <><Pause className="w-3.5 h-3.5" /> Freeze Results</>}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
