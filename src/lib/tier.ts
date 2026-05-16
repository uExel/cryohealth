export type Tier = "NORMAL" | "WATCH" | "HIGH" | "CRITICAL";

export const tierClasses: Record<Tier, { bg: string; text: string; ring: string; hex: string; label: string }> = {
  NORMAL: { bg: "bg-[oklch(0.7_0.13_160)]", text: "text-white", ring: "ring-[oklch(0.7_0.13_160)]", hex: "#3FB37F", label: "Normal" },
  WATCH: { bg: "bg-[oklch(0.78_0.16_85)]", text: "text-[oklch(0.2_0.05_60)]", ring: "ring-[oklch(0.78_0.16_85)]", hex: "#E0B33B", label: "Watch" },
  HIGH: { bg: "bg-[oklch(0.68_0.18_50)]", text: "text-white", ring: "ring-[oklch(0.68_0.18_50)]", hex: "#E07A3B", label: "High" },
  CRITICAL: { bg: "bg-[oklch(0.58_0.22_25)]", text: "text-white", ring: "ring-[oklch(0.58_0.22_25)]", hex: "#D14545", label: "Critical" },
};

export function tierBadgeClass(tier: Tier) {
  const t = tierClasses[tier];
  return `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.bg} ${t.text}`;
}