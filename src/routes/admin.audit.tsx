import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AdminPlaceholder, CryoHealthAdminOnly } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [{ title: "Audit log — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: AuditAdmin,
});

function AuditAdmin() {
  const { isCryoHealthAdmin } = useAuth();
  if (!isCryoHealthAdmin) return <CryoHealthAdminOnly />;
  return <AdminPlaceholder title="Audit log" />;
}
