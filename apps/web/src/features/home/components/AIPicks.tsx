import { ArrowUpRight, BrainCircuit, Music2, Sparkles } from "lucide-react";

const picks = [
  {
    title: "Evening Focus Mix",
    mood: "Calm energy",
    detail: "Soft edges. Clear head.",
    color: "audiq-mood-lime",
    tag: "01 / RESET",
  },
  {
    title: "Social Pulse",
    mood: "Friends are replaying",
    detail: "The group chat gets it.",
    color: "audiq-mood-coral",
    tag: "02 / TOGETHER",
  },
  {
    title: "Late Night Drive",
    mood: "Synth and neon",
    detail: "Windows down. World off.",
    color: "audiq-mood-violet",
    tag: "03 / AFTER HOURS",
  },
];

type AIPicksProps = {
  onOpenAi: () => void;
};

export default function AIPicks({ onOpenAi }: AIPicksProps) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d6ff36] sm:text-[11px]">
            Pick your mood
          </p>
          <h2 className="mt-1.5 text-xl font-black tracking-tight text-white sm:mt-2 sm:text-3xl">
            Set the tone.
          </h2>
        </div>
        <button
          type="button"
          onClick={onOpenAi}
          className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-zinc-200 transition hover:border-[#d6ff36]/50 hover:text-[#d6ff36] md:flex"
        >
          <BrainCircuit className="h-4 w-4 text-[#d6ff36]" aria-hidden="true" />
          Open AI DJ
        </button>
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
        {picks.map((pick) => (
          <article key={pick.title} className={`audiq-mood-card min-h-[190px] min-w-[min(72vw,250px)] snap-start p-4 sm:min-h-[218px] sm:min-w-0 sm:p-5 ${pick.color}`}>
            <div className="relative z-10 flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-current/15 bg-black/10">
                <Music2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="rounded-full border border-current/20 bg-black/10 px-2.5 py-1 text-[9px] font-black tracking-[0.16em]">
                {pick.tag}
              </span>
            </div>

            <div className="relative z-10 mt-8">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] opacity-75">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {pick.mood}
              </div>
              <h3 className="max-w-[16rem] text-xl font-black leading-[0.98] tracking-tight sm:text-[1.75rem]">
                {pick.title}
              </h3>
              <p className="mt-2 text-sm font-semibold opacity-75">{pick.detail}</p>
            </div>

            <button
              type="button"
              onClick={onOpenAi}
              aria-label={`Make a ${pick.title} mix with AI DJ`}
              className="absolute bottom-4 right-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-black/85 text-[#d6ff36] shadow-xl transition hover:scale-110 hover:bg-black"
            >
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
