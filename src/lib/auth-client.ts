import { decodeJwt } from "jose";
import type { JwtPayload, Role } from "@/lib/jwt";

const STORAGE_KEY = "cryohealth_token";

export type AuthUser = { id: string; name: string; role: Role };

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Client-side only: reads the token's claims for display. The server always
 *  re-verifies the signature — this never needs the secret. */
export function decodeUser(token: string): AuthUser | null {
  try {
    const payload = decodeJwt(token) as unknown as JwtPayload;
    if (!payload.sub) return null;
    return { id: payload.sub, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

export async function login(identifier: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Login failed");
  setToken(body.accessToken);
  return { id: decodeUser(body.accessToken)!.id, name: body.name, role: body.role };
}

export function signOut() {
  clearToken();
}

/** Fetch wrapper that attaches the stored bearer token, for calls to routes
 *  guarded by `requireAuth`. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
