import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/lakes/$lakeId")({
  head: () => ({
    meta: [{ title: "Lake detail — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: LakeDetailAdmin,
});

function LakeDetailAdmin() {
  const { lakeId } = Route.useParams();
  return <AdminPlaceholder title="Lake detail" subtitle={`ID: ${lakeId} · Not yet implemented.`} />;
}
