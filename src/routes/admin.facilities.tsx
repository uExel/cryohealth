import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/facilities")({
  head: () => ({
    meta: [{ title: "Facilities — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: () => <AdminPlaceholder title="Facilities" />,
});
