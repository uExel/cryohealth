import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";
import { StatCard } from "@/components/cryohealth/StatCard";
import { TierBadge, type Tier } from "@/lib/tier";
import { authFetch } from "@/lib/auth-client";
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

type LakeRow = {
  id: string;
  name: string;
  valley: string | null;
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
  elevation_m: number | null;
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

function LakeDetailAdmin() {
  const { lakeId } = Route.useParams();

  const {
    data: bundle,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-lake", lakeId],
    queryFn: async () => {
      const res = await fetch(`/api/public/lakes/${lakeId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`lake fetch failed: ${res.status}`);
      return res.json() as Promise<{ lake: LakeRow; history: RiskScoreRow[] }>;
    },
  });

  const {
    data: hazardScores,
    isLoading: hazardLoading,
    isError: hazardError,
  } = useQuery({
    queryKey: ["admin-lake-hazard-scores", lakeId],
    queryFn: async (): Promise<HazardScoreRow[]> => {
      const res = await authFetch(`/api/public/hazard-scores/${lakeId}`);
      if (!res.ok) throw new Error(`hazard-scores fetch failed: ${res.status}`);
      return (await res.json()).hazardScores ?? [];
    },
  });

  const lake = bundle?.lake;
  const riskScores = bundle?.history ?? [];

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
        <TierBadge tier={lake.current_tier} solid={lake.current_tier === "CRITICAL"} />
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
                {!hazardLoading && !hazardError && (hazardScores ?? []).length === 0 && (
                  <TableRow className="border-border">
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No hazard scores yet — populated by CryoHealth-geo pipeline runs via{" "}
                      <span className="font-mono">POST /alerts/hazard-scores</span>.
                    </TableCell>
                  </TableRow>
                )}
                {(hazardScores ?? []).map((h) => (
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
