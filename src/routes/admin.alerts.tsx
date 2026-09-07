import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { TierBadge, type Tier } from "@/lib/tier";
import {
  fetchAlerts,
  fetchAlertAcks,
  fetchLakesAdmin,
  adminRequest,
} from "@/lib/cryohealth-client";
import { alertUpdateSchema, type AlertUpdate } from "@/lib/admin-schemas";
import { useAuth } from "@/lib/auth";
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

export const Route = createFileRoute("/admin/alerts")({
  head: () => ({
    meta: [{ title: "Alerts — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: AlertsAdmin,
});

type AlertRow = {
  id: string;
  title: string;
  body: string;
  tier: Tier;
  estimatedWindow: string | null;
  affectedPopulation: number | null;
  createdAt: string;
  status: "active" | "cleared";
  clearedAt: string | null;
  lakeName: string | null;
  districtName: string | null;
};

type AckRow = { alert_id: string; chw_id: string; acknowledged_at: string };

function dependentsMessage(dependents: Record<string, number>): string {
  const parts = Object.entries(dependents)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  return `Cannot delete: still referenced by ${parts}.`;
}

function AlertsAdmin() {
  const qc = useQueryClient();
  const [tierFilter, setTierFilter] = useState<"ALL" | Tier>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "cleared">("ALL");
  const [search, setSearch] = useState("");
  const [editingAlert, setEditingAlert] = useState<AlertRow | null>(null);
  const [clearingAlert, setClearingAlert] = useState<AlertRow | null>(null);
  const [deletingAlert, setDeletingAlert] = useState<AlertRow | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const {
    data: alertsResponse,
    isLoading,
    isError: alertsError,
  } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async (): Promise<{ alerts: AlertRow[]; total: number; hasMore: boolean }> => {
      const r = await fetchAlerts();
      return {
        alerts: r.alerts ?? [],
        total: r.total ?? 0,
        hasMore: r.hasMore ?? false,
      };
    },
  });

  const alerts = alertsResponse?.alerts ?? [];
  const alertsTotal = alertsResponse?.total ?? 0;
  const alertsHasMore = alertsResponse?.hasMore ?? false;

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AlertUpdate }) => {
      const { ok, body } = await adminRequest(`/admin/alerts/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!ok) throw new Error(body.error ?? "Failed to update alert");
      return body.alert;
    },
    onSuccess: () => {
      toast.success("Alert updated");
      qc.invalidateQueries({ queryKey: ["admin-alerts"] });
      setEditingAlert(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { ok, body } = await adminRequest(`/admin/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!ok) throw new Error(body.error ?? "Failed to clear alert");
      return body.alert;
    },
    onSuccess: () => {
      toast.success("Alert cleared");
      qc.invalidateQueries({ queryKey: ["admin-alerts"] });
      setClearingAlert(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { ok, body } = await adminRequest(
        `/admin/alerts/${id}?reason=${encodeURIComponent(reason)}`,
        { method: "DELETE" },
      );
      if (!ok) {
        throw new Error(
          body.dependents
            ? dependentsMessage(body.dependents)
            : (body.error ?? "Failed to delete alert"),
        );
      }
      return body;
    },
    onSuccess: () => {
      toast.success("Alert deleted");
      qc.invalidateQueries({ queryKey: ["admin-alerts"] });
      setDeletingAlert(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const { data: acks, isError: acksError } = useQuery({
    queryKey: ["admin-alert-acks"],
    queryFn: async (): Promise<AckRow[]> => {
      return (await fetchAlertAcks()).acks ?? [];
    },
  });
  const isError = alertsError || acksError;

  const ackCount = (alertId: string) => (acks ?? []).filter((a) => a.alert_id === alertId).length;

  const filteredAlerts = (alerts ?? []).filter((a) => {
    if (tierFilter !== "ALL" && a.tier !== tierFilter) return false;
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          {alertsHasMore
            ? `Showing the latest ${alerts.length} of ${alertsTotal.toLocaleString()} alerts, including cleared · acknowledgements shown as a count, view-only`
            : `${alertsTotal.toLocaleString()} alerts, including cleared · acknowledgements shown as a count, view-only`}
        </p>
      </header>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setShowBroadcast((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
        >
          {showBroadcast ? "Close broadcast form" : "Broadcast new alert"}
        </button>
      </div>
      {showBroadcast && (
        <BroadcastForm
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["admin-alerts"] });
            qc.invalidateQueries({ queryKey: ["alerts-all"] });
          }}
        />
      )}

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
          {alertsError && acksError
            ? "alerts or acknowledgements"
            : alertsError
              ? "alerts"
              : "acknowledgements"}
          . Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          />
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
          <div className="flex gap-1 rounded-md border border-border bg-background p-0.5 text-xs">
            {(["ALL", "active", "cleared"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded px-2 py-0.5 ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Tier</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Title</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Target</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Window</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Affected</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Acks</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Issued</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">
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
            {!isLoading && !isError && filteredAlerts.length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                  No alerts match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filteredAlerts.map((a) => (
              <TableRow key={a.id} className="border-border hover:bg-secondary/40">
                <TableCell>
                  <TierBadge tier={a.tier} />
                </TableCell>
                <TableCell className="font-semibold text-foreground">{a.title}</TableCell>
                <TableCell>
                  {a.status === "cleared" ? (
                    <span className="inline-flex flex-col gap-0.5">
                      <span className="inline-flex w-fit rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                        Cleared
                      </span>
                      {a.clearedAt && (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(a.clearedAt).toLocaleString()}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex w-fit rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                      Active
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {a.lakeName ?? a.districtName ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {a.estimatedWindow ?? "—"}
                </TableCell>
                <TableCell className="text-foreground">
                  {(a.affectedPopulation ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-foreground">{ackCount(a.id)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingAlert(a)}>
                      Edit
                    </Button>
                    {a.status === "active" && (
                      <Button variant="outline" size="sm" onClick={() => setClearingAlert(a)}>
                        Clear
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setDeletingAlert(a)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingAlert && (
        <AlertEditDialog
          alert={editingAlert}
          onOpenChange={(open) => !open && setEditingAlert(null)}
          onSubmit={(values) => updateMutation.mutate({ id: editingAlert.id, values })}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertReasonDialog
        alert={clearingAlert}
        title={(alert) => `Clear "${alert.title}"?`}
        description="The alert stays in the log as cleared — this doesn't delete it, and a new
          alert can be raised for the same lake and tier afterwards."
        confirmLabel="Clear alert"
        reasonPlaceholder="Why is this alert being cleared?"
        onOpenChange={(open) => !open && setClearingAlert(null)}
        onConfirm={(reason) => {
          if (clearingAlert) clearMutation.mutate({ id: clearingAlert.id, reason });
        }}
        isPending={clearMutation.isPending}
      />

      <AlertReasonDialog
        alert={deletingAlert}
        title={(alert) => `Delete "${alert.title}"?`}
        description="This cannot be undone and removes the alert entirely, including from the
          public feed. Consider Clear instead if you just want to close it out."
        confirmLabel="Delete"
        reasonPlaceholder="Why is this alert being deleted?"
        onOpenChange={(open) => !open && setDeletingAlert(null)}
        onConfirm={(reason) => {
          if (deletingAlert) deleteMutation.mutate({ id: deletingAlert.id, reason });
        }}
        isPending={deleteMutation.isPending}
      />
    </main>
  );
}

const ALERT_TIERS = ["normal", "watch", "high", "critical"] as const;

function AlertEditDialog({
  alert,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  alert: AlertRow;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AlertUpdate) => void;
  isPending: boolean;
}) {
  const form = useForm<AlertUpdate>({
    resolver: zodResolver(alertUpdateSchema),
    defaultValues: {
      body: alert.body,
      tier: alert.tier.toLowerCase() as AlertUpdate["tier"],
      estimatedWindow: alert.estimatedWindow,
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit alert</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALERT_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
              name="estimatedWindow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated window (optional)</FormLabel>
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
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** Shared by the Clear and Delete actions -- both are audit-significant state
 *  transitions that require a human-supplied reason (CLAUDE.md alert-policy rule),
 *  same UX shape as DeleteLakeDialog in admin.lakes.index.tsx. */
function AlertReasonDialog({
  alert,
  title,
  description,
  confirmLabel,
  reasonPlaceholder,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  alert: AlertRow | null;
  title: (alert: AlertRow) => string;
  description: string;
  confirmLabel: string;
  reasonPlaceholder: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (alert) setReason("");
  }, [alert]);

  return (
    <AlertDialog open={alert !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{alert ? title(alert) : ""}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="alert-reason">Reason (required)</Label>
          <Input
            id="alert-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={reason.trim().length === 0 || isPending}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BroadcastForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tier, setTier] = useState<Tier>("WATCH");
  const [lakeId, setLakeId] = useState<string>("");
  const [windowStart, setWindowStart] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: lakes } = useQuery({
    queryKey: ["lakes-min"],
    queryFn: async () => {
      const { lakes } = await fetchLakesAdmin();
      return (lakes ?? []) as { id: string; name: string; district_id: string | null }[];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (!reason.trim()) {
      toast.error("A reason is required (for audit purposes)");
      return;
    }
    setSubmitting(true);
    const result = await adminRequest("/alerts", {
      method: "POST",
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        tier: tier.toLowerCase(),
        lakeId: lakeId || null,
        windowStart: windowStart.trim() || null,
        reason: reason.trim(),
      }),
    });
    setSubmitting(false);
    if (!result.ok) {
      const err = result.body as { message?: string[]; error?: string };
      const msg = Array.isArray(err.message)
        ? err.message.join("; ")
        : (err.error ?? "Failed to broadcast alert");
      toast.error(msg);
      return;
    }
    toast.success("Alert broadcast");
    setTitle("");
    setBody("");
    setLakeId("");
    setWindowStart("");
    setReason("");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Broadcast new alert</h2>
        <span className="text-xs text-muted-foreground">Sender: {user?.name ?? user?.id}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </label>
        <label htmlFor="alert-tier" className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Risk tier</span>
          <select
            id="alert-tier"
            aria-label="Risk tier"
            value={tier}
            onChange={(e) => setTier(e.target.value as Tier)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="normal">NORMAL</option>
            <option value="watch">WATCH</option>
            <option value="high">HIGH</option>
            <option value="critical">CRITICAL</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Window start</span>
          <input
            value={windowStart}
            onChange={(e) => setWindowStart(e.target.value)}
            placeholder="e.g. next 24h"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label htmlFor="alert-lake" className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Target lake</span>
          <select
            id="alert-lake"
            aria-label="Target lake"
            value={lakeId}
            onChange={(e) => setLakeId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {(lakes ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Reason (required for audit)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this alert being issued?"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Message</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Broadcasting…" : "Broadcast alert"}
        </button>
      </div>
    </form>
  );
}
