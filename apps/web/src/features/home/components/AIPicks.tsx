import { BrainCircuit, Music, Play, Sparkles } from "lucide-react";

const picks = [
  { title: "Evening Focus Mix", mood: "Calm energy", color: "from-[#b01340] to-[#5c0921]" },
  { title: "Social Pulse", mood: "Friends are replaying", color: "from-[#44d7b6] to-[#0f766e]" },
  { title: "Late Night Drive", mood: "Synth and neon", color: "from-[#f7b955] to-[#7c2d12]" },
];

export default function AIPicks() {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f5c2ce]">Audiq Intelligence</p>
          <h2 className="mt-1 text-2xl font-black">Made for your mood</h2>
        </div>
        <button className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-zinc-300 md:flex">
          <BrainCircuit className="h-4 w-4 text-[#ff5c8a]" />
          Tune AI
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {picks.map((pick) => (
          <article
            key={pick.title}
            className={`group min-h-44 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br ${pick.color} p-5 shadow-xl shadow-black/25`}
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-white/15">
                <Sparkles className="h-5 w-5" />
              </span>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#800f2f] transition group-hover:scale-105">
                <Play className="h-4 w-4 fill-current" />
              </button>
            </div>
            <div className="mt-10">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
                <Music className="h-3.5 w-3.5" />
                {pick.mood}
              </div>
              <h3 className="text-xl font-black">{pick.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
