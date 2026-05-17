import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { tierBadgeClass, type Tier } from "@/lib/tier";

export const Route = createFileRoute("/chw")({
  head: () => ({
    meta: [
      { title: "CHW Workspace — CryoHealth" },
      { name: "description", content: "Offline-first case capture and AI triage workspace for community health workers." },
      { property: "og:title", content: "CHW Workspace — CryoHealth" },
      { property: "og:description", content: "Capture cases offline and get AI-assisted triage, dosing, and referral guidance in the field." },
      { property: "og:url", content: "https://cryohealth.life/chw" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://cryohealth.life/chw" }],
  }),
  component: CHWHome,
});

function CHWHome() {
  const { user, loading } = useAuth();
  const { data: openAlerts } = useQuery({
    queryKey: ["chw-open-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("id,title,tier,created_at,estimated_window")
        .in("tier", ["HIGH", "CRITICAL"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });
  const { data: protocols } = useQuery({
    queryKey: ["protocols", !!openAlerts?.length],
    queryFn: async () => {
      const { data } = await supabase.from("protocols").select("*").order("is_disaster", { ascending: false });
      return data ?? [];
    },
  });

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading…</main>;
  if (!user)
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">You need to sign in to use the CHW workspace.</p>
        <Link to="/login" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Sign in
        </Link>
      </main>
    );

  const disasterMode = (openAlerts ?? []).length > 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      {disasterMode && (
        <div className="mb-4 rounded-xl border border-[oklch(0.58_0.22_25)] bg-[oklch(0.58_0.22_25)]/10 p-4">
          <div className="text-xs font-semibold uppercase text-[oklch(0.58_0.22_25)]">Disaster mode active</div>
          <div className="mt-1 text-sm text-foreground">
            {(openAlerts ?? []).length} HIGH or CRITICAL alert(s) in your region. Prioritise trauma, waterborne disease,
            hypothermia, and displacement protocols below.
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold text-foreground">CHW workspace</h1>
      <p className="text-sm text-muted-foreground">Protocols, alerts and case logging.</p>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-foreground">Active alerts</h2>
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
          {(openAlerts ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-foreground">{a.title}</div>
                <div className="text-xs text-muted-foreground">window {a.estimated_window ?? "—"}</div>
              </div>
              <span className={tierBadgeClass(a.tier as Tier)}>{a.tier}</span>
            </li>
          ))}
          {openAlerts && openAlerts.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground">No active HIGH/CRITICAL alerts.</li>
          )}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">Protocols</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {(protocols ?? []).map((p) => (
            <article key={p.id} className={`rounded-xl border bg-card p-4 ${p.is_disaster ? "border-[oklch(0.58_0.22_25)]/30" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                {p.is_disaster && (
                  <span className="rounded-full bg-[oklch(0.58_0.22_25)]/10 px-2 py-0.5 text-[10px] font-medium text-[oklch(0.58_0.22_25)]">
                    Disaster
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.source}</p>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Note: this is the web companion. The production CHW experience is a Flutter Android app with on-device LLM
        (Phi-3 Mini via Ollama) and offline patient records.
      </p>
    </main>
  );
}