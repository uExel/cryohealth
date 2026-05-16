import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { tierBadgeClass, type Tier } from "@/lib/tier";
import { haversineKm, glacierLakeAssocScore } from "@/lib/geo";
import { glacierStatusWeight } from "@/lib/geo";

export const Route = createFileRoute("/glaciers/$glacierId")({
  head: ({ params }) => ({
    meta: [
      { title: `Glacier ${params.glacierId.slice(0, 6)} — CryoHealth` },
      { name: "description", content: "Glacier profile with RGI/GLIMS metadata, observation history and downstream impacts." },
    ],
  }),
  component: GlacierDetail,
});

const statusColor: Record<string, string> = {
  stable: "bg-blue-100 text-blue-800",
  retreating: "bg-red-100 text-red-800",
  advancing: "bg-emerald-100 text-emerald-800",
  surging: "bg-purple-100 text-purple-800",
  unknown: "bg-slate-100 text-slate-700",
};

function GlacierDetail() {
  const { glacierId } = Route.useParams();

  const { data: glacier, isLoading } = useQuery({
    queryKey: ["glacier", glacierId],
    queryFn: async () => {
      const { data } = await supabase
        .from("glaciers")
        .select("*, district:districts(id,name,province)")
        .eq("id", glacierId)
        .maybeSingle();
      return data;
    },
  });

  const { data: observations } = useQuery({
    queryKey: ["glacier-obs", glacierId],
    queryFn: async () => {
      const { data } = await supabase
        .from("glacier_observations")
        .select("observed_at,area_km2,length_km,terminus_change_m,status,source,notes")
        .eq("glacier_id", glacierId)
        .order("observed_at", { ascending: true });
      return data ?? [];
    },
  });

  const districtId = (glacier?.district as { id?: string } | null)?.id;

  const { data: relatedLakes } = useQuery({
    queryKey: ["glacier-lakes-assoc", glacierId, glacier?.lat, glacier?.lng],
    enabled: !!glacier?.lat && !!glacier?.lng,
    queryFn: async () => {
      const { data } = await supabase
        .from("lakes")
        .select("id,name,current_tier,current_risk_score,downstream_population,lat,lng,district:districts(name)");
      const ranked = (data ?? [])
        .map((l) => {
          const distanceKm = haversineKm({ lat: glacier!.lat, lng: glacier!.lng }, { lat: l.lat, lng: l.lng });
          // proximity weighted by lake risk score (0-100)
          const proximity = 1 / (1 + distanceKm / 25);
          const base = glacierLakeAssocScore(distanceKm, glacier!.status);
          const riskNorm = Number(l.current_risk_score ?? 0) / 100;
          const assoc = base * 0.5 + riskNorm * 0.5;
          const hazard = glacierStatusWeight[glacier!.status ?? "unknown"] ?? 0.4;
          const contributions = {
            distance: proximity * 0.3,
            status: hazard * 0.2,
            risk: riskNorm * 0.5,
          };
          const driver = (Object.entries(contributions).sort((a, b) => b[1] - a[1])[0][0]) as "distance" | "status" | "risk";
          return { ...l, distanceKm, assoc, proximity, riskNorm, driver };
        })
        .sort((a, b) => b.assoc - a.assoc)
        .slice(0, 8);
      return ranked;
    },
  });

  const { data: relatedCases } = useQuery({
    queryKey: ["glacier-cases", districtId],
    enabled: !!districtId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cases")
        .select("id,symptoms,diagnosis,outcome,is_disaster_related,created_at")
        .eq("district_id", districtId!)
        .eq("is_disaster_related", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  if (isLoading) return <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Loading glacier…</main>;
  if (!glacier) return <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Glacier not found.</main>;

  const chartData = (observations ?? []).map((o) => ({
    ts: new Date(o.observed_at).toLocaleDateString(undefined, { year: "numeric", month: "short" }),
    area: Number(o.area_km2 ?? 0),
    length: Number(o.length_km ?? 0),
  }));

  const totalTerminusChange = (observations ?? []).reduce((s, o) => s + Number(o.terminus_change_m ?? 0), 0);
  const districtName = (glacier.district as { name?: string } | null)?.name ?? "—";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/admin" className="text-xs text-primary hover:underline">← Back to inventory</Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{glacier.name}</h1>
          <p className="text-sm text-muted-foreground">
            {districtName} · {(glacier.district as { province?: string } | null)?.province ?? ""} ·
            {" "}<span className="font-mono">{glacier.rgi_id ?? "no RGI ID"}</span>
          </p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColor[glacier.status] ?? statusColor.unknown}`}>
          {glacier.status}
        </span>
      </header>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Area" value={glacier.area_km2 ? `${Number(glacier.area_km2).toFixed(1)} km²` : "—"} />
        <Stat label="Length" value={glacier.length_km ? `${Number(glacier.length_km).toFixed(1)} km` : "—"} />
        <Stat label="Elevation" value={`${glacier.elevation_min_m ?? "—"} – ${glacier.elevation_max_m ?? "—"} m`} />
        <Stat label="Cumulative terminus" value={`${totalTerminusChange >= 0 ? "+" : ""}${totalTerminusChange.toFixed(0)} m`} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Area & length trajectory</h2>
          <p className="text-xs text-muted-foreground">From RGI v7 + Landsat / Sentinel-2 observation stack.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" />
                <XAxis dataKey="ts" fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                <YAxis yAxisId="left" fontSize={11} stroke="currentColor" />
                <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="currentColor" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="area" name="Area (km²)" stroke="#2563eb" strokeWidth={2} dot />
                <Line yAxisId="right" type="monotone" dataKey="length" name="Length (km)" stroke="#dc2626" strokeWidth={2} dot strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">RGI / GLIMS metadata</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Meta k="RGI ID" v={glacier.rgi_id} />
            <Meta k="GLIMS ID" v={glacier.glims_id} />
            <Meta k="Coordinates" v={`${glacier.lat.toFixed(4)}, ${glacier.lng.toFixed(4)}`} />
            <Meta k="Terminus type" v={glacier.terminus_type} />
            <Meta k="Source" v={glacier.source} />
            <Meta k="Last observed" v={glacier.last_observed} />
          </dl>
          {glacier.notes && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{glacier.notes}</p>}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">Observation history</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Area (km²)</th>
                <th className="px-4 py-2">Length (km)</th>
                <th className="px-4 py-2">Terminus Δ (m)</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(observations ?? []).slice().reverse().map((o, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-foreground">{new Date(o.observed_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{o.area_km2 ? Number(o.area_km2).toFixed(2) : "—"}</td>
                  <td className="px-4 py-2">{o.length_km ? Number(o.length_km).toFixed(2) : "—"}</td>
                  <td className={`px-4 py-2 ${Number(o.terminus_change_m ?? 0) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {o.terminus_change_m != null ? `${Number(o.terminus_change_m) > 0 ? "+" : ""}${Number(o.terminus_change_m).toFixed(0)}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusColor[o.status ?? "unknown"]}`}>{o.status ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{o.source}</td>
                </tr>
              ))}
              {observations && observations.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No observations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
            Associated glacial lakes <span className="text-xs font-normal text-muted-foreground">· nearest + highest risk</span>
          </h2>
          <div className="px-5 pt-3">
            <DriverLegend />
          </div>
          <ul className="divide-y divide-border text-sm">
            {(relatedLakes ?? []).map((l, idx) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to="/lakes/$lakeId" params={{ lakeId: l.id }} className="font-medium text-foreground hover:underline">{l.name}</Link>
                    <DriverBadge driver={l.driver} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {l.distanceKm.toFixed(1)} km · {(l.district as { name?: string } | null)?.name ?? "—"} · {l.downstream_population.toLocaleString()} downstream · score {Number(l.current_risk_score).toFixed(0)}
                  </div>
                  <BreakdownDetails defaultOpen={idx === 0} rank={l.assoc}>
                    <span className={l.driver === "distance" ? "font-semibold text-foreground" : ""}>distance {(l.proximity * 100).toFixed(0)}</span> +{" "}
                    <span className={l.driver === "status" ? "font-semibold text-foreground" : ""}>status {glacier.status}</span> +{" "}
                    <span className={l.driver === "risk" ? "font-semibold text-foreground" : ""}>lake risk {(l.riskNorm * 100).toFixed(0)}</span>
                  </BreakdownDetails>
                </div>
                <span className={tierBadgeClass(l.current_tier as Tier)}>{l.current_tier}</span>
              </li>
            ))}
            {relatedLakes && relatedLakes.length === 0 && (
              <li className="px-5 py-6 text-center text-muted-foreground">No monitored lakes indexed.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
            Disaster-related case reports <span className="text-xs font-normal text-muted-foreground">· same district</span>
          </h2>
          <ul className="divide-y divide-border text-sm">
            {(relatedCases ?? []).map((c) => (
              <li key={c.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{c.diagnosis ?? c.symptoms.slice(0, 60)}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">Outcome: {c.outcome ?? "—"}</div>
              </li>
            ))}
            {relatedCases && relatedCases.length === 0 && (
              <li className="px-5 py-6 text-center text-muted-foreground">No disaster-related cases logged for {districtName}.</li>
            )}
          </ul>
        </div>
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

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
      <dd className="font-mono text-xs text-foreground">{v ?? "—"}</dd>
    </div>
  );
}

const driverMeta: Record<string, { label: string; cls: string }> = {
  distance: { label: "Distance-driven", cls: "bg-blue-100 text-blue-800 ring-blue-200" },
  status: { label: "Status-driven", cls: "bg-purple-100 text-purple-800 ring-purple-200" },
  risk: { label: "Risk-driven", cls: "bg-red-100 text-red-800 ring-red-200" },
};

export function DriverBadge({ driver }: { driver: "distance" | "status" | "risk" }) {
  const m = driverMeta[driver];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${m.cls}`}>
      {m.label}
    </span>
  );
}

export function BreakdownDetails({
  defaultOpen = false,
  rank,
  children,
}: {
  defaultOpen?: boolean;
  rank: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-1 text-[11px] text-muted-foreground/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        <span>Rank {(rank * 100).toFixed(0)}/100</span>
        <span className="font-mono text-[10px]">{open ? "− hide" : "+ breakdown"}</span>
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

export function DriverLegend({
  include = ["distance", "status", "risk"] as Array<"distance" | "status" | "risk">,
  formula = "glacier",
}: {
  include?: Array<"distance" | "status" | "risk">;
  formula?: "glacier" | "lake" | "none";
}) {
  const copy: Record<string, string> = {
    distance: "Glacier and lake are physically close (≤25 km soft radius).",
    status: "Glacier is surging or retreating, raising downstream hazard.",
    risk: "Lake's current GLOF risk score is elevated.",
  };
  return (
    <div className="mt-2 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why this ranking</div>
      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        {include.map((d) => (
          <li key={d} className="flex items-start gap-2">
            <DriverBadge driver={d} />
            <span className="flex-1">{copy[d]}</span>
          </li>
        ))}
      </ul>
      {formula !== "none" && <RankFormula variant={formula} />}
    </div>
  );
}

function RankFormula({ variant }: { variant: "glacier" | "lake" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-semibold uppercase tracking-wide hover:text-foreground"
      >
        <span>Rank formula</span>
        <span className="font-mono text-[10px]">{open ? "− hide" : "+ show"}</span>
      </button>
      {open && (
        <div className="mt-2 font-mono leading-relaxed">
            <div><span className="text-foreground">proximity</span> = 1 / (1 + distance_km / 25)</div>
            <div><span className="text-foreground">hazard</span> = status weight (surging 1.0 · retreating 0.85 · advancing 0.6 · unknown 0.4 · stable 0.3)</div>
          {variant === "glacier" ? (
              <>
                <div><span className="text-foreground">base</span> = proximity × 0.6 + hazard × 0.4</div>
                <div><span className="text-foreground">rank</span> = base × 0.5 + (lake_risk / 100) × 0.5</div>
                <div className="mt-1 text-muted-foreground/80">Driver contributions: distance ≈ proximity × 0.30 · status ≈ hazard × 0.20 · risk ≈ lake_risk/100 × 0.50</div>
              </>
            ) : (
              <>
                <div><span className="text-foreground">rank</span> = proximity × 0.6 + hazard × 0.4</div>
                <div className="mt-1 text-muted-foreground/80">Driver contributions: distance = proximity × 0.60 · status = hazard × 0.40</div>
              </>
            )}
          </div>
      )}
    </div>
  );
}
