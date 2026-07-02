"use client";

import Link from "next/link";
import { Bell, MessageCircle, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

type NavbarProps = {
  query: string;
  onOpenAi: () => void;
  onSearch: (query: string) => void;
};

export default function Navbar({ query, onOpenAi, onSearch }: NavbarProps) {
  const [term, setTerm] = useState(query);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearch(term.trim() || "starboy");
    }, 450);

    return () => window.clearTimeout(timer);
  }, [onSearch, term]);

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-white/10 bg-[#070607]/90 px-4 backdrop-blur-xl md:px-8">
      <Link href="/" className="flex items-center gap-3">
        <span className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#ff5c8a]/25 bg-black shadow-lg shadow-[#b01340]/30">
          <Image src="/brand/audiq-logo.png" alt="Audiq logo" fill sizes="56px" className="object-cover" priority />
        </span>
        <span>
          <span className="block text-2xl font-black tracking-tight md:text-3xl">
            Audi<span className="text-[#ff2d67]">q</span>
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.32em] text-[#f5c2ce] md:block">
            Audio Intelligence Community
          </span>
        </span>
      </Link>

      <form
        className="hidden w-[min(42vw,520px)] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-1.5 md:flex"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(term.trim() || "starboy");
        }}
      >
        <Search className="h-5 w-5 text-[#f5c2ce]" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search songs, artists, playlists, friends..."
          className="h-9 border-none bg-transparent text-sm text-white shadow-none placeholder:text-zinc-500 focus-visible:ring-0"
        />
      </form>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          type="button"
          onClick={onOpenAi}
          className="hidden items-center gap-2 rounded-lg border border-[#b01340]/50 bg-[#b01340]/15 px-4 py-2 text-sm font-semibold text-[#f5c2ce] transition hover:bg-[#b01340]/25 lg:flex"
        >
          <Sparkles className="h-4 w-4" />
          AI DJ
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-[#ff2d67]/50 hover:text-white">
          <Bell className="h-5 w-5" />
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-[#ff2d67]/50 hover:text-white">
          <MessageCircle className="h-5 w-5" />
        </button>
        <Avatar className="h-10 w-10 cursor-pointer border border-[#ff2d67]/40">
          <AvatarFallback className="bg-[#800f2f] text-sm font-bold text-white">
            KS
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
