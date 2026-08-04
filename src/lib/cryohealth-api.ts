import type { Tier } from "@/lib/tier";

const API_TIER: Record<string, Tier> = {
  normal: "NORMAL",
  watch: "WATCH",
  high: "HIGH",
  critical: "CRITICAL",
};

type ApiGeomPoint = { type: "Point"; coordinates: [number, number] };

type ApiLake = {
  id: string;
  name: string;
  district: string;
  currentTier: string;
  stale: boolean;
  elevationM: number | null;
  geom: ApiGeomPoint;
  updatedAt: string;
};

export type Lake = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  current_tier: Tier;
  stale: boolean;
  district_id: string;
  elevation_m: number | null;
  last_updated: string;
  // Not yet exposed by CryoHealth-api — see cryohealth-api#<follow-up>.
  current_risk_score?: number;
  downstream_population?: number;
};

function apiBaseUrl(): string {
  const url = import.meta.env.VITE_CRYOHEALTH_API_URL || process.env.CRYOHEALTH_API_URL;
  if (!url) throw new Error("Missing CRYOHEALTH_API_URL environment variable.");
  return url.replace(/\/+$/, "");
}

function toLake(l: ApiLake): Lake {
  const [lng, lat] = l.geom.coordinates;
  return {
    id: l.id,
    name: l.name,
    lat,
    lng,
    current_tier: API_TIER[l.currentTier] ?? "NORMAL",
    stale: l.stale,
    district_id: l.district,
    elevation_m: l.elevationM,
    last_updated: l.updatedAt,
  };
}

/**
 * Server-side only: CryoHealth-api has no CORS headers, so this must run same-origin
 * (inside a TanStack Start server route), never from the browser directly.
 * Pulls every page — the hazard map needs the full set, not one page at a time.
 */
export async function fetchLakesFromApi(): Promise<Lake[]> {
  const base = apiBaseUrl();
  const pageSize = 100;
  let page = 1;
  const items: ApiLake[] = [];

  while (true) {
    const res = await fetch(`${base}/lakes?page=${page}&pageSize=${pageSize}`);
    if (!res.ok) throw new Error(`CryoHealth-api /lakes returned ${res.status}`);
    const body: { items: ApiLake[]; total: number } = await res.json();
    items.push(...body.items);
    if (items.length >= body.total || body.items.length === 0) break;
    page += 1;
  }

  return items.map(toLake);
}

/** Client-side: same-origin proxy, avoiding CryoHealth-api's missing CORS headers. */
export async function fetchLakes(): Promise<Lake[]> {
  const res = await fetch("/api/public/lakes");
  if (!res.ok) throw new Error(`/api/public/lakes returned ${res.status}`);
  const body: { lakes: Lake[] } = await res.json();
  return body.lakes;
}
