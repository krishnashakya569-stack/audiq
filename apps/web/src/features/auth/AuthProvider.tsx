"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { withSignedAvatarUrls } from "@/lib/supabase/avatars";
import LibraryCloudSync from "@/features/library/LibraryCloudSync";
import type { AvatarStyle, ChatThemeId } from "./profileAppearance";
import type { MusicLanguage } from "@/features/settings/musicPreferences";

export type AudiqProfile = {
  id: string;
  audiq_id: string;
  display_name: string;
  handle: string;
  avatar_color: string;
  avatar_path: string | null;
  avatar_url: string | null;
  avatar_style: AvatarStyle;
  chat_theme: ChatThemeId;
  preferred_music_language: MusicLanguage;
};

type AuthContextValue = {
  user: User | null;
  profile: AudiqProfile | null;
  loading: boolean;
  profileLoading: boolean;
  supabase: ReturnType<typeof getSupabaseClient>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AudiqProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileRequest = useRef(0);

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

  const refreshProfile = useCallback(async () => {
    const requestId = ++profileRequest.current;
    if (!supabase || !user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,audiq_id,display_name,handle,avatar_color,avatar_path,avatar_style,chat_theme,preferred_music_language")
        .eq("id", user.id)
        .maybeSingle();
      if (requestId !== profileRequest.current) return;
      if (error || !data) {
        setProfile(null);
        return;
      }
      const [profileWithAvatar] = await withSignedAvatarUrls(supabase, [data as AudiqProfile]);
      if (requestId === profileRequest.current) setProfile(profileWithAvatar);
    } catch {
      if (requestId === profileRequest.current) setProfile(null);
    } finally {
      if (requestId === profileRequest.current) setProfileLoading(false);
    }
  }, [supabase, user]);

  /* eslint-disable react-hooks/set-state-in-effect -- Profile state synchronizes an asynchronous Supabase lookup with the current signed-in user. */
  useEffect(() => {
    void refreshProfile();
    return () => {
      profileRequest.current += 1;
    };
  }, [refreshProfile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  const value = useMemo(
    () => ({ user, profile, loading, profileLoading, supabase, refreshProfile, signOut }),
    [user, profile, loading, profileLoading, supabase, refreshProfile, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      <LibraryCloudSync userId={user?.id ?? null} supabase={supabase} />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

