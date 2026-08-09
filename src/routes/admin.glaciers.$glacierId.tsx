import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/glaciers/$glacierId")({
  head: () => ({
    meta: [
      { title: "Glacier detail — Admin — CryoHealth" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GlacierDetailAdmin,
});

function GlacierDetailAdmin() {
  const { glacierId } = Route.useParams();
  return (
    <AdminPlaceholder title="Glacier detail" subtitle={`ID: ${glacierId} · Not yet implemented.`} />
  );
}
