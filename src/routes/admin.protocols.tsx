import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/protocols")({
  head: () => ({
    meta: [{ title: "Protocols — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: () => <AdminPlaceholder title="Protocols" />,
});
