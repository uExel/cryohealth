import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HazardMap } from "@/components/cryohealth/HazardMap";
import { tierBadgeClass, type Tier } from "@/lib/tier";
import { useState } from "react";

export const Route = createFileRoute("/lakes")({
  head: () => ({
    meta: [
      { title: "Hazard Map — CryoHealth" },
      { name: "description", content: "Live risk map for monitored glacial lakes across Gilgit Baltistan." },
      { property: "og:title", content: "Hazard Map — CryoHealth" },
      { property: "og:description", content: "Interactive map of glacial lakes with current hazard tiers and downstream populations." },
      { property: "og:url", content: "https://cryohealth.life/lakes" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://cryohealth.life/lakes" }],
  }),
  component: LakesPage,
});

function LakesPage() {
  const [tier, setTier] = useState<"ALL" | Tier>("ALL");
  const { data: lakes } = useQuery({
    queryKey: ["lakes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lakes")
        .select("id,name,lat,lng,current_tier,current_risk_score,downstream_population,last_updated,district_id")
        .order("current_risk_score", { ascending: false });
      return data ?? [];
    },
  });
  const { data: facilities } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () => {
      const { data } = await supabase.from("facilities").select("id,name,lat,lng,type,vulnerability");
      return data ?? [];
    },
  });

  const filtered = (lakes ?? []).filter((l) => tier === "ALL" || l.current_tier === tier);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Glacial lake hazard map</h1>
          <p className="text-sm text-muted-foreground">
            {lakes?.length ?? 0} monitored lakes · derived from satellite SAR + IoT signals
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
          {(["ALL", "CRITICAL", "HIGH", "WATCH", "NORMAL"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`rounded px-2.5 py-1 text-xs ${
                tier === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <HazardMap lakes={(filtered as never) ?? []} facilities={facilities ?? []} />

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Lake</th>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Downstream</th>
              <th className="px-4 py-2">Last update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-secondary/40">
                <td className="px-4 py-2">
                  <Link to="/lakes/$lakeId" params={{ lakeId: l.id }} className="font-medium text-foreground hover:underline">
                    {l.name}
                  </Link>
                </td>
                <td className="px-4 py-2"><span className={tierBadgeClass(l.current_tier as Tier)}>{l.current_tier}</span></td>
                <td className="px-4 py-2 text-foreground">{Number(l.current_risk_score).toFixed(0)}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.downstream_population.toLocaleString()}</td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(l.last_updated).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}