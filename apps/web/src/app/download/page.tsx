import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, Check, Globe2, Smartphone } from "lucide-react";

import InstallPwaButton from "./InstallPwaButton";

export const metadata: Metadata = {
  title: "Get Audiq",
  description: "Use Audiq on the web or install the Android app.",
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#050706] px-4 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-[#00796b]/50 hover:text-white"
        >
          <ArrowLeft size={16} /> Back to Audiq
        </Link>

        <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_85%_15%,rgba(0,121,107,0.32),transparent_35%),linear-gradient(145deg,#101412,#070908_72%)] px-6 py-10 sm:px-12 sm:py-14">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-8 flex items-center gap-4">
              <Image
                src="/brand/audiq-vinyl.svg"
                alt="Audiq"
                width={64}
                height={64}
                priority
                className="rounded-2xl border border-[#00796b]/40 bg-[#050706]"
              />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#80cbc4]">Audiq</p>
                <p className="mt-1 text-sm text-zinc-400">Your music, your people.</p>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#80cbc4]">Web portal · Android</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Take your music space with you.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              Use the web portal, install Audiq from your browser, or download the Android app.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/downloads/audiq.apk"
                download="Audiq.apk"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#00796b] px-6 py-3 font-bold text-white shadow-lg shadow-[#00796b]/20 transition hover:-translate-y-0.5 hover:bg-[#008f80]"
              >
                <ArrowDownToLine size={19} /> Download Android APK
              </a>
              <InstallPwaButton />
            </div>
            <p className="mt-3 text-xs text-zinc-500">Android may ask you to allow installs from your browser after you download the APK.</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-[#0d100f] p-6 sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#00796b]/20 text-[#80cbc4]"><Smartphone size={22} /></span>
            <h2 className="mt-5 text-xl font-extrabold">Install on Android</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
              <li className="flex gap-3"><span className="text-[#80cbc4]">01</span> Download the Audiq APK to your phone.</li>
              <li className="flex gap-3"><span className="text-[#80cbc4]">02</span> Open the downloaded file and allow your browser to install apps if Android asks.</li>
              <li className="flex gap-3"><span className="text-[#80cbc4]">03</span> Finish installation, then open Audiq from your home screen.</li>
            </ol>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#0d100f] p-6 sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#00796b]/20 text-[#80cbc4]"><Globe2 size={22} /></span>
            <h2 className="mt-5 text-xl font-extrabold">Use Audiq on the web</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">The web portal works on phones, tablets, and computers. You can also add it to your home screen from your browser without downloading an APK.</p>
            <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#80cbc4] hover:text-white">
              <Check size={16} /> Open the Audiq portal
            </Link>
          </article>
        </section>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-zinc-500">The Android app opens the Audiq web portal. App updates to music, friends, and chat arrive through the website; download a new APK only when an app-shell update is released.</p>
      </div>
    </main>
  );
}

