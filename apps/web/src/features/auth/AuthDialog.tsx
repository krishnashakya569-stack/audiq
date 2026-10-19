"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";

type AuthDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function AuthDialog({ open, onClose }: AuthDialogProps) {
  const { supabase } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!supabase) {
      setError("Audiq sign-in is not configured yet. Add the Supabase URL and publishable key to the app environment.");
      return;
    }

    const safeHandle = handle.trim().toLowerCase();
    if (
      mode === "signup" &&
      !/^[a-z0-9_]{3,24}$/.test(safeHandle)
    ) {
      setError("Your username must be 3–24 characters using letters, numbers, or underscores.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
              handle: safeHandle,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Account created. Check your email to confirm your address, then sign in.");
          setMode("signin");
          setPassword("");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }

      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not complete sign-in. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#111014] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#80cbc4]">AudiQ community</p>
            <h2 id="auth-dialog-title" className="mt-2 text-2xl font-black text-white">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sign in to get your own AudiQ ID, find friends, and chat about music.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close sign-in" className="rounded-md px-2 py-1 text-zinc-400 hover:bg-white/10 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-white/10 bg-black/20 p-1">
          {(["signin", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setError("");
                setNotice("");
              }}
              className={`rounded-md px-3 py-2 text-sm font-bold ${mode === item ? "bg-[#00594f] text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {item === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === "signup" ? (
            <>
              <label className="block text-sm text-zinc-300">
                Display name
                <input required maxLength={50} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#00796b]/60" />
              </label>
              <label className="block text-sm text-zinc-300">
                Username
                <span className="mt-1.5 flex items-center rounded-md border border-white/10 bg-black/30 px-3 text-zinc-500 focus-within:border-[#00796b]/60">
                  @
                  <input required minLength={3} maxLength={24} autoCapitalize="none" value={handle} onChange={(event) => setHandle(event.target.value)} className="w-full bg-transparent px-2 py-2.5 text-white outline-none" placeholder="yourname" />
                </span>
              </label>
            </>
          ) : null}

          <label className="block text-sm text-zinc-300">
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#00796b]/60" />
          </label>
          <label className="block text-sm text-zinc-300">
            Password
            <input required type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-[#00796b]/60" />
            {mode === "signup" ? <span className="mt-1 block text-xs text-zinc-500">Use at least 8 characters.</span> : null}
          </label>

          {notice ? <p role="status" className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p> : null}
          {error ? <p role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

          <button disabled={busy} type="submit" className="w-full rounded-md bg-[#00796b] px-4 py-3 text-sm font-black text-white transition hover:bg-[#00695c] disabled:cursor-wait disabled:opacity-60">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </div>
  );
}
