"use client";

import { useState } from "react";
import AiDj from "@/features/ai/components/AiDj";
import LibraryDashboard, { type LibraryTab } from "@/features/library/components/LibraryDashboard";
import SocialHub, { type SocialTab } from "@/features/social/components/SocialHub";
import HomeFeed from "@/features/home/components/HomeFeed";
import MusicPlayer from "./MusicPlayer";
import Navbar from "./Navbar";
import RightPanel from "./RightPanel";
import Sidebar from "./Sidebar";

export type AppView = "home" | "library" | "ai" | "social";

export default function AppShell() {
  const [query, setQuery] = useState("starboy");
  const [view, setView] = useState<AppView>("home");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("liked");
  const [socialTab, setSocialTab] = useState<SocialTab>("friends");

  const openLibrary = (tab: LibraryTab = "liked") => {
    setLibraryTab(tab);
    setView("library");
  };

  const openSocial = (tab: SocialTab = "friends") => {
    setSocialTab(tab);
    setView("social");
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#070607] text-white">
      <Navbar query={query} onOpenAi={() => setView("ai")} onSearch={setQuery} />

      <div className="flex flex-1 overflow-hidden px-3 pb-3 md:px-5">

        <aside className="hidden w-72 shrink-0 overflow-hidden rounded-l-lg border border-r-0 border-white/10 bg-[#0d0d10]/85 lg:block">
          <Sidebar
            activeLibraryTab={libraryTab}
            activeSocialTab={socialTab}
            activeView={view}
            onLibraryTabChange={openLibrary}
            onSocialTabChange={openSocial}
            onViewChange={setView}
          />
        </aside>

        <main className="no-scrollbar flex-1 overflow-y-auto border border-white/10 bg-[#080709]/80 p-4 md:p-6 xl:p-8">
          {view === "social" ? (
            <SocialHub activeTab={socialTab} onTabChange={setSocialTab} />
          ) : view === "ai" ? (
            <AiDj />
          ) : view === "library" ? (
            <LibraryDashboard activeTab={libraryTab} onTabChange={setLibraryTab} />
          ) : (
            <HomeFeed query={query} />
          )}
        </main>

        <aside className="hidden w-96 shrink-0 rounded-r-lg border border-l-0 border-white/10 bg-[#0d0d10]/85 xl:block">
          <RightPanel />
        </aside>

      </div>

      <MusicPlayer />
    </div>
  );
}
