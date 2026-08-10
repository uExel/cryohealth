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

// Glacier stability is a different axis than hazard tier (NORMAL/WATCH/HIGH/CRITICAL)
// — reuses the design-system tokens, not the Tier type, so surging/retreating never
// render in tier-red (reserved for CRITICAL hazard alerts). Coherent with StatCard's
// `tone` mapping on the admin overview: retreating/surging -> warn, stable -> ok.
// `advancing` gets the accent token — it's neither a warning nor the baseline "stable"
// case, just a notable observation worth its own distinct color.
const STATUS_CLASSES: Record<string, string> = {
  stable: "bg-[var(--color-normal-soft)] text-[var(--color-normal)]",
  retreating: "bg-[var(--color-watch-soft)] text-[var(--color-watch)]",
  advancing: "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]",
  surging: "bg-[var(--color-watch-soft)] text-[var(--color-watch)]",
  unknown: "bg-secondary text-foreground",
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
