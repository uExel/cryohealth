export function FreshnessStamp({
  lastUpdated,
  className = "",
}: {
  lastUpdated: string | null | undefined;
  className?: string;
}) {
  if (!lastUpdated) return null;
  const formatted = new Date(lastUpdated).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <p className={`text-xs ${className}`}>
      Last updated {formatted}. Next update expected within 4 hours.
    </p>
  );
}
