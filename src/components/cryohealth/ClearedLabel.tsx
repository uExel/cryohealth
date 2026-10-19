/** Text-only marker for an alert that has been cleared. Deliberately neutral (no tier
 *  colour): red means CRITICAL and nothing else. `status` may be missing when an older
 *  API response doesn't send it, in which case the alert is treated as active. */
export function isClearedAlert(status?: string | null): boolean {
  return status === "cleared";
}

export function ClearedLabel({ clearedAt }: { clearedAt?: string | null }) {
  const when = clearedAt ? new Date(clearedAt) : null;
  const valid = when && !Number.isNaN(when.getTime());
  return (
    <span className="text-xs font-semibold text-muted-foreground">
      {valid ? `Cleared on ${when.toLocaleString()}` : "Cleared"}
    </span>
  );
}
