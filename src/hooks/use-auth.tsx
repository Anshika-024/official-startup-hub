import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "official" | "startup";

export interface AuthState {
  session: Session | null;
  role: AccountRole | null;
  displayName: string | null;
  startupName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [startupName, setStartupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const [roleRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).limit(1),
      supabase.from("profiles").select("display_name, startup_name").eq("id", userId).limit(1),
    ]);
    const nextRole = roleRes.data?.[0]?.role;
    setRole(nextRole === "official" || nextRole === "startup" ? nextRole : null);
    setDisplayName(profileRes.data?.[0]?.display_name ?? null);
    setStartupName(profileRes.data?.[0]?.startup_name ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        setRole(null);
        setDisplayName(null);
        setStartupName(null);
        setLoading(false);
        return;
      }
      void loadProfile(nextSession.user.id).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (!data.session?.user) {
        setLoading(false);
        return;
      }
      void loadProfile(data.session.user.id).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
    setDisplayName(null);
    setStartupName(null);
  }, []);

  return { session, role, displayName, startupName, loading, signIn, signOut };
}
