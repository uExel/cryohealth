import { apiBaseUrl, apiFetch, fetchLakesFromApi } from "./cryohealth-api";
import { getToken } from "./auth-client";

type Json = Record<string, any>;

function token(): string | undefined {
  return getToken() ?? undefined;
}

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const obj = value as Json;
    if (Array.isArray(obj.rows)) return obj.rows;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.alerts)) return obj.alerts;
    if (Array.isArray(obj.facilities)) return obj.facilities;
  }
  return [];
}

/* ------------------------------------------------------------------ *
 * Public GET endpoints — return the same shape the old /api proxy    *
 * handlers returned, but call the CryoHealth-api backend directly    *
 * on apiBaseUrl() (localhost:3000) instead of going through the      *
 * dashboard dev server on 8080.                                       *
 * ------------------------------------------------------------------ */

export async function fetchKpis(): Promise<Json> {
  return (await apiFetch("/kpis", { method: "GET" }, token())) as Json;
}

export async function fetchHotLakes(): Promise<{ lakes: any[] }> {
  return { lakes: asArray(await apiFetch("/hot-lakes", { method: "GET" }, token())) };
}

export async function fetchOpenAlerts(): Promise<{ alerts: any[] }> {
  const res = (await apiFetch("/alerts?pageSize=5", { method: "GET" }, token())) as any;
  const alerts = res?.items || res?.alerts || asArray(res);
  return { alerts };
}

export async function fetchGlaciers(): Promise<{ glaciers: any[] }> {
  return { glaciers: asArray(await apiFetch("/glaciers", { method: "GET" }, token())) };
}

export async function fetchProtocols(): Promise<{ protocols: any[] }> {
  return { protocols: asArray(await apiFetch("/protocols", { method: "GET" }, token())) };
}

export async function fetchAlerts(): Promise<{ alerts: any[]; total: number; hasMore: boolean }> {
  const res = (await apiFetch("/alerts?includeCleared=true", { method: "GET" }, token())) as any;
  const alerts = res?.items || res?.alerts || asArray(res);
  const total = res?.total ?? alerts.length;
  return { alerts, total, hasMore: alerts.length < total };
}

export async function fetchAlertAcks(): Promise<{ acks: any[] }> {
  return { acks: asArray(await apiFetch("/alert-acks", { method: "GET" }, token())) };
}

export async function fetchDistricts(): Promise<{ districts: any[] }> {
  return { districts: asArray(await apiFetch("/districts", { method: "GET" }, token())) };
}

export async function fetchChwProfiles(): Promise<{ profiles: any[] }> {
  return { profiles: asArray(await apiFetch("/chw-profiles", { method: "GET" }, token())) };
}

export async function fetchLakes(): Promise<{ lakes: any[] }> {
  return { lakes: (await fetchLakesFromApi()) as any[] };
}

export async function fetchLakesAdmin(): Promise<{ lakes: any[] }> {
  const res = (await apiFetch("/lakes-admin", { method: "GET" }, token())) as any;
  return { lakes: asArray(res) };
}

export async function fetchLakeDetail(lakeId: string): Promise<any | null> {
  try {
    return await apiFetch(`/lakes/${lakeId}/detail`, { method: "GET" }, token());
  } catch {
    return null;
  }
}

export async function fetchFacilities(): Promise<{ facilities: any[] }> {
  return { facilities: asArray(await apiFetch("/facilities", { method: "GET" }, token())) };
}

export async function fetchFacilitiesAdmin(): Promise<{
  facilities: any[];
  total: number;
  hasMore: boolean;
}> {
  const res = (await apiFetch("/admin/facilities", { method: "GET" }, token())) as any;
  const facilities = asArray(res);
  const total = res?.total ?? facilities.length;
  return { facilities, total, hasMore: res?.hasMore ?? false };
}

export async function fetchGlacierDetail(glacierId: string): Promise<any | null> {
  try {
    const glacier = await apiFetch(`/glaciers/${glacierId}`, { method: "GET" }, token());
    const observations = await apiFetch(
      `/glaciers/${glacierId}/observations`,
      { method: "GET" },
      token(),
    );
    const lakes = await apiFetch("/lakes", { method: "GET" }, token());
    const lakesList = asArray(lakes);
    return { glacier, observations, lakes: lakesList, cases: [] };
  } catch {
    return null;
  }
}

export async function fetchHazardScores(lakeId: string): Promise<any> {
  return apiFetch(`/lakes/${lakeId}/hazard-scores`, { method: "GET" }, token());
}

export async function fetchCases(): Promise<{ cases: any[]; total: number; hasMore: boolean }> {
  const res = (await apiFetch("/admin/cases", { method: "GET" }, token())) as any;
  const cases = res?.cases ?? res?.rows ?? [];
  const total = res?.total ?? cases.length;
  const hasMore = res?.hasMore ?? false;
  return { cases: asArray(cases), total, hasMore };
}

export async function fetchAdminUsers(): Promise<{ users: any[] }> {
  const res = (await apiFetch("/users", { method: "GET" }, token())) as any;
  return { users: asArray(res) };
}

export async function fetchSync(): Promise<any> {
  return apiFetch("/admin/sync", { method: "GET" }, token());
}

export async function fetchSystemHealth(): Promise<any> {
  return apiFetch("/admin/health", { method: "GET" }, token());
}

export async function fetchAudit(): Promise<any> {
  return apiFetch("/admin/audit", { method: "GET" }, token());
}

/* ------------------------------------------------------------------ *
 * Admin / write endpoints — call the backend directly with the       *
 * stored bearer token. Returns { ok, status, body } so components     *
 * can keep their existing res.ok / body.error handling.              *
 * ------------------------------------------------------------------ */

export type ApiResult = { ok: boolean; status: number; body: any };

export async function adminRequest(path: string, init: RequestInit = {}): Promise<ApiResult> {
  const base = apiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : "/" + path}`;
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
  const t = token();
  if (t) headers.set("authorization", `Bearer ${t}`);
  const res = await fetch(url, { ...init, headers });
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  return { ok: res.ok, status: res.status, body };
}
