import { useEffect, useRef, useState } from "react";
import { tierClasses, type Tier } from "@/lib/tier";

type Lake = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  current_tier: Tier;
  // Not yet exposed by CryoHealth-api — rendered only when present.
  current_risk_score?: number;
  downstream_population?: number;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const [leaflet, setLeaflet] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const mod = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (active) setLeaflet(mod);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!leaflet || !containerRef.current) return;

    const container = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    delete container._leaflet_id;
    container.replaceChildren();

    const map = leaflet.map(container, {
      center: [36.2, 74.5],
      zoom: 7,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    const gibsDate = new Date().toISOString().slice(0, 10);
    if (showGibs) {
      leaflet
        .tileLayer(
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
          {
            attribution: "Imagery © NASA EOSDIS GIBS · MODIS Terra",
            maxNativeZoom: 9,
            maxZoom: 12,
          },
        )
        .addTo(map);
    } else {
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
        })
        .addTo(map);
    }

    glaciers.forEach((g) => {
      const color = glacierStatusColor[g.status] ?? glacierStatusColor.unknown;
      const radius = g.area_km2 && g.area_km2 > 200 ? 11 : g.area_km2 && g.area_km2 > 50 ? 8 : 6;
      leaflet
        .circleMarker([g.lat, g.lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.55,
          weight: 1.5,
          dashArray: "3 2",
        })
        .bindTooltip(`${g.name} · ${g.status}`)
        .bindPopup(
          `<div class="space-y-1 text-xs">
            <div class="font-semibold">${escapeHtml(g.name)}</div>
            <div>Status: ${escapeHtml(g.status)}</div>
            ${g.area_km2 != null ? `<div>Area: ${Number(g.area_km2).toFixed(1)} km²</div>` : ""}
            ${g.length_km != null ? `<div>Length: ${Number(g.length_km).toFixed(1)} km</div>` : ""}
            ${g.elevation_max_m != null ? `<div>Max elev: ${g.elevation_max_m} m</div>` : ""}
          </div>`,
        )
        .addTo(map);
    });

    lakes.forEach((l) => {
      const c = tierClasses[l.current_tier];
      const radius = l.current_tier === "CRITICAL" ? 14 : l.current_tier === "HIGH" ? 11 : l.current_tier === "WATCH" ? 8 : 6;
      leaflet
        .circleMarker([l.lat, l.lng], {
          radius,
          color: c.hex,
          fillColor: c.hex,
          fillOpacity: 0.75,
          weight: 2,
        })
        .bindTooltip(`${l.name} · ${l.current_tier}`)
        .bindPopup(
          `<div class="space-y-1 text-xs">
            <div class="font-semibold">${escapeHtml(l.name)}</div>
            <div>Tier: ${l.current_tier}</div>
            ${l.current_risk_score != null ? `<div>Score: ${Number(l.current_risk_score).toFixed(0)}</div>` : ""}
            ${l.downstream_population != null ? `<div>Downstream: ${Number(l.downstream_population).toLocaleString()}</div>` : ""}
            <a href="/lakes/${encodeURIComponent(l.id)}" class="text-primary underline">Open lake →</a>
          </div>`,
        )
        .addTo(map);
    });

    facilities.forEach((f) => {
      if (!f.lat || !f.lng) return;
      leaflet
        .circleMarker([f.lat, f.lng], {
          radius: 5,
          color: "#1d4ed8",
          fillColor: "#1d4ed8",
          fillOpacity: 0.9,
          weight: 1,
        })
        .bindTooltip(`${f.name} (${f.type})`)
        .addTo(map);
    });

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      if (mapRef.current === map) mapRef.current = null;
      delete container._leaflet_id;
      container.replaceChildren();
    };
  }, [facilities, glaciers, lakes, leaflet, showGibs]);

  if (!leaflet) {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-xl border border-border bg-secondary/40 text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div ref={containerRef} style={{ height, width: "100%" }} />
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

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[char];
  });
}