import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AdminPlaceholder, CryoHealthAdminOnly } from "@/components/cryohealth/AdminPlaceholder";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "Users & roles — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: UsersAdmin,
});

function UsersAdmin() {
  const { isCryoHealthAdmin } = useAuth();
  if (!isCryoHealthAdmin) return <CryoHealthAdminOnly />;
  return <AdminPlaceholder title="Users & roles" />;
}
