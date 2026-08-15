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

export const Route = createFileRoute("/admin/protocols")({
  head: () => ({
    meta: [{ title: "Protocols — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: ProtocolsAdmin,
});

type ProtocolRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  body: string;
  source: string;
  is_disaster: boolean;
  created_at: string;
};

function ProtocolsAdmin() {
  const {
    data: protocols,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-protocols"],
    queryFn: async (): Promise<ProtocolRow[]> => {
      const res = await fetch("/api/public/protocols");
      if (!res.ok) throw new Error(`protocols fetch failed: ${res.status}`);
      return (await res.json()).protocols ?? [];
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Protocols</h1>
        <p className="text-sm text-muted-foreground">
          {protocols?.length ?? 0} protocols · dosing and diagnosis text, lookup-table only — never
          generated
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
          Couldn't load protocols. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Title</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Category</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Disaster</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Source</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Slug</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Body</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Created</TableHead>
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
            {!isLoading && !isError && (protocols ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  No protocols yet.
                </TableCell>
              </TableRow>
            )}
            {(protocols ?? []).map((p) => (
              <TableRow key={p.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">{p.title}</TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell>
                  {p.is_disaster ? (
                    <span className="inline-flex w-fit rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-ink)]">
                      Disaster
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="max-w-[16rem] text-xs text-muted-foreground">
                  {p.source}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.slug}</TableCell>
                <TableCell className="max-w-md text-xs text-foreground">
                  <details>
                    <summary className="cursor-pointer text-primary">
                      {p.body.length > 80 ? `${p.body.slice(0, 80)}…` : p.body}
                    </summary>
                    <p className="mt-1 whitespace-pre-line">{p.body}</p>
                  </details>
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
