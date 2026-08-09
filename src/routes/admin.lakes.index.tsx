import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/lakes/")({
  head: () => ({
    meta: [{ title: "Lakes — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: () => <AdminPlaceholder title="Lakes" />,
});
