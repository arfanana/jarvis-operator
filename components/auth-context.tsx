"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  configured: boolean;
  devBypass: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, configured: false, devBypass: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = supabaseConfigured();
  const devBypass = !configured && typeof window !== "undefined" && process.env.NEXT_PUBLIC_DEMO_PERSISTENCE !== "false";

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_ev, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut().catch(() => {});
    setUser(null);
    window.location.href = "/login";
  }, []);

  return <Ctx.Provider value={{ user, loading, configured, devBypass, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  return useContext(Ctx);
}
