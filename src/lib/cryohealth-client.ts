import { apiBaseUrl, apiFetch, fetchLakesFromApi } from "./cryohealth-api";
import { getToken } from "./auth-client";

type Json = Record<string, unknown>;

function token(): string | undefined {
  return getToken() ?? undefined;
}

function asArray(value: unknown): unknown[] {
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

function getProp<T>(obj: unknown, key: string): T | undefined {
  if (obj && typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    if (key in record) {
      return record[key] as T;
    }
  }
  return undefined;
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

export async function fetchHotLakes(): Promise<{ lakes: unknown[] }> {
  return { lakes: asArray(await apiFetch("/hot-lakes", { method: "GET" }, token())) };
}

export async function fetchOpenAlerts(): Promise<{ alerts: unknown[] }> {
  const res = await apiFetch("/alerts?pageSize=5", { method: "GET" }, token());
  const alerts =
    getProp<unknown[]>(res, "items") || getProp<unknown[]>(res, "alerts") || asArray(res);
  return { alerts };
}

export async function fetchGlaciers(): Promise<{ glaciers: unknown[] }> {
  return { glaciers: asArray(await apiFetch("/glaciers", { method: "GET" }, token())) };
}

export async function fetchProtocols(): Promise<{ protocols: unknown[] }> {
  return { protocols: asArray(await apiFetch("/protocols", { method: "GET" }, token())) };
}

export async function fetchAlerts(): Promise<{
  alerts: unknown[];
  total: number;
  hasMore: boolean;
}> {
  const res = await apiFetch("/alerts?includeCleared=true", { method: "GET" }, token());
  const alerts =
    getProp<unknown[]>(res, "items") || getProp<unknown[]>(res, "alerts") || asArray(res);
  const total = getProp<number>(res, "total") ?? alerts.length;
  return { alerts, total, hasMore: alerts.length < total };
}

export async function fetchAlertAcks(): Promise<{ acks: unknown[] }> {
  return { acks: asArray(await apiFetch("/alert-acks", { method: "GET" }, token())) };
}

export async function fetchDistricts(): Promise<{ districts: unknown[] }> {
  return { districts: asArray(await apiFetch("/districts", { method: "GET" }, token())) };
}

export async function fetchChwProfiles(): Promise<{ profiles: unknown[] }> {
  return { profiles: asArray(await apiFetch("/chw-profiles", { method: "GET" }, token())) };
}

export async function fetchLakes(): Promise<{ lakes: unknown[] }> {
  return { lakes: (await fetchLakesFromApi()) as unknown[] };
}

export async function fetchLakesAdmin(): Promise<{ lakes: unknown[] }> {
  const res = await apiFetch("/lakes-admin", { method: "GET" }, token());
  return { lakes: asArray(res) };
}

export async function fetchLakeDetail(lakeId: string): Promise<unknown | null> {
  try {
    return await apiFetch(`/lakes/${lakeId}/detail`, { method: "GET" }, token());
  } catch {
    return null;
  }
}

export async function fetchFacilities(): Promise<{ facilities: unknown[] }> {
  return { facilities: asArray(await apiFetch("/facilities", { method: "GET" }, token())) };
}

export async function fetchFacilitiesAdmin(): Promise<{
  facilities: unknown[];
  total: number;
  hasMore: boolean;
}> {
  const res = await apiFetch("/admin/facilities", { method: "GET" }, token());
  const facilities = asArray(res);
  const total = getProp<number>(res, "total") ?? facilities.length;
  return { facilities, total, hasMore: getProp<boolean>(res, "hasMore") ?? false };
}

export async function fetchGlacierDetail(glacierId: string): Promise<unknown | null> {
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

export async function fetchHazardScores(lakeId: string): Promise<unknown> {
  return apiFetch(`/lakes/${lakeId}/hazard-scores`, { method: "GET" }, token());
}

export async function fetchCases(): Promise<{ cases: unknown[]; total: number; hasMore: boolean }> {
  const res = await apiFetch("/admin/cases", { method: "GET" }, token());
  const cases = getProp<unknown[]>(res, "cases") || getProp<unknown[]>(res, "rows") || [];
  const total = getProp<number>(res, "total") ?? cases.length;
  const hasMore = getProp<boolean>(res, "hasMore") ?? false;
  return { cases: asArray(cases), total, hasMore };
}

export async function fetchAdminUsers(): Promise<{ users: unknown[] }> {
  const res = await apiFetch("/users", { method: "GET" }, token());
  return { users: asArray(res) };
}

export async function fetchSync(): Promise<unknown> {
  return apiFetch("/admin/sync", { method: "GET" }, token());
}

export async function fetchSystemHealth(): Promise<unknown> {
  return apiFetch("/admin/health", { method: "GET" }, token());
}

export async function fetchAudit(): Promise<unknown> {
  return apiFetch("/admin/audit", { method: "GET" }, token());
}

/* ------------------------------------------------------------------ *
 * Admin / write endpoints — call the backend directly with the       *
 * stored bearer token. Returns { ok, status, body } so components     *
 * can keep their existing res.ok / body.error handling.              *
 * ------------------------------------------------------------------ */

export type ApiResult = { ok: boolean; status: number; body: unknown };

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
