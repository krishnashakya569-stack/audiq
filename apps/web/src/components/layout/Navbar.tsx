"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import {
  Bell,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NavbarProps = {
  term: string;
  onTermChange: (term: string) => void;
  accountName: string | null;
  audiqId: string | null;
  onOpenAuth: () => void;
  onSignOut: () => Promise<void>;
  onOpenAi: () => void;
  onSearch: (query: string) => void;
  onOpenSidebar: () => void;
  mobileSearchOpen: boolean;
  onMobileSearchOpenChange: (open: boolean) => void;
};

export default function Navbar({
  term,
  onTermChange,
  accountName,
  audiqId,
  onOpenAuth,
  onSignOut,
  onOpenAi,
  onSearch,
  onOpenSidebar,
  mobileSearchOpen,
  onMobileSearchOpenChange,
}: NavbarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearch(term.trim() || "starboy");
    }, 450);

    return () => window.clearTimeout(timer);
  }, [term, onSearch]);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#070908]/85 px-3 py-3 backdrop-blur-2xl md:px-8">
      <div className="flex min-h-14 items-center justify-between gap-3">

      {/* Left */}

      <div className="flex min-w-0 items-center gap-2 md:gap-3">

        {/* Mobile Menu */}

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="shrink-0 text-white lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Logo */}

        <Link href="/" className="flex min-w-0 items-center gap-2 md:gap-3">

          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#4db6ac]/25 bg-black shadow-lg shadow-[#00594f]/30 md:h-14 md:w-14">

            <Image
              src="/brand/audiq-vinyl.svg"
              alt="Audiq Logo"
              fill
              priority
              sizes="56px"
              className="object-cover"
            />

          </span>

          <span className="min-w-0">

            <span className="block truncate text-2xl font-black tracking-tight md:text-3xl">
              Audi
              <span className="text-[#00796b]">
                q
              </span>
            </span>

            <span className="hidden text-[10px] uppercase tracking-[0.32em] text-[#80cbc4] md:block">
              Audio Intelligence Community
            </span>

          </span>

        </Link>

      </div>

      {/* Search */}

      <form
        className="hidden md:flex w-[min(42vw,520px)] items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 py-1.5 transition focus-within:border-[#d6ff36]/40 focus-within:bg-white/[0.07]"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(term.trim() || "starboy");
        }}
      >

        <Search className="h-5 w-5 text-[#d6ff36]" />

        <Input
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder="Search your next obsession..."
          className="h-9 border-none bg-transparent text-sm text-white shadow-none placeholder:text-zinc-500 focus-visible:ring-0"
        />

      </form>

      {/* Right */}

      <div className="flex items-center gap-2 md:gap-3">

        {/* Mobile Search */}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Open search"
          onClick={() => onMobileSearchOpenChange(!mobileSearchOpen)}
          className="text-zinc-300 md:hidden"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* AI DJ */}

        <Button
          onClick={onOpenAi}
          className="hidden lg:flex items-center gap-2 rounded-full border border-[#d6ff36]/25 bg-[#d6ff36]/[0.08] text-[#e6ff8a] hover:border-[#d6ff36]/50 hover:bg-[#d6ff36]/[0.14]"
        >
          <Sparkles className="h-4 w-4" />
          AI DJ
        </Button>

        {/* Notifications */}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="hidden border border-white/10 bg-white/[0.06] sm:grid"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {/* Messages */}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Messages"
          className="hidden border border-white/10 bg-white/[0.06] sm:grid"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>

        {/* Account */}

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (!accountName) {
                onOpenAuth();
                return;
              }
              setAccountError("");
              setAccountMenuOpen((open) => !open);
            }}
            aria-label={accountName ? "Open account menu" : "Sign in or create an account"}
            aria-expanded={accountMenuOpen}
            className={accountName
              ? "flex items-center gap-2 rounded-full text-white"
              : "flex items-center gap-2 rounded-full border border-[#d6ff36]/30 bg-[#d6ff36] px-3.5 py-2 text-[#07100d] shadow-lg shadow-[#d6ff36]/10 transition hover:-translate-y-0.5 hover:bg-[#e4ff75]"}
          >
            {accountName ? (
              <Avatar className="h-10 w-10 border border-[#d6ff36]/40">
                <AvatarFallback className="bg-[#d6ff36] font-black text-[#07100d]">
                  {accountName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <LogIn aria-hidden="true" className="h-4 w-4" />
            )}
            <span className="text-xs font-black uppercase tracking-wide sm:text-sm">
              {accountName ? "Account" : "Sign in"}
            </span>
          </button>

          {accountMenuOpen && accountName ? (
            <div className="absolute right-0 top-full z-[70] mt-2 w-60 rounded-lg border border-white/10 bg-[#101412] p-3 shadow-2xl">
              <p className="truncate font-bold text-white">{accountName}</p>
              <p className="mt-1 text-xs text-zinc-400">{audiqId || "AudiQ ID loading…"}</p>
              {accountError && <p role="alert" className="mt-2 text-xs text-rose-300">{accountError}</p>}
              <button
                type="button"
                onClick={async () => {
                  setSigningOut(true);
                  setAccountError("");
                  try {
                    await onSignOut();
                    setAccountMenuOpen(false);
                  } catch {
                    setAccountError("Could not sign out. Please try again.");
                  } finally {
                    setSigningOut(false);
                  }
                }}
                disabled={signingOut}
                className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          ) : null}
        </div>

      </div>
      </div>

      {mobileSearchOpen ? (
        <form
          className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 md:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(term.trim() || "starboy");
            onMobileSearchOpenChange(false);
          }}
        >
          <Search className="h-5 w-5 shrink-0 text-[#d6ff36]" />
          <Input
            ref={mobileInputRef}
            value={term}
            onChange={(e) => onTermChange(e.target.value)}
            placeholder="Search Audiq"
            className="h-9 min-w-0 border-none bg-transparent text-sm text-white shadow-none placeholder:text-zinc-500 focus-visible:ring-0"
          />
        </form>
      ) : null}

    </header>
  );
}
