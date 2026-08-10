export function StatCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "danger" | "warn" | "ok";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--color-critical)]"
      : tone === "warn"
        ? "text-[var(--color-watch)]"
        : tone === "ok"
          ? "text-[var(--color-normal)]"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

export function StatPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>
    </div>
  );
}

const STATUS_CLASSES: Record<string, string> = {
  stable: "bg-blue-100 text-blue-800",
  retreating: "bg-[var(--color-watch-soft)] text-[var(--color-watch)]",
  advancing: "bg-emerald-100 text-emerald-800",
  surging: "bg-purple-100 text-purple-800",
  unknown: "bg-slate-100 text-slate-700",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status] ?? STATUS_CLASSES.unknown}`}
    >
      {status}
    </span>
  );
}
