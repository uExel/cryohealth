import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tierBadgeClass, type Tier } from "@/lib/tier";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — CryoHealth" },
      { name: "description", content: "Live GLOF alert feed for Gilgit Baltistan." },
      { property: "og:title", content: "Alerts — CryoHealth" },
      { property: "og:description", content: "Chronological feed of GLOF alerts with estimated impact windows and affected downstream populations." },
      { property: "og:url", content: "https://cryohealth.life/alerts" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://cryohealth.life/alerts" }],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { user, isAdmin, isCHW } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["alerts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("id,title,body_en,body_ur,tier,estimated_window,affected_population,created_at,lake:lakes(name),district:districts(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: acks } = useQuery({
    queryKey: ["alert-acks", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("alert_acknowledgements")
        .select("alert_id,chw_id,acknowledged_at");
      return data ?? [];
    },
  });

  const ackMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase
        .from("alert_acknowledgements")
        .insert({ alert_id: alertId, chw_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acknowledged");
      qc.invalidateQueries({ queryKey: ["alert-acks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myAckSet = new Set((acks ?? []).filter((a) => a.chw_id === user?.id).map((a) => a.alert_id));
  const ackCount = (alertId: string) => (acks ?? []).filter((a) => a.alert_id === alertId).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold text-foreground">Alert feed</h1>
      <p className="text-sm text-muted-foreground">Most recent first. Public read-only view.</p>
      {isAdmin && <BroadcastForm onCreated={() => qc.invalidateQueries({ queryKey: ["alerts-all"] })} />}
      <ul className="mt-4 space-y-3">
        {(data ?? []).map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-foreground">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()} · {(a.district as { name?: string } | null)?.name ?? "—"} ·
                  window {a.estimated_window ?? "—"} · ~{a.affected_population?.toLocaleString() ?? 0} affected
                </div>
              </div>
              <span className={tierBadgeClass(a.tier as Tier)}>{a.tier}</span>
            </div>
            <p className="mt-2 text-sm text-foreground">{a.body_en}</p>
            {a.body_ur && <p dir="rtl" className="mt-1 text-sm text-muted-foreground">{a.body_ur}</p>}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2">
              {isAdmin ? (
                <span className="text-xs text-muted-foreground">{ackCount(a.id)} CHW acknowledgement{ackCount(a.id) === 1 ? "" : "s"}</span>
              ) : (
                <span className="text-xs text-muted-foreground">{ackCount(a.id)} acknowledged</span>
              )}
              {isCHW && (
                myAckSet.has(a.id) ? (
                  <span className="text-xs font-medium text-[oklch(0.7_0.13_160)]">✓ You acknowledged</span>
                ) : (
                  <button
                    onClick={() => ackMutation.mutate(a.id)}
                    disabled={ackMutation.isPending}
                    className="rounded-md border border-border bg-background px-3 py-1 text-xs hover:bg-accent"
                  >
                    Acknowledge
                  </button>
                )
              )}
            </div>
          </li>
        ))}
        {data && data.length === 0 && <li className="text-sm text-muted-foreground">No alerts yet.</li>}
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
      const { data } = await supabase.from("lakes").select("id,name,district_id").order("name");
      return data ?? [];
    },
  });
  const { data: districts } = useQuery({
    queryKey: ["districts-min"],
    queryFn: async () => {
      const { data } = await supabase.from("districts").select("id,name").order("name");
      return data ?? [];
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
      toast.error("Selected lake belongs to a different district. Clear one to resolve the conflict.");
      return;
    }
    setSubmitting(true);
    const resolvedDistrict =
      districtId || lakeDistrict || null;
    const { error } = await supabase.from("alerts").insert({
      title: title.trim(),
      body_en: bodyEn.trim(),
      body_ur: bodyUr.trim() || null,
      tier,
      lake_id: lakeId || null,
      district_id: resolvedDistrict,
      estimated_window: estimatedWindow.trim() || null,
      affected_population: affected ? Number(affected) : 0,
      issued_by: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
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
        <span className="text-xs text-muted-foreground">Sender: {user?.email ?? user?.id}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" required />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Risk tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value as Tier)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="NORMAL">NORMAL</option>
            <option value="WATCH">WATCH</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Estimated window</span>
          <input value={estimatedWindow} onChange={(e) => setEstimatedWindow(e.target.value)}
            placeholder="e.g. next 24h"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Target lake</span>
          <select value={lakeId} onChange={(e) => setLakeId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">— None —</option>
            {(lakes ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Target district</span>
          <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">— Auto from lake —</option>
            {(districts ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Affected population</span>
          <input type="number" min={0} value={affected} onChange={(e) => setAffected(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Message (English)</span>
          <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={3} maxLength={2000}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" required />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Message (Urdu, optional)</span>
          <textarea value={bodyUr} onChange={(e) => setBodyUr(e.target.value)} rows={2} maxLength={2000} dir="rtl"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {submitting ? "Broadcasting…" : "Broadcast alert"}
        </button>
      </div>
    </form>
  );
}