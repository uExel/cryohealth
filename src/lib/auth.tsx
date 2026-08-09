import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getToken, decodeUser, signOut as clearToken, type AuthUser } from "@/lib/auth-client";
import type { Role } from "@/lib/jwt";

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

  function load() {
    const token = getToken();
    setUser(token ? decodeUser(token) : null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
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
        signOut: async () => {
          clearToken();
          setUser(null);
        },
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
