"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

type GreetingProps = {
  onExplore: () => void;
  onCreateMix: () => void;
};

export default function Greeting({ onExplore, onCreateMix }: GreetingProps) {
  const { user, profile } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName =
    profile?.display_name ||
    (typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null) ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <section className="audiq-hero mb-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="audiq-hero-art" aria-hidden="true">
        <div className="audiq-vinyl">
          <span className="audiq-vinyl-center">AQ</span>
        </div>
        <div className="audiq-sticker">
          <Sparkles />
          <span>NO SKIPS<br />ALL VIBES</span>
        </div>
      </div>

      <div className="audiq-hero-content">
        <div className="audiq-kicker mb-5 max-w-full truncate">
          <span className="audiq-kicker-dot" aria-hidden="true" />
          {greeting}, {displayName}
        </div>

        <h1 className="audiq-display">
          Find your
          <br />
          <span className="audiq-display-accent">next obsession</span>
          <span className="text-[#ff7052]">.</span>
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">
          Your soundtrack, your people, your next big repeat. Find a new sound and make it yours.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={onExplore} className="audiq-cta-main">
            Explore new sounds <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onCreateMix} className="audiq-cta-secondary">
            <Sparkles className="h-4 w-4 text-[#d6ff36]" aria-hidden="true" />
            Make me a mix
          </button>
        </div>
      </div>
    </section>
  );
}
