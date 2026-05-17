import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/api/public/kpis")({
  server: {
    handlers: {
      GET: async () => {
        const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
        const [{ count: highLakes }, { count: alerts30d }] = await Promise.all([
          supabase.from("lakes").select("*", { count: "exact", head: true }).in("current_tier", ["HIGH", "CRITICAL"]),
          supabase.from("alerts").select("*", { count: "exact", head: true }).gte("created_at", since30),
        ]);
        return Response.json({ highLakes, alerts30d });
      },
    },
  },
});