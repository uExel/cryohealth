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
  current_risk_score?: number;
  downstream_population?: number;
};

export function apiBaseUrl(): string {
  const url = import.meta.env.VITE_CRYOHEALTH_API_URL || process.env.CRYOHEALTH_API_URL;
  if (!url) return "http://localhost:3000";
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

/** Server-side only: Pulls every page of lakes from backend API */
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

/** Client-side: proxy endpoint */
export async function fetchLakes(): Promise<Lake[]> {
  const res = await fetch("/api/public/lakes");
  if (!res.ok) throw new Error(`/api/public/lakes returned ${res.status}`);
  const body: { lakes: Lake[] } = await res.json();
  return body.lakes;
}

export type ApiHealth = { status: string; database: string };

export async function fetchApiHealth(): Promise<ApiHealth> {
  const res = await fetch(`${apiBaseUrl()}/health`);
  if (!res.ok) throw new Error(`CryoHealth-api /health returned ${res.status}`);
  return (await res.json()) as ApiHealth;
}

/** Generic fetch helper for backend API calls */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const base = apiBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path.startsWith("/") ? path : "/" + path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      if (contentType.includes("application/json")) {
        const body = await res.json();
        errorMsg = body.error || body.message || errorMsg;
      } else {
        errorMsg = await res.text();
      }
    } catch {
      /* fallback */
    }
    throw new Error(errorMsg);
  }

  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}
