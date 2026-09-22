import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAlerts, fetchAlertAcks, adminRequest } from "@/lib/cryohealth-client";
import { TierBadge, type Tier } from "@/lib/tier";
import { useAuth } from "@/lib/auth";
import { FreshnessStamp } from "@/components/cryohealth/FreshnessStamp";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — CryoHealth" },
      { name: "description", content: "Live GLOF alert feed for Gilgit Baltistan." },
      { property: "og:title", content: "Alerts — CryoHealth" },
      {
        property: "og:description",
        content:
          "Chronological feed of GLOF alerts with estimated impact windows and affected downstream populations.",
      },
      { property: "og:url", content: "https://cryohealth.io/alerts" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://cryohealth.io/alerts" }],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { user, isAdmin, isCHW } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["alerts-all"],
    queryFn: async (): Promise<
      {
        id: string;
        title: string;
        body_en: string;
        body_ur: string | null;
        tier: string;
        estimated_window: string | null;
        affected_population: number | null;
        created_at: string;
        lake_name: string | null;
        district_name: string | null;
      }[]
    > => {
      const { alerts } = await fetchAlerts();
      return alerts;
    },
  });

  const { data: acks } = useQuery({
    queryKey: ["alert-acks", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async (): Promise<{ alert_id: string; chw_id: string; acknowledged_at: string }[]> => {
      const { acks } = await fetchAlertAcks();
      return acks;
    },
  });

  const ackMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user) throw new Error("Sign in required");
      const result = await adminRequest("/admin/alerts", {
        method: "POST",
        body: JSON.stringify({ alertId }),
      });
      if (!result.ok)
        throw new Error((result.body as { error?: string })?.error ?? "Failed to acknowledge");
    },
    onSuccess: () => {
      toast.success("Acknowledged");
      qc.invalidateQueries({ queryKey: ["alert-acks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myAckSet = new Set(
    (acks ?? []).filter((a) => a.chw_id === user?.id).map((a) => a.alert_id),
  );
  const ackCount = (alertId: string) => (acks ?? []).filter((a) => a.alert_id === alertId).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold text-foreground">Alert feed</h1>
      <p className="text-sm text-muted-foreground">
        Every alert issued, when it went out, through which channel and whether it was acknowledged.
        This feed is public. Most recent first.
      </p>
      <FreshnessStamp
        lastUpdated={data && data.length > 0 ? data[0].created_at : null}
        className="mt-1 text-muted-foreground"
      />
      <ul className="mt-4 space-y-3">
        {(data ?? []).map((a) => (
          <li key={a.id} className="flex rounded-xl border border-border bg-card">
            <span
              className="w-2 flex-none self-stretch"
              style={{
                background: `var(--color-${a.tier.toLowerCase()})`,
              }}
            />
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()} · {a.district_name ?? "—"} · window{" "}
                    {a.estimated_window ?? "—"} · ~{a.affected_population?.toLocaleString() ?? 0}{" "}
                    affected
                  </div>
                </div>
                <TierBadge tier={a.tier as Tier} solid={a.tier === "CRITICAL"} />
              </div>
              <p className="mt-2 text-sm text-foreground">{a.body_en}</p>
              {a.body_ur && (
                <p dir="rtl" className="mt-1 text-sm text-muted-foreground">
                  {a.body_ur}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2">
                {isAdmin ? (
                  <span className="text-xs text-muted-foreground">
                    {ackCount(a.id)} CHW acknowledgement{ackCount(a.id) === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {ackCount(a.id)} acknowledged
                  </span>
                )}
                {isCHW &&
                  (myAckSet.has(a.id) ? (
                    <span className="text-xs font-semibold text-[var(--color-normal)]">
                      ✓ You acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => ackMutation.mutate(a.id)}
                      disabled={ackMutation.isPending}
                      className="rounded-md border border-border bg-background px-3 py-1 text-xs hover:bg-accent"
                    >
                      Acknowledge
                    </button>
                  ))}
              </div>
            </div>
          </li>
        ))}
        {data && data.length === 0 && (
          <li className="text-sm text-muted-foreground">No alerts yet.</li>
        )}
      </ul>
    </main>
  );
}
