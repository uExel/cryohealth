import { createFileRoute } from "@tanstack/react-router";
import { listChwProfiles } from "@/lib/queries";

// Ungated is a GATE decision (docs/ai/PLAN.md task #9), not an oversight: chw_profiles has
// zero rows and no writer today, so there's no PII to protect yet. Revisit this when the CHW
// profiles CRUD task (#14) adds a writer — full_name/phone/lhwId should be gated by then.
export const Route = createFileRoute("/api/public/chw-profiles")({
  server: {
    handlers: {
      GET: async () => Response.json({ profiles: await listChwProfiles() }),
    },
  },
});
