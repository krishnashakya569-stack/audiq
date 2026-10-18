"use client";

import {
  Check,
  CircleUserRound,
  Clock3,
  LogIn,
  LogOut,
  Moon,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAudiqTheme, type AudiqTheme } from "@/features/settings/ThemeProvider";
import { useLibraryStore } from "@/store/library";

type SettingsDashboardProps = {
  onOpenAuth: () => void;
};

export default function SettingsDashboard({ onOpenAuth }: SettingsDashboardProps) {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { theme, setTheme } = useAudiqTheme();
  const recentlyPlayed = useLibraryStore((state) => state.recentlyPlayed);
  const clearRecentlyPlayed = useLibraryStore((state) => state.clearRecentlyPlayed);
  const searchHistory = useLibraryStore((state) => state.searchHistory);
  const clearSearchHistory = useLibraryStore((state) => state.clearSearchHistory);
  const [pendingClear, setPendingClear] = useState<"listening" | "search" | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState("");

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

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-8">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(176,19,64,.3),rgba(68,215,182,.08),rgba(0,0,0,.2))] p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f5c2ce]">Audiq preferences</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Control how Audiq looks, manage your account, and clear activity stored in your library.</p>
      </header>

      {message && <p role="status" className="rounded-xl border border-[#44d7b6]/20 bg-[#44d7b6]/10 px-4 py-3 text-sm text-[#b5ffe9]">{message}</p>}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#b01340]/20 text-[#ff8eae]"><Sun aria-hidden="true" className="h-5 w-5" /></span>
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
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition sm:p-4 ${active ? "border-[#ff5c8a]/60 bg-[#b01340]/15" : "border-white/10 bg-white/[0.025] hover:bg-white/[0.07]"}`}
                  >
                    <Icon aria-hidden="true" className={`h-5 w-5 ${active ? "text-[#ff5c8a]" : "text-zinc-400"}`} />
                    <span className="min-w-0 flex-1"><span className="block font-semibold text-white">{option.label}</span><span className="block text-xs text-zinc-500">{option.description}</span></span>
                    {active && <Check aria-hidden="true" className="h-4 w-4 text-[#ff5c8a]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#b01340]/20 text-[#ff8eae]"><CircleUserRound aria-hidden="true" className="h-5 w-5" /></span>
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
                  {profile?.audiq_id && <p className="mt-1 text-xs font-semibold text-[#ff8eae]">Audiq ID · {profile.audiq_id}</p>}
                </div>
                <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-200 disabled:opacity-50">
                  <LogOut aria-hidden="true" className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-400">You’re listening as a guest. Sign in to use your Audiq ID, friends, and messages.</p>
                <button type="button" onClick={onOpenAuth} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#b01340] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#cc174d]">
                  <LogIn aria-hidden="true" className="h-4 w-4" /> Sign in / create account
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#b01340]/20 text-[#ff8eae]"><Clock3 aria-hidden="true" className="h-5 w-5" /></span>
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
