import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — CryoHealth" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading…</main>;
  if (!isAdmin)
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center text-sm text-muted-foreground">
        Admin access required. Ask the project owner to grant you the <code>ndma</code> or <code>facility_admin</code> role.
        <div className="mt-4">
          <Link to="/login" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in</Link>
        </div>
      </main>
    );
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Admin console</h1>
      <p className="text-sm text-muted-foreground">Broadcast tools and caseload views ship in the next iteration.</p>
    </main>
  );
}