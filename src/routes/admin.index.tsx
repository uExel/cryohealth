import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { HazardMap } from "@/components/cryohealth/HazardMap";
import { StatCard } from "@/components/cryohealth/StatCard";
import { fetchGlaciers, fetchLakesAdmin } from "@/lib/cryohealth-client";

export const Route = createFileRoute("/admin/")({
  component: CryosphereInventory,
});

function CryosphereInventory() {
  const [showGibs, setShowGibs] = useState(false);

  const { data: glaciers } = useQuery({
    queryKey: ["glaciers"],
    queryFn: async (): Promise<
      {
        id: string;
        name: string;
        rgi_id: string | null;
        district_id: string | null;
        lat: number;
        lng: number;
        area_km2: number | null;
        length_km: number | null;
        elevation_min_m: number | null;
        elevation_max_m: number | null;
        status: string;
        source: string | null;
        last_observed: string | null;
        notes: string | null;
      }[]
    > => (await fetchGlaciers()).glaciers ?? [],
  });
  const { data: lakes } = useQuery({
    queryKey: ["lakes-admin"],
    queryFn: async (): Promise<
      {
        id: string;
        name: string;
        lat: number;
        lng: number;
        current_tier: string;
        current_risk_score: number;
        downstream_population: number;
        last_updated: string;
        district_id: string | null;
      }[]
    > => (await fetchLakesAdmin()).lakes ?? [],
  });

  const counts = useMemo(() => {
    const c = { stable: 0, retreating: 0, advancing: 0, surging: 0, unknown: 0 } as Record<
      string,
      number
    >;
    (glaciers ?? []).forEach((g) => (c[g.status] = (c[g.status] ?? 0) + 1));
    return c;
  }, [glaciers]);

  const totalArea = (glaciers ?? []).reduce((s, g) => s + Number(g.area_km2 ?? 0), 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Cryosphere inventory · Gilgit Baltistan & Chitral
          </h1>
          <p className="text-sm text-muted-foreground">
            {glaciers?.length ?? 0} glaciers · {lakes?.length ?? 0} monitored lakes · sourced from
            RGI v7 / GLIMS with NASA GIBS imagery overlay.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
          <input
            type="checkbox"
            checked={showGibs}
            onChange={(e) => setShowGibs(e.target.checked)}
          />
          NASA GIBS satellite basemap
        </label>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total glaciers" value={glaciers?.length ?? 0} />
        <StatCard label="Total ice area" value={`${totalArea.toFixed(0)} km²`} />
        {/* Retreating is a concerning status, not an active hazard — "warn" (amber), not "danger" (red). */}
        <StatCard label="Retreating" value={counts.retreating ?? 0} tone="warn" />
        <StatCard label="Surging" value={counts.surging ?? 0} tone="warn" />
        <StatCard label="Stable" value={counts.stable ?? 0} tone="ok" />
      </div>

      <HazardMap
        lakes={(lakes ?? []) as never}
        glaciers={(glaciers ?? []) as never}
        showGibs={showGibs}
        height={560}
      />
    </main>
  );
}
