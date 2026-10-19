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
      className="grid shrink-0 grid-cols-4 border-t border-white/10 bg-[#050706]/95 px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
    >
      {items.map(({ label, icon: Icon, active, onClick }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          onClick={onClick}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors ${
            active ? "text-[#4db6ac]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
