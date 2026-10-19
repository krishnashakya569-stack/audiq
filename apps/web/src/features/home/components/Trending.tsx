import { ArrowUpRight, Headphones, MoonStar, Sparkles } from "lucide-react";

const trends = [
  {
    title: "To The Moon",
    artist: "Jvke",
    note: "On repeat in your circle",
    icon: MoonStar,
    color: "text-[#d6ff36]",
    artwork: "from-[#153c43] via-[#1d6970] to-[#091411]",
  },
  {
    title: "Softly",
    artist: "Karan Aujla",
    note: "Friends are playing this",
    icon: Headphones,
    color: "text-[#ff8062]",
    artwork: "from-[#752d35] via-[#e3654d] to-[#171014]",
  },
  {
    title: "I Want You",
    artist: "Arijit Singh",
    note: "A late-night favorite",
    icon: Sparkles,
    color: "text-[#b39aff]",
    artwork: "from-[#33245f] via-[#6954bd] to-[#10121c]",
  },
];

type TrendingProps = {
  onExplore: () => void;
};

export default function Trending({ onExplore }: TrendingProps) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#80cbc4] sm:text-[11px]">
            Community charts
          </p>
          <h2 className="mt-1.5 text-xl font-black tracking-tight text-white sm:mt-2 sm:text-3xl">
            Trending in your circle
          </h2>
        </div>
        <button
          type="button"
          onClick={onExplore}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#d6ff36] transition hover:text-white sm:gap-1.5 sm:text-xs"
        >
          Explore <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/20 sm:rounded-[26px]">
        {trends.map((item, index) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="group grid grid-cols-[20px_48px_minmax(0,1fr)_34px] items-center gap-2 border-b border-white/[0.07] px-2.5 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.055] sm:grid-cols-[32px_60px_minmax(0,1fr)_42px] sm:gap-3 sm:px-4 sm:py-3"
            >
              <span className={`text-center font-mono text-sm font-bold tabular-nums sm:text-base ${item.color}`}>
                {index + 1}
              </span>

              <span className={`relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-gradient-to-br sm:h-[60px] sm:w-[60px] ${item.artwork}`}>
                <span className="absolute -right-3 -top-3 h-10 w-10 rounded-full border border-white/20" />
                <span className="absolute -bottom-5 -left-3 h-12 w-12 rounded-full border border-white/15" />
                <Icon aria-hidden="true" className={`relative h-5 w-5 drop-shadow sm:h-6 sm:w-6 ${item.color}`} />
              </span>

              <span className="min-w-0 py-0.5">
                <span className={`mb-0.5 block truncate text-[9px] font-black uppercase tracking-[0.14em] sm:text-[10px] ${item.color}`}>
                  {item.note}
                </span>
                <span className="block truncate text-sm font-bold text-white sm:text-base">
                  {item.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-zinc-400 sm:text-sm">
                  {item.artist}
                </span>
              </span>

              <button
                type="button"
                onClick={onExplore}
                aria-label={`Explore more music like ${item.title} by ${item.artist}`}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 text-zinc-300 transition hover:border-[#d6ff36]/50 hover:text-[#d6ff36] sm:h-9 sm:w-9"
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
