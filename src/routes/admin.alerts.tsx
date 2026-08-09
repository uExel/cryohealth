import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/alerts")({
  head: () => ({
    meta: [{ title: "Alerts — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: () => <AdminPlaceholder title="Alerts" />,
});
