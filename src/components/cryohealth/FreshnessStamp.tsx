export function FreshnessStamp({
  lastUpdated,
  className = "",
}: {
  lastUpdated: string | null | undefined;
  className?: string;
}) {
  if (!lastUpdated) return null;
  const date = new Date(lastUpdated);
  const diffMs = Date.now() - date.getTime();
  const diffHrs = diffMs / 3_600_000;
  const relative =
    diffHrs < 1
      ? `${Math.max(1, Math.round(diffMs / 60_000))} min ago`
      : diffHrs < 48
        ? `${Math.round(diffHrs)}h ago`
        : `${Math.round(diffHrs / 24)}d ago`;
  const status = diffHrs < 6 ? "Live" : "Old data";
  const absolute = date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <p className={`text-xs ${className}`} title={absolute}>
      Updated {relative} · {status}
    </p>
  );
}
