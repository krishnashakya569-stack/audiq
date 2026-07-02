import { MessageCircle, MoreHorizontal, Phone, Plus, Send, Sparkles } from "lucide-react";
import QueuePanel from "./QueuePanel";
const friends = [
  { name: "Aarav", handle: "After Hours", color: "from-[#b01340] to-[#ff5c8a]" },
  { name: "Ananya", handle: "Lo-fi Beats", color: "from-[#44d7b6] to-[#0f766e]" },
  { name: "Vivek", handle: "Indie Vibes", color: "from-[#f7b955] to-[#b45309]" },
];

const messages = [
  { mine: false, text: "This synth drop is unreal.", time: "10:32" },
  { mine: true, text: "Added it to our night drive playlist.", time: "10:34" },
  { mine: false, text: "Send the queue. I am in.", time: "10:35" },
];

export default function RightPanel() {
  return (
    <div className="queue-scroll flex h-full flex-col gap-5 overflow-y-auto p-5">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Friends Listening</h2>
          <button className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-zinc-300">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {friends.map((friend) => (
            <div
              key={friend.name}
              className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.045] p-3"
            >
              <div className={`h-11 w-11 rounded-md bg-gradient-to-br ${friend.color}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{friend.name}</div>
                <div className="truncate text-xs text-zinc-500">Listening to {friend.handle}</div>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-[#44d7b6]" />
            </div>
          ))}
        </div>
      </section>
    <QueuePanel />
      <section className="audiq-panel flex flex-col rounded-lg">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b01340] font-bold">
              A
            </div>
            <div>
              <h3 className="text-sm font-bold">Aarav</h3>
              <p className="text-xs text-[#44d7b6]">Online</p>
            </div>
          </div>
          <div className="flex gap-2 text-zinc-400">
            <Phone className="h-4 w-4" />
            <MessageCircle className="h-4 w-4" />
            <MoreHorizontal className="h-4 w-4" />
          </div>
        </div>

        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          <div className="rounded-md border border-[#b01340]/35 bg-[#b01340]/15 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#f5c2ce]">
              <Sparkles className="h-3.5 w-3.5" />
              Shared track
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-md bg-gradient-to-br from-[#b01340] to-black" />
              <div>
                <div className="text-sm font-bold">After Hours</div>
                <div className="text-xs text-zinc-400">The Weeknd</div>
              </div>
            </div>
          </div>

          {messages.map((message) => (
            <div
              key={message.text}
              className={`max-w-[86%] rounded-md p-3 text-sm ${
                message.mine
                  ? "ml-auto bg-[#b01340] text-white"
                  : "bg-white/[0.07] text-zinc-100"
              }`}
            >
              <p>{message.text}</p>
              <p className="mt-1 text-[10px] text-white/55">{message.time}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 p-3">
          <input
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-[#ff2d67]/60"
            placeholder="Type a message..."
          />
          <button className="grid h-10 w-10 place-items-center rounded-md bg-[#b01340]">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
