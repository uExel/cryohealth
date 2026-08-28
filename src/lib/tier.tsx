import { Check, CircleAlert, TriangleAlert } from "lucide-react";

export type Tier = "NORMAL" | "WATCH" | "HIGH" | "CRITICAL";

// Solid is for a bar, a badge fill, or an icon — never body copy on the page
// background. Soft is for badge fills and card washes. hex is a static
// light-mode value for contexts that need a raw string (recharts strokes,
// Leaflet markers) rather than a CSS var.
export const tierClasses: Record<
  Tier,
  { bg: string; text: string; ring: string; hex: string; label: string }
> = {
  NORMAL: {
    bg: "bg-[var(--color-normal)]",
    text: "text-[var(--color-on-tier)]",
    ring: "ring-[var(--color-normal)]",
    hex: "#1f7a4d",
    label: "Normal",
  },
  WATCH: {
    bg: "bg-[var(--color-watch)]",
    text: "text-[var(--color-on-watch)]",
    ring: "ring-[var(--color-watch)]",
    hex: "#a37700",
    label: "Watch",
  },
  HIGH: {
    bg: "bg-[var(--color-high)]",
    text: "text-[var(--color-on-tier)]",
    ring: "ring-[var(--color-high)]",
    hex: "#d2600f",
    label: "High",
  },
  CRITICAL: {
    bg: "bg-[var(--color-critical)]",
    text: "text-[var(--color-on-tier)]",
    ring: "ring-[var(--color-critical)]",
    hex: "#c6231a",
    label: "Critical",
  },
};

const TIER_SOFT_VAR: Record<Tier, string> = {
  NORMAL: "var(--color-normal-soft)",
  WATCH: "var(--color-watch-soft)",
  HIGH: "var(--color-high-soft)",
  CRITICAL: "var(--color-critical-soft)",
};

const TIER_SOLID_VAR: Record<Tier, string> = {
  NORMAL: "var(--color-normal)",
  WATCH: "var(--color-watch)",
  HIGH: "var(--color-high)",
  CRITICAL: "var(--color-critical)",
};

const TIER_ON_SOLID_VAR: Record<Tier, string> = {
  NORMAL: "var(--color-on-tier)",
  WATCH: "var(--color-on-watch)",
  HIGH: "var(--color-on-tier)",
  CRITICAL: "var(--color-on-tier)",
};

// Fixed meanings — tier icons are not interchangeable.
const TIER_ICON: Record<Tier, typeof Check> = {
  NORMAL: Check,
  WATCH: CircleAlert,
  HIGH: TriangleAlert,
  CRITICAL: TriangleAlert,
};

/**
 * Soft fill + solid-colour text + fixed icon + uppercase word. Colour is
 * never the only signal for a hazard tier. `solid` forces the solid-bg /
 * on-tier-text treatment — reserve that for a hero/header context (e.g. an
 * uncleared CRITICAL alert), not a dense list row.
 */
export function TierBadge({
  tier,
  solid = false,
  className = "",
}: {
  tier?: Tier;
  solid?: boolean;
  className?: string;
}) {
  const effectiveTier = ((tier ?? "NORMAL").toUpperCase()) as Tier;
  const Icon = TIER_ICON[effectiveTier] ?? Check;
  const background = solid ? TIER_SOLID_VAR[effectiveTier] : TIER_SOFT_VAR[effectiveTier];
  const color = solid ? TIER_ON_SOLID_VAR[effectiveTier] : TIER_SOLID_VAR[effectiveTier];
  const label = tierClasses[effectiveTier]?.label ?? "Unknown";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${className}`}
      style={{ background, color }}
    >
      <Icon className="h-[13px] w-[13px]" strokeWidth={2.6} />
      {label.toUpperCase()}
    </span>
  );
}
