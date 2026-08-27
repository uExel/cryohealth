import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-client";
import { glacierCreateSchema, type GlacierCreate } from "@/lib/admin-schemas";
import { StatusPill } from "@/components/cryohealth/StatCard";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/admin/glaciers/")({
  head: () => ({
    meta: [{ title: "Glaciers — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: GlaciersAdmin,
});

const GLACIER_STATUSES = ["stable", "retreating", "advancing", "surging", "unknown"] as const;

type DistrictRow = { id: string; name: string; province: string };
type GlacierRow = {
  id: string;
  name: string;
  rgi_id: string | null;
  glims_id: string | null;
  district_id: string | null;
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
};

type DialogState = { mode: "create" } | { mode: "edit"; glacier: GlacierRow } | null;

function dependentsMessage(dependents: Record<string, number>): string {
  const parts = Object.entries(dependents)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  return `Cannot delete: still referenced by ${parts}.`;
}

function GlaciersAdmin() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "stable" | "retreating" | "advancing" | "surging" | "unknown"
  >("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [deletingGlacier, setDeletingGlacier] = useState<GlacierRow | null>(null);

  const { data: districts, isError: districtsError } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> => {
      const res = await fetch("/api/public/districts");
      if (!res.ok) throw new Error(`districts fetch failed: ${res.status}`);
      return (await res.json()).districts ?? [];
    },
  });
  const {
    data: glaciers,
    isLoading,
    isError: glaciersError,
  } = useQuery({
    queryKey: ["admin-glaciers"],
    queryFn: async (): Promise<GlacierRow[]> => {
      const res = await fetch("/api/public/glaciers");
      if (!res.ok) throw new Error(`glaciers fetch failed: ${res.status}`);
      return (await res.json()).glaciers ?? [];
    },
  });
  const isError = districtsError || glaciersError;

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

  const createMutation = useMutation({
    mutationFn: async (values: GlacierCreate) => {
      const res = await authFetch("/api/admin/glaciers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create glacier");
      return body.glacier;
    },
    onSuccess: () => {
      toast.success("Glacier created");
      qc.invalidateQueries({ queryKey: ["admin-glaciers"] });
      setDialogState(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: GlacierCreate }) => {
      const res = await authFetch(`/api/admin/glaciers/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update glacier");
      return body.glacier;
    },
    onSuccess: (_data, variables) => {
      toast.success("Glacier updated");
      qc.invalidateQueries({ queryKey: ["admin-glaciers"] });
      qc.invalidateQueries({ queryKey: ["admin-glacier", variables.id] });
      setDialogState(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await authFetch(
        `/api/admin/glaciers/${id}?reason=${encodeURIComponent(reason)}`,
        {
          method: "DELETE",
        },
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          body.dependents
            ? dependentsMessage(body.dependents)
            : (body.error ?? "Failed to delete glacier"),
        );
      }
      return body;
    },
    onSuccess: () => {
      toast.success("Glacier deleted");
      qc.invalidateQueries({ queryKey: ["admin-glaciers"] });
      setDeletingGlacier(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Glaciers</h1>
          <p className="text-sm text-muted-foreground">
            {glaciers?.length ?? 0} glaciers · sourced from Randolph Glacier Inventory v7 (RGI
            Consortium, 2023) · GLIMS / NSIDC
          </p>
        </div>
        <Button onClick={() => setDialogState({ mode: "create" })}>New glacier</Button>
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
          {districtsError && glaciersError
            ? "districts or glaciers"
            : districtsError
              ? "districts"
              : "glaciers"}
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
              <TableHead className="text-xs uppercase text-muted-foreground">Observed</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground text-right">
                Actions
              </TableHead>
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
            {!isLoading && !isError && filteredGlaciers.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
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
                <TableCell className="text-xs text-muted-foreground">
                  {g.last_observed ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogState({ mode: "edit", glacier: g })}
                    >
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeletingGlacier(g)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {dialogState && (
        <GlacierFormDialog
          key={dialogState.mode === "edit" ? dialogState.glacier.id : "create"}
          initial={dialogState.mode === "edit" ? dialogState.glacier : null}
          districts={districts ?? []}
          onOpenChange={(open) => !open && setDialogState(null)}
          onSubmit={(values) => {
            if (dialogState.mode === "edit") {
              updateMutation.mutate({ id: dialogState.glacier.id, values });
            } else {
              createMutation.mutate(values);
            }
          }}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <DeleteGlacierDialog
        glacier={deletingGlacier}
        onOpenChange={(open) => !open && setDeletingGlacier(null)}
        onConfirm={(reason) => {
          if (deletingGlacier) deleteMutation.mutate({ id: deletingGlacier.id, reason });
        }}
        isPending={deleteMutation.isPending}
      />
    </main>
  );
}

const NO_DISTRICT = "__none__";

function GlacierFormDialog({
  initial,
  districts,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  initial: GlacierRow | null;
  districts: DistrictRow[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GlacierCreate) => void;
  isPending: boolean;
}) {
  const form = useForm<GlacierCreate>({
    resolver: zodResolver(glacierCreateSchema),
    defaultValues: {
      name: initial?.name ?? "",
      rgi_id: initial?.rgi_id ?? undefined,
      glims_id: initial?.glims_id ?? undefined,
      district_id: initial?.district_id ?? undefined,
      lat: initial?.lat ?? undefined,
      lng: initial?.lng ?? undefined,
      area_km2: initial?.area_km2 ?? undefined,
      length_km: initial?.length_km ?? undefined,
      elevation_min_m: initial?.elevation_min_m ?? undefined,
      elevation_max_m: initial?.elevation_max_m ?? undefined,
      status: (initial?.status as GlacierCreate["status"]) ?? "unknown",
      terminus_type: initial?.terminus_type ?? undefined,
      source: initial?.source ?? "",
      last_observed: initial?.last_observed ?? undefined,
      notes: initial?.notes ?? undefined,
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit glacier" : "New glacier"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="district_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <Select
                    value={field.value ?? NO_DISTRICT}
                    onValueChange={(v) => field.onChange(v === NO_DISTRICT ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_DISTRICT}>No district</SelectItem>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GLACIER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="terminus_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terminus type (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : e.target.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="area_km2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area, km² (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="length_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length, km (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="elevation_min_m"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Elevation min, m (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="elevation_max_m"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Elevation max, m (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rgi_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RGI ID (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : e.target.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="glims_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GLIMS ID (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : e.target.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. RGI v7 (RGI Consortium, 2023), or a field survey citation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_observed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last observed (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : e.target.value)
                      }
                      placeholder="e.g. 2026-06-01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : e.target.value)
                      }
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {initial ? "Save changes" : "Create glacier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGlacierDialog({
  glacier,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  glacier: GlacierRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (glacier) setReason("");
  }, [glacier]);

  return (
    <AlertDialog open={glacier !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{glacier?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. If any observations are recorded for this glacier, the delete
            will be blocked instead of silently destroying that pipeline history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="glacier-delete-reason">Reason (required)</Label>
          <Input
            id="glacier-delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this glacier being deleted?"
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
