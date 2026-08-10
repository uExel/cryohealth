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

export const Route = createFileRoute("/admin/districts")({
  head: () => ({
    meta: [{ title: "Districts — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: DistrictsAdmin,
});

type DistrictRow = { id: string; name: string; province: string };

function DistrictsAdmin() {
  const { data: districts, isLoading } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> =>
      (await (await fetch("/api/public/districts")).json()).districts ?? [],
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Districts</h1>
        <p className="text-sm text-muted-foreground">{districts?.length ?? 0} districts</p>
      </header>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Province</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (districts ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  No districts yet.
                </TableCell>
              </TableRow>
            )}
            {(districts ?? []).map((d) => (
              <TableRow key={d.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.province}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
