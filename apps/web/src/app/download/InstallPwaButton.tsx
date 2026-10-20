"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallPwaButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed) {
    return (
      <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#00796b]/40 px-6 py-3 font-bold text-[#80cbc4]">
        <Smartphone size={18} /> Audiq is installed
      </span>
    );
  }

  if (!promptEvent) {
    return (
      <a
        href="/"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 font-bold text-white transition hover:border-[#80cbc4]/60 hover:text-[#80cbc4]"
      >
        <Smartphone size={18} /> Install from browser
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await promptEvent.prompt();
        await promptEvent.userChoice;
        setPromptEvent(null);
      }}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 font-bold text-white transition hover:border-[#80cbc4]/60 hover:text-[#80cbc4]"
    >
      <Download size={18} /> Install Audiq
    </button>
  );
}

