import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authFetch } from "@/lib/auth-client";
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
      const res = await fetch("/api/public/alerts");
      const body = await res.json();
      return body.alerts ?? [];
    },
  });

  const { data: acks } = useQuery({
    queryKey: ["alert-acks", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async (): Promise<{ alert_id: string; chw_id: string; acknowledged_at: string }[]> => {
      const res = await fetch("/api/public/alert-acks");
      const body = await res.json();
      return body.acks ?? [];
    },
  });

  const ackMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user) throw new Error("Sign in required");
      const res = await authFetch("/api/public/alert-acks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to acknowledge");
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
      {isAdmin && (
        <BroadcastForm onCreated={() => qc.invalidateQueries({ queryKey: ["alerts-all"] })} />
      )}
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

function BroadcastForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyUr, setBodyUr] = useState("");
  const [tier, setTier] = useState<Tier>("WATCH");
  const [lakeId, setLakeId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");
  const [estimatedWindow, setEstimatedWindow] = useState("");
  const [affected, setAffected] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: lakes } = useQuery({
    queryKey: ["lakes-min"],
    queryFn: async () => {
      const res = await fetch("/api/public/lakes-admin");
      const body = await res.json();
      return (body.lakes ?? []) as { id: string; name: string; district_id: string | null }[];
    },
  });
  const { data: districts } = useQuery({
    queryKey: ["districts-min"],
    queryFn: async () => {
      const res = await fetch("/api/public/districts");
      const body = await res.json();
      return (body.districts ?? []) as { id: string; name: string }[];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !bodyEn.trim()) {
      toast.error("Title and English body are required");
      return;
    }
    if (!lakeId && !districtId) {
      toast.error("Select a target lake or district");
      return;
    }
    const lakeDistrict = lakes?.find((l) => l.id === lakeId)?.district_id ?? null;
    if (lakeId && districtId && lakeDistrict && lakeDistrict !== districtId) {
      toast.error(
        "Selected lake belongs to a different district. Clear one to resolve the conflict.",
      );
      return;
    }
    setSubmitting(true);
    const resolvedDistrict = districtId || lakeDistrict || null;
    const res = await authFetch("/api/public/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        bodyEn: bodyEn.trim(),
        bodyUr: bodyUr.trim() || null,
        tier,
        lakeId: lakeId || null,
        districtId: resolvedDistrict,
        estimatedWindow: estimatedWindow.trim() || null,
        affectedPopulation: affected ? Number(affected) : 0,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to broadcast alert");
      return;
    }
    toast.success("Alert broadcast");
    setTitle("");
    setBodyEn("");
    setBodyUr("");
    setLakeId("");
    setDistrictId("");
    setEstimatedWindow("");
    setAffected("");
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
            <option value="NORMAL">NORMAL</option>
            <option value="WATCH">WATCH</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Estimated window</span>
          <input
            value={estimatedWindow}
            onChange={(e) => setEstimatedWindow(e.target.value)}
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
        <label htmlFor="alert-district" className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Target district</span>
          <select
            id="alert-district"
            aria-label="Target district"
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Auto from lake —</option>
            {(districts ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Affected population</span>
          <input
            type="number"
            min={0}
            value={affected}
            onChange={(e) => setAffected(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Message (English)</span>
          <textarea
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            rows={3}
            maxLength={2000}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Message (Urdu, optional)</span>
          <textarea
            value={bodyUr}
            onChange={(e) => setBodyUr(e.target.value)}
            rows={2}
            maxLength={2000}
            dir="rtl"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
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
