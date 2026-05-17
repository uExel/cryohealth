import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tierBadgeClass, type Tier } from "@/lib/tier";
import { ArrowRight, Activity, Mountain, Bell, Users, Github, Scale } from "lucide-react";

const GITHUB_REPO_URL = "https://github.com/cryohealth/cryohealth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CryoHealth — GLOF Early Warning & Health Assistant" },
      {
        name: "description",
        content:
          "Open-source platform connecting glacial lake hazard intelligence with offline AI health guidance for community health workers in Gilgit Baltistan.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: kpis } = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => {
      const [{ count: highLakes }, { count: alerts30d }, { count: cases7d }, { count: chws }] = await Promise.all([
        supabase.from("lakes").select("*", { count: "exact", head: true }).in("current_tier", ["HIGH", "CRITICAL"]),
        supabase
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
        supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()),
        supabase.from("chw_profiles").select("*", { count: "exact", head: true }),
      ]);
      return { highLakes, alerts30d, cases7d, chws };
    },
  });

  const { data: hotLakes } = useQuery({
    queryKey: ["hotLakes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lakes")
        .select("id, name, current_tier, current_risk_score, downstream_population, last_updated")
        .in("current_tier", ["HIGH", "CRITICAL"])
        .order("current_risk_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: recentAlerts } = useQuery({
    queryKey: ["recentAlerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("id, title, tier, created_at, estimated_window")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary to-[oklch(0.38_0.1_240)] p-8 text-primary-foreground">
        <p className="text-xs uppercase tracking-widest text-accent">Open source · Seeking funding partners</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl">
          From satellite to bedside in under 3 minutes.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-primary-foreground/80">
          Integrated glacial lake outburst flood (GLOF) early warning and offline AI health assistant for community
          health workers across Gilgit Baltistan, Pakistan and the wider Hindu Kush–Himalaya region.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/lakes"
            className="inline-flex items-center gap-1 rounded-md bg-primary-foreground px-4 py-2 text-sm font-medium text-primary hover:bg-white/90"
          >
            View hazard map <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/data"
            className="inline-flex items-center gap-1 rounded-md border border-primary-foreground/30 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10"
          >
            Open data API
          </Link>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Mountain />} label="Lakes in HIGH+" value={kpis?.highLakes ?? "—"} />
        <Kpi icon={<Bell />} label="Alerts 30d" value={kpis?.alerts30d ?? "—"} />
        <Kpi icon={<Activity />} label="Cases 7d" value={kpis?.cases7d ?? "—"} />
        <Kpi icon={<Users />} label="Active CHWs" value={kpis?.chws ?? "—"} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Priority lakes</h2>
            <Link to="/lakes" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {(hotLakes ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between py-3">
                <div>
                  <Link to="/lakes/$lakeId" params={{ lakeId: l.id }} className="text-sm font-medium text-foreground hover:underline">
                    {l.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {l.downstream_population.toLocaleString()} downstream · score {Number(l.current_risk_score).toFixed(0)}
                  </div>
                </div>
                <span className={tierBadgeClass(l.current_tier as Tier)}>{l.current_tier}</span>
              </li>
            ))}
            {hotLakes && hotLakes.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No HIGH or CRITICAL lakes right now.</li>
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent alerts</h2>
            <Link to="/alerts" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {(recentAlerts ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()} · window {a.estimated_window ?? "—"}
                  </div>
                </div>
                <span className={tierBadgeClass(a.tier as Tier)}>{a.tier}</span>
              </li>
            ))}
            {recentAlerts && recentAlerts.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No alerts yet.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{label}</span>
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
