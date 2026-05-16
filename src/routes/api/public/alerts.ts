import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/alerts")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await supabaseAdmin
          .from("alerts")
          .select("id,lake_id,district_id,tier,title,body_en,body_ur,estimated_window,affected_population,created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ alerts: data });
      },
    },
  },
});