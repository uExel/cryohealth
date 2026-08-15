import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/facilities")({
  head: () => ({
    meta: [{ title: "Facilities — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: FacilitiesAdmin,
});

type FacilityRow = {
  id: string;
  name: string;
  type: string;
  district: string;
  vulnerability: string;
  contact: string | null;
  lat: number | null;
  lng: number | null;
  has_geom: boolean;
  lake_id: string | null;
  created_at: string;
};

function FacilitiesAdmin() {
  const {
    data: facilities,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-facilities"],
    queryFn: async (): Promise<FacilityRow[]> => {
      const res = await fetch("/api/public/facilities-admin");
      if (!res.ok) throw new Error(`facilities fetch failed: ${res.status}`);
      return (await res.json()).facilities ?? [];
    },
  });

  const unmappedCount = (facilities ?? []).filter((f) => !f.has_geom).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Facilities</h1>
        <p className="text-sm text-muted-foreground">
          {facilities?.length ?? 0} facilities
          {unmappedCount > 0
            ? ` · ${unmappedCount} with no mapped location (hidden from the hazard map)`
            : ""}
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
          Couldn't load facilities. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Type</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">District</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Vulnerability
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Mapped</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Lat / Lng</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Contact</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && (facilities ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  No facilities yet.
                </TableCell>
              </TableRow>
            )}
            {(facilities ?? []).map((f) => (
              <TableRow key={f.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">{f.name}</TableCell>
                <TableCell className="text-muted-foreground uppercase">{f.type}</TableCell>
                <TableCell className="text-muted-foreground">{f.district}</TableCell>
                <TableCell className="text-muted-foreground">{f.vulnerability}</TableCell>
                <TableCell>
                  {f.has_geom ? (
                    "Yes"
                  ) : (
                    <span className="text-xs text-muted-foreground">No location</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {f.lat != null && f.lng != null
                    ? `${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{f.contact ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
