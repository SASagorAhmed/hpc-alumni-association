import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CommitteeSection from "@/components/landing/CommitteeSection";
import { AlumniExecutiveCommitteeBoard } from "@/components/committee/AlumniExecutiveCommitteeBoard";
import type { StructuredCommitteePayload } from "@/components/committee/StructuredCommitteeDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { API_BASE_URL } from "@/api-production/api.js";
import AutoRepairBoundary from "@/components/ui/AutoRepairBoundary";

const Committee = () => {
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  const { data: termsList = [], isLoading: loadingTerms } = useQuery({
    queryKey: ["committee-terms-public"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/committee/terms`);
      if (!res.ok) return [];
      return (await res.json()) as { id: string; name: string; is_current?: number }[];
    },
  });

  const activeQuery = useQuery({
    queryKey: ["committee-active-page"],
    queryFn: async (): Promise<StructuredCommitteePayload | null> => {
      const res = await fetch(`${API_BASE_URL}/api/public/committee/active`);
      if (!res.ok) return null;
      const raw = await res.json();
      if (!raw?.term) return null;
      return raw;
    },
  });

  const historyQuery = useQuery({
    queryKey: ["committee-term-detail", selectedTermId],
    queryFn: async (): Promise<StructuredCommitteePayload | null> => {
      if (!selectedTermId) return null;
      const res = await fetch(`${API_BASE_URL}/api/public/committee/terms/${selectedTermId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedTermId,
  });

  const displayData = selectedTermId ? historyQuery.data : activeQuery.data;
  const loadingDetail = selectedTermId ? historyQuery.isLoading || historyQuery.isFetching : activeQuery.isLoading;
  const showStructured = Boolean(displayData?.term?.id);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-12 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alumni Executive Committee</h1>
        <p className="text-sm text-muted-foreground">Leadership of the HPC Alumni Association (not the general alumni directory).</p>
      </div>

      {termsList.length > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Committee term:</span>
          <Select
            value={selectedTermId ?? "__current__"}
            onValueChange={(v) => setSelectedTermId(v === "__current__" ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Current committee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__current__">Current / active committee</SelectItem>
              {termsList.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.is_current ? " (active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loadingTerms || loadingDetail ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : showStructured && displayData ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <AutoRepairBoundary title="Committee board">
            <AlumniExecutiveCommitteeBoard data={displayData} showAll compactIntro />
          </AutoRepairBoundary>
        </div>
      ) : selectedTermId && !loadingDetail ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            This committee term was not found or is not published.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border bg-card p-2 shadow-sm sm:p-2.5">
          <AutoRepairBoundary title="Committee section">
            <CommitteeSection showAll />
          </AutoRepairBoundary>
        </div>
      )}
    </div>
  );
};

export default Committee;
