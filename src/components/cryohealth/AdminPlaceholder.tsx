export function AdminPlaceholder({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle ?? "Not yet implemented."}</p>
    </div>
  );
}

export function CryoHealthAdminOnly() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      <code>cryohealth_admin</code> required. Ask the project owner to grant you this role.
    </div>
  );
}
