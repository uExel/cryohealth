import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HazardMap } from "@/components/cryohealth/HazardMap";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Cryosphere Inventory" },
      { name: "description", content: "Profile of glaciers and glacial lakes across Gilgit Baltistan and Chitral, mapped from RGI v7 / GLIMS and NASA satellite data." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, rolesLoaded, user } = useAuth();
  if (loading || (user && !rolesLoaded))
    return <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading…</main>;
  if (!isAdmin)
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center text-sm text-muted-foreground">
        Admin access required. Ask the project owner to grant you the <code>cryohealth_admin</code> or <code>facility_admin</code> role.
        <div className="mt-4">
          <Link to="/login" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in</Link>
        </div>
      </main>
    );
  return <CryosphereInventory />;
}

function CryosphereInventory() {
  const [showGibs, setShowGibs] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "stable" | "retreating" | "advancing" | "surging" | "unknown">("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: async () => (await supabase.from("districts").select("id,name,province").order("name")).data ?? [],
  });
  const { data: glaciers, isLoading: gLoading } = useQuery({
    queryKey: ["glaciers"],
    queryFn: async () =>
      (await supabase
        .from("glaciers")
        .select("id,name,rgi_id,district_id,lat,lng,area_km2,length_km,elevation_min_m,elevation_max_m,status,source,last_observed,notes")
        .order("area_km2", { ascending: false })
      ).data ?? [],
  });
  const { data: lakes } = useQuery({
    queryKey: ["lakes-admin"],
    queryFn: async () =>
      (await supabase
        .from("lakes")
        .select("id,name,lat,lng,current_tier,current_risk_score,downstream_population,last_updated,district_id")
        .order("current_risk_score", { ascending: false })
      ).data ?? [],
  });

  const districtById = useMemo(() => Object.fromEntries((districts ?? []).map((d) => [d.id, d])), [districts]);

  const filteredGlaciers = (glaciers ?? []).filter((g) => {
    if (statusFilter !== "ALL" && g.status !== statusFilter) return false;
    if (districtFilter !== "ALL" && g.district_id !== districtFilter) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = useMemo(() => {
    const c = { stable: 0, retreating: 0, advancing: 0, surging: 0, unknown: 0 } as Record<string, number>;
    (glaciers ?? []).forEach((g) => (c[g.status] = (c[g.status] ?? 0) + 1));
    return c;
  }, [glaciers]);

  const totalArea = (glaciers ?? []).reduce((s, g) => s + Number(g.area_km2 ?? 0), 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cryosphere inventory · Gilgit Baltistan & Chitral</h1>
          <p className="text-sm text-muted-foreground">
            {(glaciers?.length ?? 0)} glaciers · {(lakes?.length ?? 0)} monitored lakes · sourced from RGI v7 / GLIMS with NASA GIBS imagery overlay.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
          <input type="checkbox" checked={showGibs} onChange={(e) => setShowGibs(e.target.checked)} />
          NASA GIBS satellite basemap
        </label>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total glaciers" value={glaciers?.length ?? 0} />
        <Stat label="Total ice area" value={`${totalArea.toFixed(0)} km²`} />
        <Stat label="Retreating" value={counts.retreating ?? 0} tone="danger" />
        <Stat label="Surging" value={counts.surging ?? 0} tone="warn" />
        <Stat label="Stable" value={counts.stable ?? 0} tone="ok" />
      </div>

      <HazardMap
        lakes={(lakes ?? []) as never}
        glaciers={(glaciers ?? []) as never}
        showGibs={showGibs}
        height={560}
      />

      <section className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <h2 className="text-sm font-semibold text-foreground">Glacier register</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="ml-auto rounded-md border border-input bg-background px-2 py-1 text-xs"
          />
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="ALL">All districts</option>
            {(districts ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="flex gap-1 rounded-md border border-border bg-background p-0.5 text-xs">
            {(["ALL", "stable", "retreating", "surging", "advancing", "unknown"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded px-2 py-0.5 ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Glacier</th>
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2">Area (km²)</th>
                <th className="px-3 py-2">Length (km)</th>
                <th className="px-3 py-2">Elev. range (m)</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">RGI ID</th>
                <th className="px-3 py-2">Observed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {gLoading && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!gLoading && filteredGlaciers.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No glaciers match the current filters.</td></tr>
              )}
              {filteredGlaciers.map((g) => (
                <tr key={g.id} className="hover:bg-secondary/40">
                  <td className="px-3 py-2 font-medium text-foreground">
                    <Link to="/glaciers/$glacierId" params={{ glacierId: g.id }} className="hover:underline">
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{districtById[g.district_id ?? ""]?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-foreground">{g.area_km2 ? Number(g.area_km2).toFixed(1) : "—"}</td>
                  <td className="px-3 py-2 text-foreground">{g.length_km ? Number(g.length_km).toFixed(1) : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.elevation_min_m ?? "—"} – {g.elevation_max_m ?? "—"}</td>
                  <td className="px-3 py-2"><StatusPill status={g.status} /></td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{g.rgi_id ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{g.last_observed ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Source: Randolph Glacier Inventory v7 (RGI Consortium, 2023) · GLIMS / NSIDC · imagery via NASA EOSDIS GIBS (MODIS Terra).
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: React.ReactNode; tone?: "default" | "danger" | "warn" | "ok" }) {
  const toneClass =
    tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    stable: "bg-blue-100 text-blue-800",
    retreating: "bg-red-100 text-red-800",
    advancing: "bg-emerald-100 text-emerald-800",
    surging: "bg-purple-100 text-purple-800",
    unknown: "bg-slate-100 text-slate-700",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.unknown}`}>{status}</span>;
}