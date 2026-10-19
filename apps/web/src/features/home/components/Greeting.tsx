"use client";

import { Radio, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

export default function Greeting() {
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
    <section className="mb-8 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(0,121,107,0.32),rgba(10,10,12,0.94)_46%,rgba(0,121,107,0.12))] p-5 shadow-2xl shadow-black/30 md:p-7">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#4db6ac]/30 bg-[#00594f]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#80cbc4]">
            <Sparkles className="h-3.5 w-3.5" />
            AI powered social listening
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            {greeting}, {displayName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 md:text-base">
            Discover your next obsession, create AI mixes, and keep the conversation moving with friends in real time.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Radio, label: "Live rooms", value: "18" },
            { icon: Users, label: "Friends online", value: "42" },
            { icon: Sparkles, label: "AI picks", value: "96%" },
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-white/10 bg-black/25 p-3">
              <item.icon className="mx-auto h-4 w-4 text-[#4db6ac]" />
              <div className="mt-2 text-xl font-black">{item.value}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
