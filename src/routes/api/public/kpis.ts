import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/kpis")({
  server: {
    handlers: {
      GET: async () => {
        const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
        const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
        const [{ count: highLakes }, { count: alerts30d }, { count: cases7d }, { count: chws }] = await Promise.all([
          supabaseAdmin.from("lakes").select("*", { count: "exact", head: true }).in("current_tier", ["HIGH", "CRITICAL"]),
          supabaseAdmin.from("alerts").select("*", { count: "exact", head: true }).gte("created_at", since30),
          supabaseAdmin.from("cases").select("*", { count: "exact", head: true }).gte("created_at", since7),
          supabaseAdmin.from("chw_profiles").select("*", { count: "exact", head: true }),
        ]);
        return Response.json({ highLakes, alerts30d, cases7d, chws });
      },
    },
  },
});