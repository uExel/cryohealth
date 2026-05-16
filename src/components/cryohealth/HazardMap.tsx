import { useEffect, useState } from "react";
import { tierClasses, type Tier } from "@/lib/tier";
import { Link } from "@tanstack/react-router";

type Lake = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  current_tier: Tier;
  current_risk_score: number;
  downstream_population: number;
};

type Facility = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  type: string;
  vulnerability: string;
};

export function HazardMap({ lakes, facilities = [] }: { lakes: Lake[]; facilities?: Facility[] }) {
  const [Mod, setMod] = useState<typeof import("react-leaflet") | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const mod = await import("react-leaflet");
      await import("leaflet/dist/leaflet.css");
      if (active) setMod(mod);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!Mod) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl border border-border bg-secondary/40 text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } = Mod;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[36.2, 74.5] as [number, number]}
        zoom={8}
        style={{ height: 480, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {lakes.map((l) => {
          const c = tierClasses[l.current_tier];
          const radius = l.current_tier === "CRITICAL" ? 14 : l.current_tier === "HIGH" ? 11 : l.current_tier === "WATCH" ? 8 : 6;
          return (
            <CircleMarker
              key={l.id}
              center={[l.lat, l.lng] as [number, number]}
              radius={radius}
              pathOptions={{ color: c.hex, fillColor: c.hex, fillOpacity: 0.75, weight: 2 }}
            >
              <Tooltip>{l.name} · {l.current_tier}</Tooltip>
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">{l.name}</div>
                  <div>Tier: {l.current_tier}</div>
                  <div>Score: {Number(l.current_risk_score).toFixed(0)}</div>
                  <div>Downstream: {l.downstream_population.toLocaleString()}</div>
                  <Link to="/lakes/$lakeId" params={{ lakeId: l.id }} className="text-primary underline">
                    Open lake →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {facilities.map((f) =>
          f.lat && f.lng ? (
            <CircleMarker
              key={f.id}
              center={[f.lat, f.lng] as [number, number]}
              radius={5}
              pathOptions={{ color: "#1d4ed8", fillColor: "#1d4ed8", fillOpacity: 0.9, weight: 1 }}
            >
              <Tooltip>{f.name} ({f.type})</Tooltip>
            </CircleMarker>
          ) : null,
        )}
      </MapContainer>
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Risk tiers:</span>
        {(["NORMAL", "WATCH", "HIGH", "CRITICAL"] as Tier[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: tierClasses[t].hex }} />
            {t}
          </span>
        ))}
        {facilities.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-700" />
            Health facility
          </span>
        )}
      </div>
    </div>
  );
}