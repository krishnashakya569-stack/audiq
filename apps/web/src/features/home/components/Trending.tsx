import { Heart, MessageCircle, Play } from "lucide-react";

const trends = [
  { title: "To The Moon", artist: "Jvke", plays: "2.1M", accent: "bg-[#44d7b6]" },
  { title: "Softly", artist: "Karan Aujla", plays: "1.8M", accent: "bg-[#f7b955]" },
  { title: "I Want You", artist: "Arijit Singh", plays: "1.4M", accent: "bg-[#ff5c8a]" },
];

export default function Trending() {
  return (
    <section className="pb-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black">Trending in your circle</h2>
        <button className="text-sm font-semibold text-[#f5c2ce]">See all</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {trends.map((item, index) => (
          <article
            key={item.title}
            className="group flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-[#ff2d67]/40 hover:bg-white/[0.07]"
          >
            <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-md ${item.accent} text-lg font-black text-black`}>
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold">{item.title}</h3>
              <p className="truncate text-sm text-zinc-500">{item.artist}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                <span>{item.plays} plays</span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  248
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  9k
                </span>
              </div>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#800f2f] opacity-100 transition group-hover:scale-105">
              <Play className="h-4 w-4 fill-current" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
