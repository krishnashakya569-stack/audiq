"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export type AudiqProfile = {
  id: string;
  audiq_id: string;
  display_name: string;
  handle: string;
  avatar_color: string;
};

type AuthContextValue = {
  user: User | null;
  profile: AudiqProfile | null;
  loading: boolean;
  profileLoading: boolean;
  supabase: ReturnType<typeof getSupabaseClient>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AudiqProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- Initial auth bootstrap needs to finish when no Supabase client is configured. */
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Profile state synchronizes an asynchronous Supabase lookup with the current signed-in user. */
  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    setProfileLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,audiq_id,display_name,handle,avatar_color")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setProfile(error ? null : (data as AudiqProfile | null) ?? null);
      setProfileLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase, user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  const value = useMemo(
    () => ({ user, profile, loading, profileLoading, supabase, signOut }),
    [user, profile, loading, profileLoading, supabase, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
