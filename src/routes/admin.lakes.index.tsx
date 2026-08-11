import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { TierBadge, type Tier } from "@/lib/tier";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/lakes/")({
  head: () => ({
    meta: [{ title: "Lakes — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: LakesAdmin,
});

type DistrictRow = { id: string; name: string; province: string };
type LakeRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  current_tier: Tier;
  current_risk_score: string | number | null;
  downstream_population: number | null;
  last_updated: string | null;
  district_id: string | null;
};

function LakesAdmin() {
  const [tierFilter, setTierFilter] = useState<"ALL" | Tier>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const { data: districts, isError: districtsError } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> => {
      const res = await fetch("/api/public/districts");
      if (!res.ok) throw new Error(`districts fetch failed: ${res.status}`);
      return (await res.json()).districts ?? [];
    },
  });
  const {
    data: lakes,
    isLoading,
    isError: lakesError,
  } = useQuery({
    queryKey: ["admin-lakes"],
    queryFn: async (): Promise<LakeRow[]> => {
      const res = await fetch("/api/public/lakes-admin");
      if (!res.ok) throw new Error(`lakes fetch failed: ${res.status}`);
      return (await res.json()).lakes ?? [];
    },
  });
  const isError = districtsError || lakesError;

  const districtById = useMemo(
    () => Object.fromEntries((districts ?? []).map((d) => [d.id, d])),
    [districts],
  );

  const filteredLakes = (lakes ?? []).filter((l) => {
    if (tierFilter !== "ALL" && l.current_tier !== tierFilter) return false;
    if (districtFilter !== "ALL" && l.district_id !== districtFilter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Lakes</h1>
        <p className="text-sm text-muted-foreground">
          {lakes?.length ?? 0} lakes · tier and risk score are policy output — see the Lake detail
          page for the audit trail, not editable here
        </p>
      </header>

      {isError && (
        <div
          className="mb-4 border-2 px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-watch)",
            background: "var(--color-watch-soft)",
            color: "var(--color-on-watch)",
          }}
        >
          Couldn't load{" "}
          {districtsError && lakesError
            ? "districts or lakes"
            : districtsError
              ? "districts"
              : "lakes"}
          . Showing whatever loaded previously, if anything.
        </div>
      )}

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
            {(["ALL", "NORMAL", "WATCH", "HIGH", "CRITICAL"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`rounded px-2 py-0.5 ${tierFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Lake</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">District</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Tier</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Risk score</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Downstream population
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && filteredLakes.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  No lakes match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filteredLakes.map((l) => (
              <TableRow key={l.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">
                  <Link
                    to="/admin/lakes/$lakeId"
                    params={{ lakeId: l.id }}
                    className="hover:underline"
                  >
                    {l.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {districtById[l.district_id ?? ""]?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <TierBadge tier={l.current_tier} />
                </TableCell>
                <TableCell className="text-foreground">
                  {l.current_risk_score != null ? Number(l.current_risk_score).toFixed(0) : "—"}
                </TableCell>
                <TableCell className="text-foreground">
                  {l.downstream_population != null ? l.downstream_population.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.last_updated ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
