"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";

import AiDj from "@/features/ai/components/AiDj";
import ExploreDashboard from "@/features/explore/components/ExploreDashboard";
import SettingsDashboard from "@/features/settings/SettingsDashboard";
import HomeFeed from "@/features/home/components/HomeFeed";
import LibraryDashboard, {
  type LibraryTab,
} from "@/features/library/components/LibraryDashboard";
import SocialHub, {
  type SocialTab,
} from "@/features/social/components/SocialHub";
import AuthDialog from "@/features/auth/AuthDialog";
import { useAuth } from "@/features/auth/AuthProvider";

import MusicPlayer from "./MusicPlayer";
import MobileBottomNav from "./MobileBottomNav";
import MobileDrawer from "./MobileDrawer";
import Navbar from "./Navbar";
import RightPanel from "./RightPanel";
import Sidebar from "./Sidebar";

export type AppView =
  | "home"
  | "library"
  | "ai"
  | "social"
  | "explore"
  | "settings";

const EDGE_SWIPE_ZONE = 24;

export default function AppShell() {
  const { user, profile, signOut } = useAuth();
  const [query, setQuery] = useState("starboy");
  const [searchTerm, setSearchTerm] = useState("starboy");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const [view, setView] =
    useState<AppView>("home");

  const [libraryTab, setLibraryTab] =
    useState<LibraryTab>("liked");

  const [socialTab, setSocialTab] =
    useState<SocialTab>("friends");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const edgeRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const handleEdgeDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (
      info.offset.x > 90 ||
      info.velocity.x > 450
    ) {
      setSidebarOpen(true);
    }
  };

  const openLibrary = (
    tab: LibraryTab = "liked"
  ) => {
    setLibraryTab(tab);
    setView("library");
    setSidebarOpen(false);
    setMobileSearchOpen(false);
  };

  const openSocial = (
    tab: SocialTab = "friends"
  ) => {
    setSocialTab(tab);
    setView("social");
    setSidebarOpen(false);
    setMobileSearchOpen(false);
  };

  const changeView = (
    newView: AppView
  ) => {
    setView(newView);
    setSidebarOpen(false);
    setMobileSearchOpen(false);
  };

  const openSearch = () => {
    setView("home");
    setSidebarOpen(false);
    setMobileSearchOpen(true);
  };

  const isMessagesView = view === "social" && socialTab === "messages";
    return (
    <div className="audiq-shell relative flex h-dvh min-w-0 flex-col overflow-hidden bg-[#050706] text-white">

      {/* Edge Swipe Zone (Mobile Only) */}

      {!sidebarOpen && (
        <motion.div
          ref={edgeRef}
          drag="x"
          dragConstraints={{
            left: 0,
            right: 160,
          }}
          dragElastic={0.08}
          onDragEnd={handleEdgeDragEnd}
          className="
            fixed
            left-0
            top-0
            bottom-0
            z-[60]
            lg:hidden
            touch-pan-y
          "
          style={{
            width: EDGE_SWIPE_ZONE,
          }}
        />
      )}

      {/* Navbar */}

      <Navbar
        term={searchTerm}
        onTermChange={setSearchTerm}
        accountName={profile?.display_name ?? user?.email ?? null}
        profile={profile}
        audiqId={profile?.audiq_id ?? null}
        onOpenAuth={() => setAuthDialogOpen(true)}
        onSignOut={signOut}
        onSearch={setQuery}
        onOpenAi={() => changeView("ai")}
        onOpenSidebar={() => setSidebarOpen(true)}
        mobileSearchOpen={mobileSearchOpen}
        onMobileSearchOpenChange={setMobileSearchOpen}
      />

      {/* Body */}

      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Desktop Sidebar */}

        <aside
          className="
            hidden
            lg:flex
            w-72
            shrink-0
            border-r
            border-white/10
            bg-[#080b09]
          "
        >
          <Sidebar
            activeView={view}
            activeLibraryTab={libraryTab}
            activeSocialTab={socialTab}
            onViewChange={changeView}
            onLibraryTabChange={openLibrary}
            onSocialTabChange={openSocial}
          />
        </aside>

        {/* Mobile Drawer */}

        <MobileDrawer
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        >
          <Sidebar
            activeView={view}
            activeLibraryTab={libraryTab}
            activeSocialTab={socialTab}
            onViewChange={changeView}
            onLibraryTabChange={openLibrary}
            onSocialTabChange={openSocial}
            mobile
          />
        </MobileDrawer>

        {/* Main Content */}

        <motion.main
          animate={{
            scale: sidebarOpen ? 0.985 : 1,
          }}
          transition={{
            duration: 0.25,
          }}
          className={`min-h-0 min-w-0 flex-1 bg-[#050706] ${
            isMessagesView
              ? "overflow-hidden px-2 py-2 pb-1 sm:px-4 sm:py-4 xl:px-8"
              : "overflow-y-auto px-4 py-4 pb-40 md:px-6 md:pb-36 xl:px-8"
          }`}
        >
          {view === "home" && (
            <HomeFeed
              query={query}
              onExplore={() => changeView("explore")}
              onCreateMix={() => changeView("ai")}
            />
          )}

          {view === "library" && (
            <LibraryDashboard
              activeTab={libraryTab}
              onTabChange={setLibraryTab}
            />
          )}

          {view === "social" && (
            <SocialHub
              activeTab={socialTab}
              onTabChange={setSocialTab}
              onOpenAuth={() => setAuthDialogOpen(true)}
            />
          )}

          {view === "explore" && <ExploreDashboard />}

          {view === "settings" && <SettingsDashboard onOpenAuth={() => setAuthDialogOpen(true)} />}

          {view === "ai" && <AiDj />}
        </motion.main>

        {/* Right Panel */}

        <aside
          className="
            hidden
            2xl:flex
            w-96
            shrink-0
            border-l
            border-white/10
            bg-[#080b09]
          "
        >
          <RightPanel />
        </aside>

      </div>

      {/* Player */}

      <MusicPlayer compact={isMessagesView} />

      {!isMessagesView ? <MobileBottomNav
        activeView={view}
        isSearchActive={query.trim().toLowerCase() !== "starboy"}
        isSearchOpen={mobileSearchOpen}
        onHome={() => {
          setQuery("starboy");
          setSearchTerm("starboy");
          changeView("home");
        }}
        onSearch={openSearch}
        onLibrary={() => openLibrary()}
        onFriends={() => openSocial("friends")}
      /> : null}

      <AuthDialog
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
      />

    </div>
  );
}

