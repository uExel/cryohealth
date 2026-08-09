import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/cases")({
  head: () => ({
    meta: [{ title: "Cases — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: () => <AdminPlaceholder title="Cases" />,
});
