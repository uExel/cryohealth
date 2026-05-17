import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tierBadgeClass, type Tier } from "@/lib/tier";
import { ArrowRight, Activity, Mountain, Bell, Users, Github, Scale } from "lucide-react";
import heroImage from "@/assets/glacial-hero.jpg";

const GITHUB_REPO_URL = "https://github.com/uExel/cryohealth.life";
const SITE_URL = "https://cryohealth.life";
const OG_IMAGE = `${SITE_URL}${heroImage}`;

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CryoHealth GLOF & Health Intelligence" },
      {
        name: "description",
        content:
          "Open-source platform connecting glacial lake hazard intelligence with offline AI health guidance for community health workers in Gilgit Baltistan.",
      },
      {
        property: "og:title",
        content: "Dashboard — CryoHealth GLOF & Health Intelligence",
      },
      {
        property: "og:description",
        content:
          "Live KPIs, priority glacial lakes, and recent alerts across Gilgit Baltistan and the Hindu Kush–Himalaya.",
      },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:alt", content: "CryoHealth dashboard preview" },
      { property: "og:url", content: `${SITE_URL}/dashboard` },
      { property: "og:site_name", content: "CryoHealth" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dashboard — CryoHealth" },
      {
        name: "twitter:description",
        content:
          "Live KPIs, priority glacial lakes, and recent alerts across the Hindu Kush–Himalaya.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/dashboard` }],
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

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-accent">Open source</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Built in the open</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              CryoHealth is released under the MIT License. The code, data schema, and seed data are
              public so partners, researchers, and community health programs can audit, fork, and
              deploy the platform. Contributions and funding partners are welcome.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
                <Scale className="h-3.5 w-3.5" /> MIT License
              </span>
              <a
                href={`${GITHUB_REPO_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Read the license
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Github className="h-4 w-4" /> View on GitHub
            </a>
            <a
              href={`${GITHUB_REPO_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Open an issue
            </a>
          </div>
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
