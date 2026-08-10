import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { StatusPill } from "@/components/cryohealth/StatCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/glaciers/")({
  head: () => ({
    meta: [{ title: "Glaciers — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: GlaciersAdmin,
});

type DistrictRow = { id: string; name: string; province: string };
type GlacierRow = {
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
};

function GlaciersAdmin() {
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "stable" | "retreating" | "advancing" | "surging" | "unknown"
  >("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const { data: districts } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> =>
      (await (await fetch("/api/public/districts")).json()).districts ?? [],
  });
  const { data: glaciers, isLoading } = useQuery({
    queryKey: ["admin-glaciers"],
    queryFn: async (): Promise<GlacierRow[]> =>
      (await (await fetch("/api/public/glaciers")).json()).glaciers ?? [],
  });

  const districtById = useMemo(
    () => Object.fromEntries((districts ?? []).map((d) => [d.id, d])),
    [districts],
  );

  const filteredGlaciers = (glaciers ?? []).filter((g) => {
    if (statusFilter !== "ALL" && g.status !== statusFilter) return false;
    if (districtFilter !== "ALL" && g.district_id !== districtFilter) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Glaciers</h1>
        <p className="text-sm text-muted-foreground">
          {glaciers?.length ?? 0} glaciers · RGI v7 / GLIMS
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          />
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="ALL">All districts</option>
            {(districts ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-md border border-border bg-background p-0.5 text-xs">
            {(["ALL", "stable", "retreating", "surging", "advancing", "unknown"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded px-2 py-0.5 ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s}
                </button>
              ),
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Glacier</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">District</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Area (km²)</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Length (km)</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Elev. range (m)
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">RGI ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredGlaciers.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  No glaciers match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filteredGlaciers.map((g) => (
              <TableRow key={g.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">
                  <Link
                    to="/admin/glaciers/$glacierId"
                    params={{ glacierId: g.id }}
                    className="hover:underline"
                  >
                    {g.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {districtById[g.district_id ?? ""]?.name ?? "—"}
                </TableCell>
                <TableCell className="text-foreground">
                  {g.area_km2 ? Number(g.area_km2).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-foreground">
                  {g.length_km ? Number(g.length_km).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {g.elevation_min_m ?? "—"} – {g.elevation_max_m ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusPill status={g.status} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {g.rgi_id ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
