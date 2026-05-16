import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tierBadgeClass, type Tier } from "@/lib/tier";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — CryoHealth" },
      { name: "description", content: "Live GLOF alert feed for Gilgit Baltistan." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
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
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold text-foreground">Alert feed</h1>
      <p className="text-sm text-muted-foreground">Most recent first. Public read-only view.</p>
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
          </li>
        ))}
        {data && data.length === 0 && <li className="text-sm text-muted-foreground">No alerts yet.</li>}
      </ul>
    </main>
  );
}