import { useState } from "react";
import { Satellite, Bell, BookOpen, Stethoscope } from "lucide-react";

type NodeId = "watch" | "alert" | "prepare" | "respond";

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
    id: "watch",
    label: "Watch",
    sub: "Sentinel-1/2 · MODIS",
    desc: "Daily imagery is processed into a risk score for every monitored lake and catchment.",
    icon: <Satellite className="h-6 w-6" />,
    x: 12,
    y: 22,
  },
  {
    id: "alert",
    label: "Alert",
    sub: "Plain instruction, not a number",
    desc: "When risk crosses a threshold, health workers receive a plain instruction on what to do.",
    icon: <Bell className="h-6 w-6" />,
    x: 50,
    y: 14,
  },
  {
    id: "prepare",
    label: "Prepare",
    sub: "Offline prevention library",
    desc: "Prevention guidance already lives on the device and refreshes at the health post.",
    icon: <BookOpen className="h-6 w-6" />,
    x: 86,
    y: 28,
  },
  {
    id: "respond",
    label: "Respond",
    sub: "If an emergency still hits",
    desc: "The worker registers a case and the app suggests care steps for the emergency, offline.",
    icon: <Stethoscope className="h-6 w-6" />,
    x: 50,
    y: 82,
  },
];

const EDGES: Array<{ from: NodeId; to: NodeId }> = [
  { from: "watch", to: "alert" },
  { from: "alert", to: "prepare" },
  { from: "prepare", to: "respond" },
  { from: "watch", to: "respond" },
];

function getNode(id: NodeId) {
  return NODES.find((n) => n.id === id)!;
}

export function PipelineDiagram() {
  const [active, setActive] = useState<NodeId | null>(null);

  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-stretch">
      {/* Diagram */}
      <div className="relative aspect-[5/4] w-full overflow-hidden border-2 border-border bg-[var(--color-diagram-ink)] p-2 md:aspect-auto md:min-h-[460px]">
        {/* SVG edges — flat stroke, no gradient; motion is fine, glow is not */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {EDGES.map((e, i) => {
            const a = getNode(e.from);
            const b = getNode(e.to);
            const isActive = active === e.from || active === e.to;
            return (
              <g key={i}>
                <path
                  id={`edge-path-${i}`}
                  d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeOpacity={isActive ? 0.9 : 0.5}
                  strokeWidth={isActive ? 0.6 : 0.35}
                  strokeLinecap="round"
                  className={isActive ? "pipeline-line-active" : "pipeline-line"}
                  style={{ transition: "stroke-width 200ms ease" }}
                  vectorEffect="non-scaling-stroke"
                />
                {/* flowing particles — denser & faster when active */}
                {[0, 0.33, 0.66].map((delay, p) => {
                  if (!isActive && p > 0) return null;
                  const dur = isActive ? 1.4 : 3;
                  return (
                    <circle
                      key={p}
                      r={isActive ? 0.9 : 0.6}
                      fill="var(--color-on-accent)"
                      opacity={isActive ? 0.95 : 0.55}
                    >
                      <animateMotion
                        dur={`${dur}s`}
                        repeatCount="indefinite"
                        begin={`-${delay * dur}s`}
                        path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                        rotate="auto"
                      />
                    </circle>
                  );
                })}
              </g>
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
                  className={`absolute inset-0 m-auto h-14 w-14 border-2 border-[var(--color-diagram-highlight)] transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  } pipeline-pulse`}
                />
                <span
                  className={`relative flex h-14 w-14 items-center justify-center border-2 text-primary-foreground transition-colors ${
                    isActive
                      ? "border-[var(--color-diagram-highlight)] bg-white/15"
                      : "border-white/30 bg-white/10 group-hover:border-[var(--color-diagram-highlight)] group-hover:bg-white/15"
                  }`}
                >
                  {n.icon}
                </span>
                <span
                  className={`mt-2 block whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest transition-colors ${
                    isActive
                      ? "text-[var(--color-diagram-highlight)]"
                      : "text-primary-foreground/80"
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
          <span>Prevention first, response second</span>
          <span className="hidden sm:inline">Hover a node →</span>
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
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
