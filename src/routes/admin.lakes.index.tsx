import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { TierBadge, type Tier } from "@/lib/tier";
import { fetchDistricts, fetchLakesAdmin, adminRequest } from "@/lib/cryohealth-client";
import type { LakeCreate } from "@/lib/admin-schemas";
import { LakeFormDialog } from "@/components/cryohealth/LakeFormDialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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

function dependentsMessage(dependents: Record<string, number>): string {
  const parts = Object.entries(dependents)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  return `Cannot delete: still referenced by ${parts}.`;
}

function LakesAdmin() {
  const qc = useQueryClient();
  const [tierFilter, setTierFilter] = useState<"ALL" | Tier>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingLake, setDeletingLake] = useState<LakeRow | null>(null);

  const { data: districts, isError: districtsError } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> => {
      const { districts } = await fetchDistricts();
      return districts as DistrictRow[];
    },
  });
  const {
    data: lakes,
    isLoading,
    isError: lakesError,
  } = useQuery({
    queryKey: ["admin-lakes"],
    queryFn: async (): Promise<LakeRow[]> => {
      const { lakes } = await fetchLakesAdmin();
      return lakes as LakeRow[];
    },
  });
  const isError = districtsError || lakesError;

  const createMutation = useMutation({
    mutationFn: async (values: LakeCreate) => {
      const result = await adminRequest("/admin/lakes", {
        method: "POST",
        body: JSON.stringify(values),
      });
      if (!result.ok) throw new Error(result.body.error ?? "Failed to create lake");
      return result.body.lake;
    },
    onSuccess: () => {
      toast.success("Lake created");
      qc.invalidateQueries({ queryKey: ["admin-lakes"] });
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const result = await adminRequest(`/admin/lakes/${id}?reason=${encodeURIComponent(reason)}`, {
        method: "DELETE",
      });
      if (!result.ok) {
        throw new Error(
          result.body.dependents
            ? dependentsMessage(result.body.dependents)
            : (result.body.error ?? "Failed to delete lake"),
        );
      }
      return result.body;
    },
    onSuccess: () => {
      toast.success("Lake deleted");
      qc.invalidateQueries({ queryKey: ["admin-lakes"] });
      setDeletingLake(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Lakes</h1>
          <p className="text-sm text-muted-foreground">
            {lakes?.length ?? 0} lakes · tier and risk score are policy output — see the Lake detail
            page for the audit trail, not editable here
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New lake</Button>
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
              <TableHead className="text-xs uppercase text-muted-foreground text-right">
                Actions
              </TableHead>
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
            {!isLoading && !isError && filteredLakes.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
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
                  {l.last_updated ? new Date(l.last_updated).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setDeletingLake(l)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {creating && (
        <LakeFormDialog
          initial={null}
          districts={districts ?? []}
          onOpenChange={setCreating}
          onSubmit={(values) => createMutation.mutate(values)}
          isPending={createMutation.isPending}
        />
      )}

      <DeleteLakeDialog
        lake={deletingLake}
        onOpenChange={(open) => !open && setDeletingLake(null)}
        onConfirm={(reason) => {
          if (deletingLake) deleteMutation.mutate({ id: deletingLake.id, reason });
        }}
        isPending={deleteMutation.isPending}
      />
    </main>
  );
}

function DeleteLakeDialog({
  lake,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  lake: LakeRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (lake) setReason("");
  }, [lake]);

  return (
    <AlertDialog open={lake !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{lake?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. If any observations, hazard scores, risk scores, alerts, or
            facilities still reference this lake, the delete will be blocked instead of silently
            destroying that data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="lake-delete-reason">Reason (required)</Label>
          <Input
            id="lake-delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this lake being deleted?"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={reason.trim().length === 0 || isPending}
            onClick={() => onConfirm(reason.trim())}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
