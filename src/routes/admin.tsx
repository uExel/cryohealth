import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Cryosphere Inventory" },
      {
        name: "description",
        content:
          "Profile of glaciers and glacial lakes across Gilgit Baltistan and Chitral, mapped from RGI v7 / GLIMS and NASA satellite data.",
      },
      { property: "og:title", content: "Admin — CryoHealth Cryosphere Inventory" },
      {
        property: "og:description",
        content:
          "Manage glaciers, glacial lakes, alerts, and roles. For CryoHealth admins and facility admins.",
      },
      { property: "og:url", content: "https://cryohealth.io/admin" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://cryohealth.io/admin" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, rolesLoaded, user } = useAuth();
  if (loading || (user && !rolesLoaded))
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading…</main>
    );
  if (!isAdmin)
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center text-sm text-muted-foreground">
        Admin access required. Ask the project owner to grant you the <code>cryohealth_admin</code>{" "}
        or <code>facility_admin</code> role.
        <div className="mt-4">
          <Link
            to="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  return <Outlet />;
}
