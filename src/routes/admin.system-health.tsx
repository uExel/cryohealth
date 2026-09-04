import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchSystemHealth, adminRequest } from "@/lib/cryohealth-client";
import { CryoHealthAdminOnly } from "@/components/cryohealth/AdminPlaceholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/admin/system-health")({
  head: () => ({
    meta: [{ title: "System health — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: SystemHealthAdmin,
});

// Mirrors the shapes returned by /api/admin/system-health (see that route + cryohealth-api.ts /
// cryohealth-geo.ts). `status` stays a plain string so an unexpected value from a service is
// shown verbatim rather than mismatched against a union.
type ApiHealth = { status: string; database: string };
type GeoHealth = { status: string; scheduler_running: boolean };
type Probe<T> = { reachable: true; data: T } | { reachable: false; error: string };
type HealthResponse = { api: Probe<ApiHealth>; geo: Probe<GeoHealth>; checkedAt: string };

type StatusRow = { label: string; value: string };
type RunAction = "run" | "run-hazard";

// Response types for pipeline actions
type PipelineResponse = {
  success: boolean;
  message: string;
  jobId: string;
};

type AdminRequestResult<T> = {
  ok: boolean;
  status?: number;
  body: T;
};

// The page polls its own server route; the browser never calls CryoHealth-geo directly (no CORS
// on that service — the server route proxies). 10s is frequent enough to watch a triggered run
// flip the scheduler/status without hammering two upstream services.
const POLL_INTERVAL_MS = 10_000;

function SystemHealthAdmin() {
  const { isCryoHealthAdmin } = useAuth();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<RunAction | null>(null);

  // The server route enforces this too (403 from requireRole) — `enabled` only avoids firing a
  // poll that would 403 for a facility_admin who reached this component by guessing the URL.
  const enabled = isCryoHealthAdmin;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-system-health"],
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    queryFn: async (): Promise<HealthResponse> => {
      const result = await fetchSystemHealth();
      // Type guard: ensure result is HealthResponse
      if (!result || typeof result !== "object") {
        throw new Error("Invalid health response");
      }
      return result as HealthResponse;
    },
  });

  const runMutation = useMutation({
    mutationFn: async (action: RunAction) => {
      const result = await adminRequest(`/admin/health/${action}`, { method: "POST" });

      // Type guard: cast result to AdminRequestResult<PipelineResponse>
      const typedResult = result as AdminRequestResult<PipelineResponse>;

      if (!typedResult.ok) {
        const errorMessage =
          typedResult.body && typeof typedResult.body === "object" && "error" in typedResult.body
            ? (typedResult.body as { error?: string }).error
            : `Request failed (${typedResult.status})`;
        throw new Error(errorMessage || `Request failed`);
      }
      return typedResult.body;
    },
    onSuccess: (_body, action) => {
      toast.success(action === "run" ? "Pipeline run started" : "Hazard pass started");
      qc.invalidateQueries({ queryKey: ["admin-system-health"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isCryoHealthAdmin) return <CryoHealthAdminOnly />;

  const api = data?.api;
  const geo = data?.geo;
  const checkedLabel = data ? new Date(data.checkedAt).toLocaleTimeString() : null;

  // Rows are built imperatively (not as an inline JSX ternary) so each line stays simple and the
  // reachable-narrowing on `api`/`geo` is unambiguous to the type checker.
  const apiRows: StatusRow[] = [];
  if (api && api.reachable) {
    apiRows.push({ label: "Status", value: api.data.status });
    apiRows.push({ label: "Database", value: api.data.database });
  }
  const geoRows: StatusRow[] = [];
  if (geo && geo.reachable) {
    const scheduler = geo.data.scheduler_running ? "Running" : "Stopped";
    geoRows.push({ label: "Status", value: geo.data.status });
    geoRows.push({ label: "Scheduler", value: scheduler });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">System health</h1>
          <p className="text-sm text-muted-foreground">
            Live status of CryoHealth-api and CryoHealth-geo, refreshed automatically.
          </p>
        </div>
        {checkedLabel && (
          <p className="whitespace-nowrap text-xs text-muted-foreground">
            Last checked {checkedLabel}
          </p>
        )}
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
          Couldn't reach the system-health endpoint — the statuses below may be stale.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ServiceCard
          name="CryoHealth-api"
          subtitle="Alerts, cases & reference data"
          loading={isLoading}
          probe={api}
          rows={apiRows}
        />
        <ServiceCard
          name="CryoHealth-geo"
          subtitle="Hazard ingest & scoring pipeline"
          loading={isLoading}
          probe={geo}
          rows={geoRows}
        />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold text-foreground">Pipeline actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trigger a CryoHealth-geo pass now instead of waiting for its scheduler run.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={runMutation.isPending}
            onClick={() => setConfirming("run")}
          >
            Run now
          </Button>
          <Button
            variant="outline"
            disabled={runMutation.isPending}
            onClick={() => setConfirming("run-hazard")}
          >
            Run hazard pass now
          </Button>
        </div>
      </section>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming === "run-hazard" ? "Run hazard pass now?" : "Run pipeline now?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming === "run-hazard"
                ? "Re-runs hazard scoring against the current data on CryoHealth-geo. Existing lake tiers may change as a result."
                : "Runs a full ingest and scoring pass on CryoHealth-geo now, on top of its scheduled runs."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={runMutation.isPending}
              onClick={(e) => {
                // preventDefault so the dialog doesn't close before the request settles — an
                // upstream 502 (geo down) is an expected outcome that should surface as a toast
                // tied to this action, not vanish with the dialog.
                e.preventDefault();
                if (confirming) {
                  runMutation.mutate(confirming, { onSettled: () => setConfirming(null) });
                }
              }}
            >
              {confirming === "run-hazard" ? "Run hazard pass" : "Run now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function ServiceCard({
  name,
  subtitle,
  loading,
  probe,
  rows,
}: {
  name: string;
  subtitle: string;
  loading: boolean;
  probe: Probe<ApiHealth> | Probe<GeoHealth> | undefined;
  rows: StatusRow[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">{name}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <StatusBadge loading={loading} probe={probe} />
      </div>
      {probe && !probe.reachable && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-on-watch)" }}>
          {probe.error}
        </p>
      )}
      {rows.length > 0 && (
        <dl className="mt-3 space-y-1 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function StatusBadge({
  loading,
  probe,
}: {
  loading: boolean;
  probe: Probe<ApiHealth> | Probe<GeoHealth> | undefined;
}) {
  if (!probe) {
    return <Badge variant="secondary">{loading ? "Checking…" : "Unknown"}</Badge>;
  }
  if (!probe.reachable) {
    return <Badge variant="destructive">Unreachable</Badge>;
  }
  const healthy = probe.data.status === "ok";
  return (
    <Badge variant={healthy ? "default" : "destructive"}>
      {healthy ? "Healthy" : probe.data.status}
    </Badge>
  );
}
