import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/api/public/lakes")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await supabase
          .from("lakes")
          .select("id,name,lat,lng,elevation_m,area_km2,current_risk_score,current_tier,current_confidence,downstream_population,last_updated")
          .order("current_risk_score", { ascending: false });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ lakes: data });
      },
    },
  },
});