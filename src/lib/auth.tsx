import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { decodeJwt } from "jose";
import { getToken, decodeUser, signOut as clearToken, type AuthUser } from "@/lib/auth-client";
import type { Role } from "@/lib/jwt";

export const ROLE_ROUTES: Record<Role, string> = {
  cryohealth_admin: "/admin",
  facility_admin: "/admin",
  chw: "/chw",
  viewer: "/chw",
};

const PUBLIC_PATHS = ["/", "/dashboard", "/lakes", "/data", "/about"] as const;

let signoutTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSignout(token: string | null, signOut: () => void) {
  if (signoutTimer) {
    clearTimeout(signoutTimer);
    signoutTimer = undefined;
  }
  if (!token) return;
  try {
    const { exp } = decodeJwt(token) as { exp?: number };
    if (!exp) return;
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) {
      signOut();
      return;
    }
    signoutTimer = setTimeout(() => signOut(), ms);
  } catch {
    signOut();
  }
}

/** Returns true when `pathname` is a public, non-workspace route that an
 *  authenticated user should be redirected away from (see `beforeLoad` in
 *  `__root.tsx`). `/alerts` is excluded because CHW acknowledgment lives there. */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number])) return true;
  if (pathname.startsWith("/lakes/")) return true;
  return false;
}

type AuthCtx = {
  user: AuthUser | null;
  roles: Role[];
  isAdmin: boolean;
  isCryoHealthAdmin: boolean;
  isCHW: boolean;
  loading: boolean;
  rolesLoaded: boolean;
  signOut: () => Promise<void>;
  refresh: () => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  roles: [],
  isAdmin: false,
  isCryoHealthAdmin: false,
  isCHW: false,
  loading: true,
  rolesLoaded: false,
  signOut: async () => {},
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    clearToken();
    setUser(null);
  };

  function load() {
    const token = getToken();
    setUser(token ? decodeUser(token) : null);
    setLoading(false);
    scheduleSignout(token, signOut);
  }

  useEffect(() => {
    load();
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("storage", load);
      if (signoutTimer) clearTimeout(signoutTimer);
    };
  }, []);

  const roles: Role[] = user ? [user.role] : [];
  const isAdmin = user?.role === "cryohealth_admin" || user?.role === "facility_admin";
  const isCryoHealthAdmin = user?.role === "cryohealth_admin";
  const isCHW = user?.role === "chw";

  return (
    <Ctx.Provider
      value={{
        user,
        roles,
        isAdmin,
        isCryoHealthAdmin,
        isCHW,
        loading,
        rolesLoaded: !loading,
        signOut,
        refresh: load,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
