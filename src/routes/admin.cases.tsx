import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/auth-client";
import { caseCreateSchema, type CaseCreate, type CaseUpdate } from "@/lib/admin-schemas";
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
import { Switch } from "@/components/ui/switch";
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

type DistrictRow = { id: string; name: string };

type UserRow = { id: string; name: string; role: string; lhw_id: string | null; active: boolean };

/* Prose kept in module-scope constants rather than inline JSX text: Prettier reflows JSX
 * text children to the print width, and these read better as fixed sentences.
 */
const SOFT_DELETE_EXPLANATION =
  "Deleting hides the case from this list and from the public district page. The row is " +
  "kept in Postgres with deleted_at set — the audit trail and the CHW's record stay " +
  "intact, and nothing is erased. Restoring it is not possible from the portal yet, so " +
  "treat this as final.";

const ROSTER_GATED_HINT =
  "Logging a case needs the CHW roster, which is cryohealth_admin-only. Editing and " +
  "deleting existing cases works for both admin roles.";

const CHW_LOCKED_HINT =
  "A case stays attributed to the CHW who logged it — re-pointing it at someone else " +
  "would rewrite clinical provenance. To correct it, delete this case and log a new one.";

function CasesAdmin() {
  const { isCryoHealthAdmin } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseRow | null>(null);
  const [deletingCase, setDeletingCase] = useState<CaseRow | null>(null);

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

  const { data: districts } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> => {
      const res = await fetch("/api/public/districts");
      if (!res.ok) throw new Error(`districts fetch failed: ${res.status}`);
      return (await res.json()).districts ?? [];
    },
  });

  // The CHW picker needs a users.id (cases.chw_id FKs it ON DELETE RESTRICT), and the
  // only endpoint listing users is cryohealth_admin-only by design (#16). So a
  // facility_admin can edit and soft-delete cases but not create one — named openly in
  // ROSTER_GATED_HINT rather than worked around with the chw_profiles roster, whose
  // user_id is nullable and would hand back IDs that violate the FK.
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    enabled: isCryoHealthAdmin,
    queryFn: async (): Promise<UserRow[]> => {
      const res = await authFetch("/api/admin/users");
      if (!res.ok) throw new Error(`users fetch failed: ${res.status}`);
      return (await res.json()).users ?? [];
    },
  });

  const chwOptions = (users ?? []).filter((u) => u.role === "chw" && u.active);

  const createMutation = useMutation({
    mutationFn: async (values: CaseCreate) => {
      const res = await authFetch("/api/admin/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create case");
      return body.case;
    },
    onSuccess: () => {
      toast.success("Case logged");
      qc.invalidateQueries({ queryKey: ["admin-cases"] });
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CaseUpdate }) => {
      const res = await authFetch(`/api/admin/cases/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update case");
      return body.case;
    },
    onSuccess: () => {
      toast.success("Case updated");
      qc.invalidateQueries({ queryKey: ["admin-cases"] });
      setEditingCase(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await authFetch(`/api/admin/cases/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete case");
      return body;
    },
    onSuccess: () => {
      toast.success("Case deleted — the row is retained with deleted_at set");
      qc.invalidateQueries({ queryKey: ["admin-cases"] });
      setDeletingCase(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cases</h1>
          <p className="text-sm text-muted-foreground">{cases?.length ?? 0} cases</p>
        </div>
        <div className="text-right">
          <Button disabled={!isCryoHealthAdmin} onClick={() => setCreating(true)}>
            New case
          </Button>
          {!isCryoHealthAdmin && (
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{ROSTER_GATED_HINT}</p>
          )}
        </div>
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
              <TableHead className="text-right text-xs uppercase text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && (cases ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingCase(c)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeletingCase(c)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {creating && (
        <CaseFormDialog
          districts={districts ?? []}
          chws={chwOptions}
          onOpenChange={(open) => !open && setCreating(false)}
          onSubmit={(values) => createMutation.mutate(values)}
          isPending={createMutation.isPending}
        />
      )}

      {editingCase && (
        <CaseFormDialog
          initial={editingCase}
          districts={districts ?? []}
          chws={chwOptions}
          onOpenChange={(open) => !open && setEditingCase(null)}
          onSubmit={(values) => {
            // chw_id is create-only and caseUpdateSchema is .strict(), so sending it
            // would 400. Stripped here rather than letting the create-shaped form
            // dictate the PUT body.
            const { chw_id: _chwId, ...patch } = values;
            updateMutation.mutate({ id: editingCase.id, values: patch });
          }}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog
        open={deletingCase !== null}
        onOpenChange={(open) => !open && setDeletingCase(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this case?</AlertDialogTitle>
            <AlertDialogDescription>{SOFT_DELETE_EXPLANATION}</AlertDialogDescription>
          </AlertDialogHeader>
          {deletingCase && (
            <p className="text-xs text-muted-foreground">
              Logged {new Date(deletingCase.created_at).toLocaleString()} by{" "}
              {deletingCase.chw_name ?? deletingCase.chw_lhw_id ?? "an unknown CHW"}.
            </p>
          )}
          <DeleteReasonField
            onConfirm={(reason) => {
              if (deletingCase) deleteMutation.mutate({ id: deletingCase.id, reason });
            }}
            isPending={deleteMutation.isPending}
          />
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function DeleteReasonField({
  onConfirm,
  isPending,
}: {
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="case-delete-reason">Reason (required)</Label>
        <Input
          id="case-delete-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this case being deleted?"
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
    </>
  );
}

/** One dialog for both create and edit. The resolver is always `caseCreateSchema` — the
 *  edit path strips `chw_id` from the submitted values (see the caller) because
 *  `caseUpdateSchema` rejects it. In edit mode the CHW is shown as read-only text rather
 *  than hidden, so it is clear the attribution exists and is deliberately locked. */
function CaseFormDialog({
  initial,
  districts,
  chws,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  initial?: CaseRow;
  districts: DistrictRow[];
  chws: UserRow[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CaseCreate) => void;
  isPending: boolean;
}) {
  const form = useForm<CaseCreate>({
    resolver: zodResolver(caseCreateSchema),
    defaultValues: initial
      ? {
          chw_id: initial.chw_id,
          district_id: initial.district_id,
          patient_age: initial.patient_age,
          patient_sex: initial.patient_sex,
          symptoms: initial.symptoms,
          diagnosis: initial.diagnosis,
          treatment: initial.treatment,
          outcome: initial.outcome,
          is_disaster_related: initial.is_disaster_related,
        }
      : {
          chw_id: "",
          district_id: null,
          patient_age: null,
          patient_sex: null,
          symptoms: "",
          diagnosis: null,
          treatment: null,
          outcome: null,
          is_disaster_related: false,
        },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit case" : "Log a case"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {initial ? (
              <div className="space-y-1">
                <Label>CHW</Label>
                <p className="text-sm text-foreground">
                  {initial.chw_name ?? initial.chw_lhw_id ?? initial.chw_id}
                </p>
                <p className="text-xs text-muted-foreground">{CHW_LOCKED_HINT}</p>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="chw_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CHW</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the CHW who logged this" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {chws.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.lhw_id ? `${u.name} · ${u.lhw_id}` : u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="district_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District (optional)</FormLabel>
                  <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No district" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symptoms</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="patient_age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient age (optional)</FormLabel>
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
              name="patient_sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient sex (optional)</FormLabel>
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
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={2}
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
              name="treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={2}
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
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome (optional)</FormLabel>
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
              name="is_disaster_related"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <FormLabel>Disaster-related</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {initial ? "Save changes" : "Log case"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
