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

type Glacier = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  area_km2: number | null;
  length_km: number | null;
  status: string;
  elevation_max_m: number | null;
};

const glacierStatusColor: Record<string, string> = {
  stable: "#2563eb",
  retreating: "#dc2626",
  advancing: "#16a34a",
  surging: "#9333ea",
  unknown: "#64748b",
};

export function HazardMap({
  lakes,
  facilities = [],
  glaciers = [],
  showGibs = false,
  height = 480,
}: {
  lakes: Lake[];
  facilities?: Facility[];
  glaciers?: Glacier[];
  showGibs?: boolean;
  height?: number;
}) {
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
      <div style={{ height }} className="flex items-center justify-center rounded-xl border border-border bg-secondary/40 text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } = Mod;
  const gibsDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[36.2, 74.5] as [number, number]}
        zoom={7}
        style={{ height, width: "100%" }}
        scrollWheelZoom={false}
      >
        {showGibs ? (
          <TileLayer
            attribution='Imagery &copy; NASA EOSDIS GIBS · MODIS Terra'
            url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
            maxNativeZoom={9}
            maxZoom={12}
          />
        ) : (
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {glaciers.map((g) => {
          const color = glacierStatusColor[g.status] ?? glacierStatusColor.unknown;
          const r = g.area_km2 && g.area_km2 > 200 ? 11 : g.area_km2 && g.area_km2 > 50 ? 8 : 6;
          return (
            <CircleMarker
              key={g.id}
              center={[g.lat, g.lng] as [number, number]}
              radius={r}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 1.5, dashArray: "3 2" }}
            >
              <Tooltip>{g.name} · {g.status}</Tooltip>
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">{g.name}</div>
                  <div>Status: {g.status}</div>
                  {g.area_km2 != null && <div>Area: {Number(g.area_km2).toFixed(1)} km²</div>}
                  {g.length_km != null && <div>Length: {Number(g.length_km).toFixed(1)} km</div>}
                  {g.elevation_max_m != null && <div>Max elev: {g.elevation_max_m} m</div>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
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
        {glaciers.length > 0 && (
          <>
            <span className="mx-1 text-border">|</span>
            <span className="font-medium text-foreground">Glaciers:</span>
            {Object.entries(glacierStatusColor).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: v }} />
                {k}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}