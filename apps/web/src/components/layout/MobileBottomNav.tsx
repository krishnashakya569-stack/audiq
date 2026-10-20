"use client";

import { Home, Library, Search, Users } from "lucide-react";
import type { AppView } from "./AppShell";

type MobileBottomNavProps = {
  activeView: AppView;
  isSearchActive: boolean;
  isSearchOpen: boolean;
  onHome: () => void;
  onSearch: () => void;
  onLibrary: () => void;
  onFriends: () => void;
};

export default function MobileBottomNav({
  activeView,
  isSearchActive,
  isSearchOpen,
  onHome,
  onSearch,
  onLibrary,
  onFriends,
}: MobileBottomNavProps) {
  const items = [
    {
      label: "Home",
      icon: Home,
      active: activeView === "home" && !isSearchActive && !isSearchOpen,
      onClick: onHome,
    },
    {
      label: "Search",
      icon: Search,
      active: (activeView === "home" && isSearchActive) || isSearchOpen,
      onClick: onSearch,
    },
    {
      label: "Library",
      icon: Library,
      active: activeView === "library",
      onClick: onLibrary,
    },
    {
      label: "Friends",
      icon: Users,
      active: activeView === "social",
      onClick: onFriends,
    },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="grid shrink-0 grid-cols-4 border-t border-[#d6ff36]/15 bg-[#050706]/95 px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden"
    >
      {items.map(({ label, icon: Icon, active, onClick }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          onClick={onClick}
          className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
            active ? "text-[#d6ff36]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <span className={`grid h-7 min-w-10 place-items-center rounded-full transition ${active ? "bg-[#d6ff36] text-[#07100d] shadow-[0_0_18px_rgba(214,255,54,0.18)]" : ""}`}>
            <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
