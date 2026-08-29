import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";
import { StatCard } from "@/components/cryohealth/StatCard";
import { LakeFormDialog } from "@/components/cryohealth/LakeFormDialog";
import { TierBadge, type Tier } from "@/lib/tier";
import { fetchLakeDetail, fetchDistricts, fetchHazardScores, adminRequest } from "@/lib/cryohealth-client";
import type { LakeCreate } from "@/lib/admin-schemas";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/lakes/$lakeId")({
  head: () => ({
    meta: [{ title: "Lake detail — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: LakeDetailAdmin,
});

const TIERS: readonly Tier[] = ["NORMAL", "WATCH", "HIGH", "CRITICAL"];
function isTier(t: string): t is Tier {
  return (TIERS as readonly string[]).includes(t);
}

type DistrictRow = { id: string; name: string };

type LakeRow = {
  id: string;
  name: string;
  nameUr: string | null;
  valley: string;
  district_id: string | null;
  damType: string | null;
  glacierContact: boolean | null;
  icimodId: string | null;
  historicalGlof: boolean | null;
  source: string | null;
  sourceUrl: string | null;
  district_name: string | null;
  current_tier: Tier;
  current_risk_score: string | number | null;
  downstream_population: number | null;
  area_km2: string | number | null;
  elevationM: number | null;
  elevation_m: number | null;
  lat: number;
  lng: number;
  updatedAt: string;
};

type RiskScoreRow = {
  score: string | number;
  tier: string;
  confidence: string | number;
  observed_at: string;
};

type HazardScoreRow = {
  run_id: string;
  score: string | number;
  tier: string;
  components: unknown;
  computed_at: string;
};

/** `total` is every hazard_scores row for the lake; `hazardScores` is only the latest 120 the
 *  endpoint will return. When they disagree the tab has to say so — see hazardTruncationNote. */
type HazardScoresResponse = {
  hazardScores: HazardScoreRow[];
  total: number;
  hasMore: boolean;
};

function LakeDetailAdmin() {
  const { lakeId } = Route.useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const {
    data: bundle,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-lake", lakeId],
    queryFn: async () => {
      return fetchLakeDetail(lakeId) as Promise<{ lake: LakeRow; history: RiskScoreRow[] } | null>;
    },
  });

  const { data: districts } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> => {
      return (await fetchDistricts()).districts ?? [];
    },
  });

  const {
    data: hazard,
    isLoading: hazardLoading,
    isError: hazardError,
  } = useQuery({
    queryKey: ["admin-lake-hazard-scores", lakeId],
    queryFn: async (): Promise<HazardScoresResponse> => {
      const data = await fetchHazardScores(lakeId);
      return {
        hazardScores: (data as any)?.hazardScores ?? [],
        total: (data as any)?.total ?? 0,
        hasMore: (data as any)?.hasMore ?? false,
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: LakeCreate) => {
      const result = await adminRequest(`/admin/lakes/${lakeId}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      if (!result.ok) throw new Error(result.body.error ?? "Failed to update lake");
      return result.body.lake;
    },
    onSuccess: () => {
      toast.success("Lake updated");
      qc.invalidateQueries({ queryKey: ["admin-lake", lakeId] });
      qc.invalidateQueries({ queryKey: ["admin-lakes"] });
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lake = bundle?.lake;
  const riskScores = bundle?.history ?? [];
  const hazardScores = hazard?.hazardScores ?? [];

  // The Hazard scores tab exists to be audited, so a capped list has to admit that it is capped —
  // otherwise 120 rows reads as "every pipeline run there has ever been". Rendered above the table
  // rather than in a footer like admin.audit.tsx's pager line: with 120 rows a footer sits a screen
  // and a half down, by which point the reader has already drawn the wrong conclusion.
  const hazardTruncationNote = hazard?.hasMore
    ? `Showing the latest ${hazardScores.length} of ${hazard.total.toLocaleString()} pipeline ` +
      "runs. Older rows are kept in the database but are not listed here."
    : null;

  if (isLoading) return <AdminPlaceholder title="Lake detail" subtitle="Loading…" />;
  if (isError)
    return (
      <AdminPlaceholder
        title="Lake detail"
        subtitle="Couldn't load this lake. Try reloading the page."
      />
    );
  if (!lake)
    return <AdminPlaceholder title="Lake detail" subtitle={`ID: ${lakeId} · Not found.`} />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/admin/lakes" className="text-xs text-primary hover:underline">
        ← Back to lakes
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{lake.name}</h1>
          <p className="text-sm text-muted-foreground">
            {lake.district_name ?? "—"} · {lake.valley ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TierBadge tier={lake.current_tier} solid={lake.current_tier === "CRITICAL"} />
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit lake
          </Button>
        </div>
      </header>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk-scores">Risk scores</TabsTrigger>
          <TabsTrigger value="hazard-scores">Hazard scores</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Risk score"
              value={
                lake.current_risk_score != null ? Number(lake.current_risk_score).toFixed(0) : "—"
              }
            />
            <StatCard
              label="Downstream population"
              value={
                lake.downstream_population != null
                  ? lake.downstream_population.toLocaleString()
                  : "—"
              }
            />
            <StatCard
              label="Elevation"
              value={lake.elevation_m != null ? `${lake.elevation_m} m` : "—"}
            />
            <StatCard label="Updated" value={new Date(lake.updatedAt).toLocaleDateString()} />
          </section>

          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Metadata</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Meta k="Dam type" v={lake.damType} />
              <Meta
                k="Glacier contact"
                v={lake.glacierContact == null ? null : lake.glacierContact ? "Yes" : "No"}
              />
              <Meta
                k="Historical GLOF"
                v={lake.historicalGlof == null ? null : lake.historicalGlof ? "Yes" : "No"}
              />
              <Meta k="ICIMOD ID" v={lake.icimodId} />
            </dl>
            {lake.source && (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                {lake.source}
                {lake.sourceUrl && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={lake.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      source
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="risk-scores">
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Observed at
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Score</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Tier</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Confidence
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {riskScores.length === 0 && (
                  <TableRow className="border-border">
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No risk scores recorded. This table is scaffolded in the shared schema but no
                      service writes to it yet.
                    </TableCell>
                  </TableRow>
                )}
                {riskScores
                  .slice()
                  .reverse()
                  .map((r, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="text-foreground">
                        {new Date(r.observed_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{Number(r.score).toFixed(2)}</TableCell>
                      <TableCell>{isTier(r.tier) ? <TierBadge tier={r.tier} /> : r.tier}</TableCell>
                      <TableCell>{Math.round(Number(r.confidence) * 100)}%</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="hazard-scores">
          <div className="rounded-xl border border-border bg-card">
            {hazardTruncationNote && (
              <p className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
                {hazardTruncationNote}
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Computed at
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Score</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Tier</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Run ID</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Components
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {hazardLoading && (
                  <TableRow className="border-border">
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {hazardError && (
                  <TableRow className="border-border">
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      Couldn't load hazard scores.
                    </TableCell>
                  </TableRow>
                )}
                {!hazardLoading && !hazardError && hazardScores.length === 0 && (
                  <TableRow className="border-border">
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No hazard scores yet — populated by CryoHealth-geo pipeline runs via{" "}
                      <span className="font-mono">POST /alerts/hazard-scores</span>.
                    </TableCell>
                  </TableRow>
                )}
                {hazardScores.map((h) => (
                  <TableRow key={h.run_id + h.computed_at} className="border-border">
                    <TableCell className="text-foreground">
                      {new Date(h.computed_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{Number(h.score).toFixed(2)}</TableCell>
                    <TableCell>{isTier(h.tier) ? <TierBadge tier={h.tier} /> : h.tier}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {h.run_id}
                    </TableCell>
                    <TableCell>
                      <details>
                        <summary className="cursor-pointer text-xs text-primary">
                          components
                        </summary>
                        <pre className="mt-1 max-w-xs overflow-x-auto text-xs text-muted-foreground">
                          {JSON.stringify(h.components, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {editing && (
        <LakeFormDialog
          initial={lake}
          districts={districts ?? []}
          onOpenChange={setEditing}
          onSubmit={(values) => updateMutation.mutate(values)}
          isPending={updateMutation.isPending}
        />
      )}
    </main>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
      <dd className="font-mono text-xs text-foreground">{v ?? "—"}</dd>
    </div>
  );
}
