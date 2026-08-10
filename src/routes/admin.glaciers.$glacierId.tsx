import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";
import { StatCard, StatusPill } from "@/components/cryohealth/StatCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/glaciers/$glacierId")({
  head: () => ({
    meta: [
      { title: "Glacier detail — Admin — CryoHealth" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GlacierDetailAdmin,
});

type GlacierRow = {
  id: string;
  name: string;
  rgi_id: string | null;
  glims_id: string | null;
  lat: number;
  lng: number;
  area_km2: number | null;
  length_km: number | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  status: string;
  terminus_type: string | null;
  source: string | null;
  last_observed: string | null;
  notes: string | null;
  district_name?: string | null;
  district_province?: string | null;
};

type ObservationRow = {
  observed_at: string;
  area_km2: number | null;
  length_km: number | null;
  terminus_change_m: number | null;
  status: string | null;
  source: string | null;
  notes: string | null;
};

function GlacierDetailAdmin() {
  const { glacierId } = Route.useParams();

  const {
    data: bundle,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-glacier", glacierId],
    queryFn: async () => {
      const res = await fetch(`/api/public/glaciers/${glacierId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`glacier fetch failed: ${res.status}`);
      return res.json() as Promise<{ glacier: GlacierRow; observations: ObservationRow[] }>;
    },
  });

  const glacier = bundle?.glacier;
  const observations = bundle?.observations ?? [];

  if (isLoading) return <AdminPlaceholder title="Glacier detail" subtitle="Loading…" />;
  if (isError)
    return (
      <AdminPlaceholder
        title="Glacier detail"
        subtitle="Couldn't load this glacier. Try reloading the page."
      />
    );
  if (!glacier)
    return <AdminPlaceholder title="Glacier detail" subtitle={`ID: ${glacierId} · Not found.`} />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/admin/glaciers" className="text-xs text-primary hover:underline">
        ← Back to glaciers
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{glacier.name}</h1>
          <p className="text-sm text-muted-foreground">
            {glacier.district_name ?? "—"} · {glacier.district_province ?? ""} ·{" "}
            <span className="font-mono">{glacier.rgi_id ?? "no RGI ID"}</span>
          </p>
        </div>
        <StatusPill status={glacier.status} />
      </header>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Area"
              value={glacier.area_km2 ? `${Number(glacier.area_km2).toFixed(1)} km²` : "—"}
            />
            <StatCard
              label="Length"
              value={glacier.length_km ? `${Number(glacier.length_km).toFixed(1)} km` : "—"}
            />
            <StatCard
              label="Elevation"
              value={`${glacier.elevation_min_m ?? "—"} – ${glacier.elevation_max_m ?? "—"} m`}
            />
            <StatCard label="Terminus type" value={glacier.terminus_type ?? "—"} />
          </section>

          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Metadata</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Meta k="GLIMS ID" v={glacier.glims_id} />
              <Meta k="Coordinates" v={`${glacier.lat.toFixed(4)}, ${glacier.lng.toFixed(4)}`} />
              <Meta k="Source" v={glacier.source} />
              <Meta k="Last observed" v={glacier.last_observed} />
            </dl>
            {glacier.notes && (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                {glacier.notes}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="observations">
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs uppercase text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Area (km²)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Length (km)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">
                    Terminus Δ (m)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {observations.length === 0 && (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      No observations yet — populated by CryoHealth-geo pipeline runs.
                    </TableCell>
                  </TableRow>
                )}
                {observations
                  .slice()
                  .reverse()
                  .map((o, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="text-foreground">
                        {new Date(o.observed_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{o.area_km2 ? Number(o.area_km2).toFixed(2) : "—"}</TableCell>
                      <TableCell>{o.length_km ? Number(o.length_km).toFixed(2) : "—"}</TableCell>
                      <TableCell
                        className={
                          Number(o.terminus_change_m ?? 0) < 0
                            ? "text-[var(--color-watch)]"
                            : "text-emerald-600"
                        }
                      >
                        {o.terminus_change_m != null
                          ? `${Number(o.terminus_change_m) > 0 ? "+" : ""}${Number(o.terminus_change_m).toFixed(0)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={o.status ?? "unknown"} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.source}</TableCell>
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
