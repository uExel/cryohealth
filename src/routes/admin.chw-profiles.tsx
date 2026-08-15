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

export const Route = createFileRoute("/admin/chw-profiles")({
  head: () => ({
    meta: [{ title: "CHW profiles — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: ChwProfilesAdmin,
});

type ChwProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  district_id: string | null;
  phone: string | null;
  language: string;
  created_at: string;
  district_name: string | null;
  user_name: string | null;
  user_lhw_id: string | null;
  active: boolean | null;
};

function ChwProfilesAdmin() {
  const {
    data: profiles,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-chw-profiles"],
    queryFn: async (): Promise<ChwProfileRow[]> => {
      const res = await fetch("/api/public/chw-profiles");
      if (!res.ok) throw new Error(`chw-profiles fetch failed: ${res.status}`);
      return (await res.json()).profiles ?? [];
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">CHW profiles</h1>
        <p className="text-sm text-muted-foreground">{profiles?.length ?? 0} profiles</p>
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
          Couldn't load CHW profiles. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">District</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Phone</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Language</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">User</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Active</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Added</TableHead>
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
            {!isLoading && !isError && (profiles ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No CHW profiles yet. The <span className="font-mono">chw_profiles</span> table
                  exists in the shared schema but no service writes to it — the CHW roster currently
                  lives in Users &amp; roles. Profile creation ships with the CHW profiles CRUD
                  task.
                </TableCell>
              </TableRow>
            )}
            {(profiles ?? []).map((p) => (
              <TableRow key={p.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">{p.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{p.district_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.language}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.user_name ?? p.user_lhw_id ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.active == null ? "—" : p.active ? "Yes" : "No"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
