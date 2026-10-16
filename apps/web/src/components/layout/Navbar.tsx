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
  query: string;
  accountName: string | null;
  audiqId: string | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenAi: () => void;
  onSearch: (query: string) => void;
  onOpenSidebar: () => void;
};

export default function Navbar({
  query,
  accountName,
  audiqId,
  onOpenAuth,
  onSignOut,
  onOpenAi,
  onSearch,
  onOpenSidebar,
}: NavbarProps) {
  const [term, setTerm] = useState(query);
  const [mobileSearchOpen, setMobileSearchOpen] =
    useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070607]/90 px-3 py-3 backdrop-blur-xl md:px-8">
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

          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#ff5c8a]/25 bg-black shadow-lg shadow-[#b01340]/30 md:h-14 md:w-14">

            <Image
              src="/brand/audiq-logo.png"
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
              <span className="text-[#ff2d67]">
                q
              </span>
            </span>

            <span className="hidden text-[10px] uppercase tracking-[0.32em] text-[#f5c2ce] md:block">
              Audio Intelligence Community
            </span>

          </span>

        </Link>

      </div>

      {/* Search */}

      <form
        className="hidden md:flex w-[min(42vw,520px)] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(term.trim() || "starboy");
        }}
      >

        <Search className="h-5 w-5 text-[#f5c2ce]" />

        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search songs, artists, playlists..."
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
          onClick={() => setMobileSearchOpen((value) => !value)}
          className="text-zinc-300 md:hidden"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* AI DJ */}

        <Button
          onClick={onOpenAi}
          className="hidden lg:flex items-center gap-2 bg-[#b01340]/20 border border-[#b01340]/50 text-[#f5c2ce] hover:bg-[#b01340]/35"
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
              setAccountMenuOpen((open) => !open);
            }}
            aria-label={accountName ? "Open account menu" : "Sign in or create an account"}
            aria-expanded={accountMenuOpen}
            className={accountName
              ? "flex items-center gap-2 rounded-full text-white"
              : "flex items-center gap-2 rounded-lg border border-[#ff2d67]/40 bg-[#b01340]/20 px-2.5 py-1.5 text-white hover:bg-[#b01340]/35"}
          >
            {accountName ? (
              <Avatar className="h-10 w-10 border border-[#ff2d67]/40">
                <AvatarFallback className="bg-[#800f2f] font-bold text-white">
                  {accountName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <LogIn aria-hidden="true" className="h-4 w-4" />
            )}
            <span className="text-xs font-semibold sm:text-sm">
              {accountName ? "Account" : "Sign in"}
            </span>
          </button>

          {accountMenuOpen && accountName ? (
            <div className="absolute right-0 top-full z-[70] mt-2 w-60 rounded-lg border border-white/10 bg-[#151318] p-3 shadow-2xl">
              <p className="truncate font-bold text-white">{accountName}</p>
              <p className="mt-1 text-xs text-zinc-400">{audiqId || "AudiQ ID loading…"}</p>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onSignOut();
                }}
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
            setMobileSearchOpen(false);
          }}
        >
          <Search className="h-5 w-5 shrink-0 text-[#f5c2ce]" />
          <Input
            ref={mobileInputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search Audiq"
            className="h-9 min-w-0 border-none bg-transparent text-sm text-white shadow-none placeholder:text-zinc-500 focus-visible:ring-0"
          />
        </form>
      ) : null}

    </header>
  );
}
