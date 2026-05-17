import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "chw" | "facility_admin" | "cryohealth_admin" | "public_viewer";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  roles: Role[];
  isAdmin: boolean;
  isCHW: boolean;
  loading: boolean;
  rolesLoaded: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  roles: [],
  isAdmin: false,
  isCHW: false,
  loading: true,
  rolesLoaded: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setRolesLoaded(false);
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
        setRolesLoaded(true);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadRoles(data.session.user.id);
      } else {
        setRolesLoaded(true);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data?.map((r) => r.role as Role)) ?? []);
    setRolesLoaded(true);
  }

  const isAdmin = roles.includes("cryohealth_admin") || roles.includes("facility_admin");
  const isCHW = roles.includes("chw");

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        roles,
        isAdmin,
        isCHW,
        loading,
        rolesLoaded,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}