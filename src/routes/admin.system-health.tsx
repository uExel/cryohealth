import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AdminPlaceholder, CryoHealthAdminOnly } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/system-health")({
  head: () => ({
    meta: [{ title: "System health — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: SystemHealthAdmin,
});

function SystemHealthAdmin() {
  const { isCryoHealthAdmin } = useAuth();
  if (!isCryoHealthAdmin) return <CryoHealthAdminOnly />;
  return <AdminPlaceholder title="System health" />;
}
