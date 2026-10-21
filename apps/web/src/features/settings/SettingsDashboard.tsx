"use client";

import {
  Check,
  Camera,
  CircleUserRound,
  Clock3,
  LogIn,
  LogOut,
  LockKeyhole,
  Moon,
  Palette,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import ProfileAvatar from "@/features/social/components/ProfileAvatar";
import { AVATAR_STYLE_OPTIONS, CHAT_THEME_OPTIONS, type AvatarStyle, type ChatThemeId } from "@/features/auth/profileAppearance";
import { useAudiqTheme, type AudiqTheme } from "@/features/settings/ThemeProvider";
import { AVATAR_BUCKET } from "@/lib/supabase/avatars";
import { useLibraryStore } from "@/store/library";
import { MUSIC_LANGUAGE_OPTIONS, type MusicLanguage } from "@/features/settings/musicPreferences";

type SettingsDashboardProps = {
  onOpenAuth: () => void;
};

export default function SettingsDashboard({ onOpenAuth }: SettingsDashboardProps) {
  const { user, profile, loading: authLoading, supabase, refreshProfile, signOut } = useAuth();
  const { theme, setTheme } = useAudiqTheme();
  const recentlyPlayed = useLibraryStore((state) => state.recentlyPlayed);
  const clearRecentlyPlayed = useLibraryStore((state) => state.clearRecentlyPlayed);
  const searchHistory = useLibraryStore((state) => state.searchHistory);
  const clearSearchHistory = useLibraryStore((state) => state.clearSearchHistory);
  const [pendingClear, setPendingClear] = useState<"listening" | "search" | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const changeTheme = (nextTheme: AudiqTheme) => {
    setTheme(nextTheme);
    setMessage(`${nextTheme === "dark" ? "Dark" : "Light"} appearance selected.`);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setMessage("");
    try {
      await signOut();
      setMessage("You have been signed out.");
    } catch {
      setMessage("Audiq could not sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const confirmClear = () => {
    if (pendingClear === "listening") {
      clearRecentlyPlayed();
      setMessage("Listening history cleared.");
    } else if (pendingClear === "search") {
      clearSearchHistory();
      setMessage("Search history cleared.");
    }
    setPendingClear(null);
  };

  async function updateProfilePreference(
    values: Partial<Pick<NonNullable<typeof profile>, "avatar_style" | "chat_theme" | "preferred_music_language">>,
    successMessage: string
  ) {
    if (!user || !supabase) return;
    setProfileBusy(true);
    setSettingsError("");
    try {
      const { error } = await supabase.from("profiles").update(values).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setMessage(successMessage);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Audiq could not save this profile setting.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user || !supabase) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSettingsError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSettingsError("Profile photos must be 5 MB or smaller.");
      return;
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const previousPath = profile?.avatar_path;
    setProfileBusy(true);
    setSettingsError("");
    try {
      const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", user.id);
      if (updateError) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path]);
        throw updateError;
      }
      await refreshProfile();
      if (previousPath) await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      setMessage("Profile photo updated.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Audiq could not upload that photo.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function removeAvatarPhoto() {
    if (!user || !supabase || !profile?.avatar_path) return;
    const previousPath = profile.avatar_path;
    setProfileBusy(true);
    setSettingsError("");
    try {
      const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      setMessage("Your illustrated avatar is back in use.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Audiq could not remove that photo.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    if (!supabase || !user) return;
    if (newPassword.length < 8) {
      setSettingsError("Use at least 8 characters for your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSettingsError("The new passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Your password has been changed.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Audiq could not change your password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-8">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,121,107,.22),rgba(0,121,107,.1),rgba(0,0,0,.2))] p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#80cbc4]">Audiq preferences</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Control how Audiq looks, manage your account, and clear activity stored in your library.</p>
      </header>

      {message && <p role="status" className="rounded-xl border border-[#00796b]/20 bg-[#00796b]/10 px-4 py-3 text-sm text-[#b2dfdb]">{message}</p>}
      {settingsError && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">{settingsError}</p>}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00594f]/20 text-[#80cbc4]"><Sun aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Appearance</h2>
            <p className="mt-1 text-sm text-zinc-400">Choose a dark or light look for the app. Your choice is saved on this device.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([
                { id: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes" },
                { id: "light", label: "Light", icon: Sun, description: "Bright and clear" },
              ] as const).map((option) => {
                const Icon = option.icon;
                const active = theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => changeTheme(option.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition sm:p-4 ${active ? "border-[#4db6ac]/60 bg-[#00594f]/15" : "border-white/10 bg-white/[0.025] hover:bg-white/[0.07]"}`}
                  >
                    <Icon aria-hidden="true" className={`h-5 w-5 ${active ? "text-[#4db6ac]" : "text-zinc-400"}`} />
                    <span className="min-w-0 flex-1"><span className="block font-semibold text-white">{option.label}</span><span className="block text-xs text-zinc-500">{option.description}</span></span>
                    {active && <Check aria-hidden="true" className="h-4 w-4 text-[#4db6ac]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00594f]/20 text-[#80cbc4]"><Search aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Music recommendations</h2>
            <p className="mt-1 text-sm text-zinc-400">Choose the language that should guide your For You picks. Audiq keeps India as the default catalog region.</p>
            {user ? (
              <label className="mt-4 block max-w-md text-sm text-zinc-300">
                Preferred music language
                <select
                  value={profile?.preferred_music_language ?? "auto"}
                  onChange={(event) => void updateProfilePreference({ preferred_music_language: event.target.value as MusicLanguage }, "Music preference saved to your account.")}
                  disabled={profileBusy || !profile}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b0d0c] px-3 py-2.5 text-white outline-none focus:border-[#80cbc4]/60 disabled:opacity-50"
                >
                  {MUSIC_LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <span className="mt-1 block text-xs text-zinc-500">Saved to your Audiq account and used to shape Explore recommendations.</span>
              </label>
            ) : <p className="mt-4 text-sm text-zinc-500">Sign in to save a music language preference across devices.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d6ff36]/10 text-[#d6ff36]"><Palette aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Chat colours</h2>
            <p className="mt-1 text-sm text-zinc-400">Choose the colour for your messages and chat controls. It follows your Audiq account across devices.</p>
            {user ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {CHAT_THEME_OPTIONS.map((option) => {
                  const active = (profile?.chat_theme ?? "lime") === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => void updateProfilePreference({ chat_theme: option.id as ChatThemeId }, `${option.label} chat colour selected.`)}
                      disabled={profileBusy}
                      aria-pressed={active}
                      className={`flex min-h-20 items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50 ${active ? "border-white/30 bg-white/[0.07]" : "border-white/10 bg-black/15 hover:bg-white/[0.06]"}`}
                    >
                      <span className="h-8 w-8 shrink-0 rounded-full" style={{ backgroundColor: option.color, boxShadow: `0 0 18px ${option.color}55` }} />
                      <span className="min-w-0"><span className="block text-xs font-bold text-white">{option.label}</span>{active && <Check aria-hidden="true" className="mt-1 h-4 w-4 text-[#d6ff36]" />}</span>
                    </button>
                  );
                })}
              </div>
            ) : <p className="mt-4 text-sm text-zinc-500">Sign in to save your chat colours to your account.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d6ff36]/10 text-[#d6ff36]"><Camera aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Profile photo and avatar</h2>
            <p className="mt-1 text-sm text-zinc-400">Upload a photo or use Audiq’s illustrated avatar. Photos are visible to signed-in Audiq members.</p>
            {user ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/15 p-4">
                  <ProfileAvatar profile={profile} className="h-20 w-20" />
                  <div className="flex flex-wrap gap-2">
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleAvatarFileChange(event)} className="sr-only" aria-label="Choose profile photo" />
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={profileBusy} className="inline-flex items-center gap-2 rounded-xl bg-[#d6ff36] px-4 py-2.5 text-sm font-black text-[#07100d] transition hover:bg-[#e4ff75] disabled:opacity-50"><Camera className="h-4 w-4" />{profile?.avatar_path ? "Change photo" : "Upload photo"}</button>
                    {profile?.avatar_path && <button type="button" onClick={() => void removeAvatarPhoto()} disabled={profileBusy} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50"><Trash2 className="h-4 w-4" />Use default avatar</button>}
                  </div>
                </div>
                <label className="mt-4 block max-w-md text-sm text-zinc-300">
                  Avatar style <span className="text-zinc-500">(optional)</span>
                  <select value={profile?.avatar_style ?? "prefer_not_to_say"} onChange={(event) => void updateProfilePreference({ avatar_style: event.target.value as AvatarStyle }, "Avatar style updated.")} disabled={profileBusy} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b0d0c] px-3 py-2.5 text-white outline-none focus:border-[#d6ff36]/60 disabled:opacity-50">
                    {AVATAR_STYLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <span className="mt-1 block text-xs text-zinc-500">This only changes your illustrated avatar. Audiq stores the avatar style you chose, not a gender label.</span>
                </label>
                <p className="mt-2 text-xs text-zinc-500">JPG, PNG, or WebP · up to 5 MB</p>
              </>
            ) : <p className="mt-4 text-sm text-zinc-500">Sign in to upload a photo or choose your avatar style.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00594f]/20 text-[#80cbc4]"><CircleUserRound aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Account</h2>
            <p className="mt-1 text-sm text-zinc-400">Sign in to keep your Audiq identity and connect with friends.</p>
            {authLoading ? (
              <p className="mt-4 text-sm text-zinc-400">Checking your account…</p>
            ) : user ? (
              <div className="mt-4 flex flex-col gap-4 rounded-xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{profile?.display_name || user.email || "Audiq user"}</p>
                  {user.email && <p className="mt-1 truncate text-sm text-zinc-400">{user.email}</p>}
                  {profile?.audiq_id && <p className="mt-1 text-xs font-semibold text-[#80cbc4]">Audiq ID · {profile.audiq_id}</p>}
                </div>
                <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-200 disabled:opacity-50">
                  <LogOut aria-hidden="true" className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-400">You’re listening as a guest. Sign in to use your Audiq ID, friends, and messages.</p>
                <button type="button" onClick={onOpenAuth} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#00594f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#00695c]">
                  <LogIn aria-hidden="true" className="h-4 w-4" /> Sign in / create account
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d6ff36]/10 text-[#d6ff36]"><LockKeyhole aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Change password</h2>
            <p className="mt-1 text-sm text-zinc-400">Choose a new password for your Audiq sign-in.</p>
            {user ? (
              <form onSubmit={(event) => void handlePasswordChange(event)} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
                <label className="block text-sm text-zinc-300">New password<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-white outline-none focus:border-[#d6ff36]/60" /></label>
                <label className="block text-sm text-zinc-300">Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-white outline-none focus:border-[#d6ff36]/60" /></label>
                <button type="submit" disabled={passwordBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6ff36] px-4 py-2.5 text-sm font-black text-[#07100d] transition hover:bg-[#e4ff75] disabled:cursor-wait disabled:opacity-50 sm:col-span-2">{passwordBusy ? "Updating…" : "Update password"}</button>
                <p className="text-xs text-zinc-500 sm:col-span-2">Use at least 8 characters. Your password is updated securely through Audiq sign-in.</p>
              </form>
            ) : <p className="mt-4 text-sm text-zinc-500">Sign in to change your password.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00594f]/20 text-[#80cbc4]"><Clock3 aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">Privacy and activity</h2>
            <p className="mt-1 text-sm text-zinc-400">Manage recent listening and searches saved in your Audiq library.</p>
            <div className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 bg-black/15">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-white">Listening history</p><p className="mt-1 text-xs text-zinc-500">{recentlyPlayed.length} recently played {recentlyPlayed.length === 1 ? "track" : "tracks"}</p></div>
                <button type="button" onClick={() => setPendingClear("listening")} disabled={recentlyPlayed.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 aria-hidden="true" className="h-4 w-4" /> Clear history</button>
              </div>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-white">Search history</p><p className="mt-1 text-xs text-zinc-500">{searchHistory.length} saved {searchHistory.length === 1 ? "search" : "searches"}</p></div>
                <button type="button" onClick={() => setPendingClear("search")} disabled={searchHistory.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><Search aria-hidden="true" className="h-4 w-4" /> Clear searches</button>
              </div>
            </div>
            {pendingClear && (
              <div role="group" aria-label="Confirm activity deletion" className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-100">Clear {pendingClear === "listening" ? "your listening history" : "your search history"}? This can’t be undone.</p>
                <span className="flex gap-2"><button type="button" onClick={() => setPendingClear(null)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10">Cancel</button><button type="button" onClick={confirmClear} className="rounded-lg bg-red-500/80 px-3 py-2 text-sm font-bold text-white hover:bg-red-500">Clear now</button></span>
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

