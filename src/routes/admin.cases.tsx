import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/cases")({
  head: () => ({
    meta: [{ title: "Cases — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: CasesAdmin,
});

type CaseRow = {
  id: string;
  chw_id: string;
  district_id: string | null;
  patient_age: number | null;
  patient_sex: string | null;
  symptoms: string;
  diagnosis: string | null;
  treatment: string | null;
  outcome: string | null;
  is_disaster_related: boolean;
  created_at: string;
  chw_name: string | null;
  chw_lhw_id: string | null;
  district_name: string | null;
};

function CasesAdmin() {
  const {
    data: cases,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-cases"],
    queryFn: async (): Promise<CaseRow[]> => {
      const res = await authFetch("/api/admin/cases");
      if (!res.ok) throw new Error(`cases fetch failed: ${res.status}`);
      return (await res.json()).cases ?? [];
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Cases</h1>
        <p className="text-sm text-muted-foreground">{cases?.length ?? 0} cases</p>
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
          Couldn't load cases. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Logged</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Disaster</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Patient</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Symptoms</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Diagnosis</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Treatment</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Outcome</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">District</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">CHW</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && (cases ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                  No cases yet.
                </TableCell>
              </TableRow>
            )}
            {(cases ?? []).map((c) => (
              <TableRow key={c.id} className="border-border hover:bg-secondary/40">
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {c.is_disaster_related ? (
                    <span className="inline-flex w-fit rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-ink)]">
                      Disaster
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-foreground">
                  {c.patient_age != null || c.patient_sex != null
                    ? `${c.patient_age ?? "—"} · ${c.patient_sex ?? "—"}`
                    : "—"}
                </TableCell>
                <TableCell className="max-w-xs text-xs text-foreground">
                  <details>
                    <summary className="cursor-pointer text-primary">
                      {c.symptoms.length > 60 ? `${c.symptoms.slice(0, 60)}…` : c.symptoms}
                    </summary>
                    <p className="mt-1 whitespace-pre-line">{c.symptoms}</p>
                  </details>
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {c.diagnosis ?? "—"}
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {c.treatment ?? "—"}
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {c.outcome ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.district_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.chw_name ?? c.chw_lhw_id ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
