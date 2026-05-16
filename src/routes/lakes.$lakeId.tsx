import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tierBadgeClass, tierClasses, type Tier } from "@/lib/tier";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { haversineKm, glacierLakeAssocScore } from "@/lib/geo";

export const Route = createFileRoute("/lakes/$lakeId")({
  head: ({ params }) => ({
    meta: [
      { title: `Lake ${params.lakeId.slice(0, 6)} — CryoHealth` },
      { name: "description", content: "Glacial lake risk score history, confidence and downstream population." },
    ],
  }),
  component: LakeDetail,
});

function LakeDetail() {
  const { lakeId } = Route.useParams();
  const { data: lake } = useQuery({
    queryKey: ["lake", lakeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lakes")
        .select("*, district:districts(name)")
        .eq("id", lakeId)
        .maybeSingle();
      return data;
    },
  });
  const { data: history } = useQuery({
    queryKey: ["lake-history", lakeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lake_risk_scores")
        .select("score,tier,confidence,observed_at")
        .eq("lake_id", lakeId)
        .order("observed_at", { ascending: true })
        .limit(120);
      return (data ?? []).map((r) => ({
        ts: new Date(r.observed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: Number(r.score),
      }));
    },
  });
  const { data: alerts } = useQuery({
    queryKey: ["lake-alerts", lakeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("id,title,tier,created_at,estimated_window")
        .eq("lake_id", lakeId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: associatedGlaciers } = useQuery({
    queryKey: ["lake-glaciers", lakeId, lake?.lat, lake?.lng],
    enabled: !!lake?.lat && !!lake?.lng,
    queryFn: async () => {
      const { data } = await supabase
        .from("glaciers")
        .select("id,name,status,lat,lng,area_km2,elevation_max_m,district:districts(name)");
      const ranked = (data ?? [])
        .map((g) => {
          const distanceKm = haversineKm({ lat: lake!.lat, lng: lake!.lng }, { lat: g.lat, lng: g.lng });
          const proximity = 1 / (1 + distanceKm / 25);
          return { ...g, distanceKm, assoc: glacierLakeAssocScore(distanceKm, g.status), proximity };
        })
        .sort((a, b) => b.assoc - a.assoc)
        .slice(0, 6);
      return ranked;
    },
  });

  if (!lake) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Loading lake…</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/lakes" className="text-xs text-primary hover:underline">
        ← All lakes
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{lake.name}</h1>
          <p className="text-sm text-muted-foreground">
            {(lake.district as { name?: string } | null)?.name ?? "—"} · {lake.elevation_m ?? "?"} m · {Number(lake.area_km2 ?? 0).toFixed(2)} km²
          </p>
        </div>
        <span className={tierBadgeClass(lake.current_tier as Tier) + " text-sm"}>{lake.current_tier}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Stat label="Risk score" value={Number(lake.current_risk_score).toFixed(0)} />
        <Stat label="Confidence" value={`${Math.round(Number(lake.current_confidence) * 100)}%`} />
        <Stat label="Downstream" value={lake.downstream_population.toLocaleString()} />
        <Stat label="Updated" value={new Date(lake.last_updated).toLocaleDateString()} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Risk score · last 90 days</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history ?? []}>
              <XAxis dataKey="ts" fontSize={11} stroke="currentColor" className="text-muted-foreground" />
              <YAxis domain={[0, 100]} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip />
              <ReferenceLine y={75} stroke={tierClasses.CRITICAL.hex} strokeDasharray="3 3" label={{ value: "CRITICAL", fontSize: 10, fill: tierClasses.CRITICAL.hex }} />
              <ReferenceLine y={60} stroke={tierClasses.HIGH.hex} strokeDasharray="3 3" />
              <ReferenceLine y={35} stroke={tierClasses.WATCH.hex} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="score" stroke="oklch(0.32 0.08 245)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Alerts for this lake</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {(alerts ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-foreground">{a.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
              </div>
              <span className={tierBadgeClass(a.tier as Tier)}>{a.tier}</span>
            </li>
          ))}
          {alerts && alerts.length === 0 && <li className="py-3 text-muted-foreground">No alerts yet.</li>}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Associated glaciers <span className="text-xs font-normal text-muted-foreground">· nearest + highest hazard</span>
          </h2>
          <p className="text-xs text-muted-foreground">Ranked by proximity to this lake and glacier status (surging / retreating weigh higher).</p>
        </div>
        <ul className="divide-y divide-border text-sm">
          {(associatedGlaciers ?? []).map((g) => (
            <li key={g.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <Link to="/glaciers/$glacierId" params={{ glacierId: g.id }} className="font-medium text-foreground hover:underline">{g.name}</Link>
                <div className="text-xs text-muted-foreground">
                  {g.distanceKm.toFixed(1)} km away · {(g.district as { name?: string } | null)?.name ?? "—"} · {g.area_km2 ? `${Number(g.area_km2).toFixed(1)} km²` : "—"}
                </div>
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">{g.status}</span>
            </li>
          ))}
          {associatedGlaciers && associatedGlaciers.length === 0 && (
            <li className="px-5 py-6 text-center text-muted-foreground">No glaciers indexed.</li>
          )}
        </ul>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}