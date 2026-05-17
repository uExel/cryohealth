import { useState } from "react";
import { Satellite, BrainCircuit, Smartphone, Stethoscope } from "lucide-react";

type NodeId = "satellite" | "ai" | "phone" | "chw";

type NodeDef = {
  id: NodeId;
  label: string;
  sub: string;
  desc: string;
  icon: React.ReactNode;
  x: number; // %
  y: number; // %
};

const NODES: NodeDef[] = [
  {
    id: "satellite",
    label: "Satellite",
    sub: "Sentinel-1/2 · MODIS",
    desc: "Daily imagery is scored by ML to rank each glacial lake by hazard tier.",
    icon: <Satellite className="h-6 w-6" />,
    x: 12,
    y: 22,
  },
  {
    id: "ai",
    label: "AI inference",
    sub: "Hazard model · NDMA tiers",
    desc: "Risk model converts imagery + weather into WATCH → HIGH → CRITICAL alerts.",
    icon: <BrainCircuit className="h-6 w-6" />,
    x: 50,
    y: 14,
  },
  {
    id: "phone",
    label: "Offline app",
    sub: "SMS · PWA · radio",
    desc: "Alerts reach the village over any channel available, even without internet.",
    icon: <Smartphone className="h-6 w-6" />,
    x: 86,
    y: 28,
  },
  {
    id: "chw",
    label: "CHW + AI triage",
    sub: "Bedside guidance",
    desc: "The local AI assistant guides triage, dosing, and referrals — fully offline.",
    icon: <Stethoscope className="h-6 w-6" />,
    x: 50,
    y: 82,
  },
];

const EDGES: Array<{ from: NodeId; to: NodeId }> = [
  { from: "satellite", to: "ai" },
  { from: "ai", to: "phone" },
  { from: "phone", to: "chw" },
  { from: "satellite", to: "chw" },
];

function getNode(id: NodeId) {
  return NODES.find((n) => n.id === id)!;
}

export function PipelineDiagram() {
  const [active, setActive] = useState<NodeId | null>(null);

  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-stretch">
      {/* Diagram */}
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/95 via-primary to-[oklch(0.20_0.06_240)] p-2 shadow-[var(--shadow-elegant)] md:aspect-auto md:min-h-[460px]">
        {/* starfield dots */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 0.5px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.3) 0.5px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.35) 0.5px, transparent 1px)",
            backgroundSize: "120px 120px, 180px 180px, 90px 90px",
          }}
        />

        {/* SVG edges */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="edge-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.13 195)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="oklch(0.62 0.09 215)" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {EDGES.map((e, i) => {
            const a = getNode(e.from);
            const b = getNode(e.to);
            const isActive = active === e.from || active === e.to;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="url(#edge-grad)"
                strokeWidth={isActive ? 0.6 : 0.35}
                strokeLinecap="round"
                className={isActive ? "pipeline-line-active" : "pipeline-line"}
                style={{ transition: "stroke-width 200ms ease" }}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* Node chips */}
        <div className="absolute inset-0">
          {NODES.map((n) => {
            const isActive = active === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onMouseEnter={() => setActive(n.id)}
                onFocus={() => setActive(n.id)}
                onMouseLeave={() => setActive((cur) => (cur === n.id ? null : cur))}
                onBlur={() => setActive((cur) => (cur === n.id ? null : cur))}
                onClick={() => setActive(n.id)}
                aria-label={n.label}
                aria-pressed={isActive}
                className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <span
                  aria-hidden
                  className={`absolute inset-0 m-auto h-14 w-14 rounded-full bg-accent/30 blur-md transition-opacity ${
                    isActive ? "opacity-100" : "opacity-60"
                  } pipeline-pulse`}
                />
                <span
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full border text-primary-foreground backdrop-blur transition-all ${
                    isActive
                      ? "border-accent bg-accent/30 scale-110"
                      : "border-white/30 bg-white/10 group-hover:border-accent group-hover:bg-accent/20"
                  }`}
                >
                  {n.icon}
                </span>
                <span
                  className={`mt-2 block whitespace-nowrap text-[11px] font-medium uppercase tracking-widest transition-colors ${
                    isActive ? "text-accent" : "text-primary-foreground/80"
                  }`}
                >
                  {n.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* legend */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-primary-foreground/60">
          <span>Lead-time goal &lt; 3 min</span>
          <span className="hidden sm:inline">Hover a node →</span>
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
          {active ? "Selected stage" : "Pipeline"}
        </p>
        <div className="mt-3 space-y-4">
          {NODES.map((n) => {
            const isActive = active === n.id || active === null;
            return (
              <button
                key={n.id}
                type="button"
                onMouseEnter={() => setActive(n.id)}
                onFocus={() => setActive(n.id)}
                onClick={() => setActive(n.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                  active === n.id
                    ? "border-primary bg-secondary"
                    : "border-border bg-background hover:border-primary/40"
                } ${isActive ? "opacity-100" : "opacity-50"}`}
              >
                <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-md bg-secondary text-primary [&_svg]:h-4 [&_svg]:w-4">
                  {n.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{n.label}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {n.sub}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {n.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
