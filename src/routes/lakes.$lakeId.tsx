import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { tierBadgeClass, tierClasses, type Tier } from "@/lib/tier";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { haversineKm, glacierLakeAssocScore, glacierStatusWeight } from "@/lib/geo";
import { BreakdownDetails, DriverBadge, DriverLegend } from "./glaciers.$glacierId";

export const Route = createFileRoute("/lakes/$lakeId")({
  head: ({ params }) => ({
    meta: [
      { title: `Lake ${params.lakeId.slice(0, 6)} — CryoHealth` },
      {
        name: "description",
        content: "Glacial lake risk score history, confidence and downstream population.",
      },
    ],
  }),
  component: LakeDetail,
});

function LakeDetail() {
  const { lakeId } = Route.useParams();
  const { data: lakeBundle } = useQuery({
    queryKey: ["lake", lakeId],
    queryFn: async () => {
      const res = await fetch(`/api/public/lakes/${lakeId}`);
      if (!res.ok) return null;
      return res.json() as Promise<{
        lake: {
          name: string;
          district_name?: string | null;
          elevation_m?: number | null;
          area_km2?: number | null;
          current_tier: string;
          current_risk_score: number;
          current_confidence: number;
          downstream_population: number;
          last_updated: string;
          lat: number;
          lng: number;
        };
        history: { score: number; observed_at: string }[];
        alerts: {
          id: string;
          title: string;
          tier: string;
          created_at: string;
          estimated_window: string | null;
        }[];
        glaciers: {
          id: string;
          name: string;
          status: string;
          lat: number;
          lng: number;
          area_km2: number | null;
          elevation_max_m: number | null;
          district_name: string | null;
        }[];
      }>;
    },
  });

  const lake = lakeBundle?.lake;

  const history = (lakeBundle?.history ?? []).map((r) => ({
    ts: new Date(r.observed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: Number(r.score),
  }));
  const alerts = lakeBundle?.alerts ?? [];

  const associatedGlaciers = (() => {
    if (!lake?.lat || !lake?.lng) return undefined;
    return (lakeBundle?.glaciers ?? [])
      .map((g) => {
        const distanceKm = haversineKm(
          { lat: lake.lat, lng: lake.lng },
          { lat: g.lat, lng: g.lng },
        );
        const proximity = 1 / (1 + distanceKm / 25);
        const hazard = glacierStatusWeight[g.status ?? "unknown"] ?? 0.4;
        const contributions = { distance: proximity * 0.6, status: hazard * 0.4 };
        const driver = (contributions.distance >= contributions.status ? "distance" : "status") as
          "distance" | "status";
        return {
          ...g,
          distanceKm,
          assoc: glacierLakeAssocScore(distanceKm, g.status),
          proximity,
          hazard,
          driver,
        };
      })
      .sort((a, b) => b.assoc - a.assoc)
      .slice(0, 6);
  })();

  if (!lake) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">
        Loading lake…
      </main>
    );
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
            {lake.district_name ?? "—"} · {lake.elevation_m ?? "?"} m ·{" "}
            {Number(lake.area_km2 ?? 0).toFixed(2)} km²
          </p>
        </div>
        <span className={tierBadgeClass(lake.current_tier as Tier) + " text-sm"}>
          {lake.current_tier}
        </span>
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
              <XAxis
                dataKey="ts"
                fontSize={11}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                fontSize={11}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <Tooltip />
              <ReferenceLine
                y={75}
                stroke={tierClasses.CRITICAL.hex}
                strokeDasharray="3 3"
                label={{ value: "CRITICAL", fontSize: 10, fill: tierClasses.CRITICAL.hex }}
              />
              <ReferenceLine y={60} stroke={tierClasses.HIGH.hex} strokeDasharray="3 3" />
              <ReferenceLine y={35} stroke={tierClasses.WATCH.hex} strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="oklch(0.32 0.08 245)"
                strokeWidth={2}
                dot={false}
              />
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
                <div className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
              <span className={tierBadgeClass(a.tier as Tier)}>{a.tier}</span>
            </li>
          ))}
          {alerts && alerts.length === 0 && (
            <li className="py-3 text-muted-foreground">No alerts yet.</li>
          )}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Associated glaciers{" "}
            <span className="text-xs font-normal text-muted-foreground">
              · nearest + highest hazard
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Ranked by proximity to this lake and glacier status (surging / retreating weigh higher).
          </p>
          <div className="mt-2">
            <DriverLegend include={["distance", "status"]} formula="lake" />
          </div>
        </div>
        <ul className="divide-y divide-border text-sm">
          {(associatedGlaciers ?? []).map((g, idx) => (
            <li key={g.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/glaciers/$glacierId"
                    params={{ glacierId: g.id }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {g.name}
                  </Link>
                  <DriverBadge driver={g.driver} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {g.distanceKm.toFixed(1)} km away · {g.district_name ?? "—"} ·{" "}
                  {g.area_km2 ? `${Number(g.area_km2).toFixed(1)} km²` : "—"}
                </div>
                <BreakdownDetails defaultOpen={idx === 0} rank={g.assoc}>
                  <span className={g.driver === "distance" ? "font-semibold text-foreground" : ""}>
                    distance {(g.proximity * 100).toFixed(0)}
                  </span>{" "}
                  +{" "}
                  <span className={g.driver === "status" ? "font-semibold text-foreground" : ""}>
                    status {g.status} ({(g.hazard * 100).toFixed(0)})
                  </span>
                </BreakdownDetails>
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">
                {g.status}
              </span>
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
