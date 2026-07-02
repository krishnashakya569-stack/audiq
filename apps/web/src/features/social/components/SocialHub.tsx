"use client";

import {
  Copy,
  MessageCircle,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { type AudiqUser, useSocialStore } from "@/store/social";

export type SocialTab = "friends" | "messages";

function timeLabel(value: number) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function AvatarBlock({ user }: { user: AudiqUser }) {
  return (
    <div
      className="grid h-12 w-12 shrink-0 place-items-center rounded-md font-black text-white"
      style={{ backgroundColor: user.avatarColor }}
    >
      {user.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

type SocialHubProps = {
  activeTab: SocialTab;
  onTabChange: (tab: SocialTab) => void;
};

export default function SocialHub({ activeTab, onTabChange }: SocialHubProps) {
  const [profileName, setProfileName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [searchId, setSearchId] = useState("");
  const [foundUser, setFoundUser] = useState<AudiqUser | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Search an AudiQ ID to add a friend.");
  const {
    activeFriendId,
    addFriend,
    friends,
    me,
    messages,
    removeFriend,
    searchUser,
    sendMessage,
    setActiveFriend,
    setMyProfile,
  } = useSocialStore();

  const activeFriend = friends.find((friend) => friend.id === activeFriendId) ?? friends[0] ?? null;
  const thread = useMemo(
    () => messages.filter((item) => item.friendId === activeFriend?.id),
    [activeFriend?.id, messages]
  );

  const handleSearch = () => {
    const user = searchUser(searchId);

    if (!user) {
      setFoundUser(null);
      setStatus("No user found. Try AQ-AARAV, AQ-ANANYA, AQ-VIVEK, or AQ-KINGFAN.");
      return;
    }

    setFoundUser(user);
    setStatus(`${user.name} found. Add them to start chatting.`);
  };

  const handleAddFriend = () => {
    if (!foundUser) return;

    addFriend(foundUser);
    setActiveFriend(foundUser.id);
    onTabChange("messages");
    setStatus(`${foundUser.name} is now your friend.`);
  };

  const handleSend = () => {
    if (!activeFriend) return;

    sendMessage(activeFriend.id, message);
    setMessage("");
  };

  return (
    <section className="space-y-6 pb-6">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(176,19,64,.3),rgba(68,215,182,.08),rgba(255,255,255,.04))] p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#f5c2ce]">
              <Users className="h-4 w-4" />
              AudiQ Social
            </p>
            <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">Friends & Chat</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Create your AudiQ ID, search another user by ID, add them as a friend, and start a chat.
            </p>
          </div>

          <div className="rounded-md border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Your ID</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-black text-white">{me.id}</span>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(me.id)}
                className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-zinc-400 hover:text-white"
                title="Copy ID"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { id: "friends" as const, label: "Find Friends", icon: UserPlus },
          { id: "messages" as const, label: "Messages", icon: MessageCircle },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.id
                ? "border-[#ff2d67]/50 bg-[#b01340]/35 text-white"
                : "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "friends" ? (
        <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <h2 className="font-bold">Create your ID</h2>
            <p className="mt-1 text-sm text-zinc-500">Pick a name and an AudiQ ID other users can search.</p>

            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder={me.name}
              className="mt-4 w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#ff2d67]/50"
            />
            <input
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              placeholder={me.id}
              className="mt-3 w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#ff2d67]/50"
            />
            <button
              type="button"
              onClick={() => {
                setMyProfile(profileName || me.name, profileId || me.id);
                setProfileName("");
                setProfileId("");
              }}
              className="mt-4 w-full rounded-md bg-[#ff2d67] px-4 py-2.5 text-sm font-black text-white"
            >
              Save ID
            </button>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-black/25 px-3 py-2">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  value={searchId}
                  onChange={(event) => setSearchId(event.target.value)}
                  placeholder="Search ID, e.g. AQ-AARAV"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                />
              </label>
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-md border border-[#ff2d67]/40 bg-[#b01340]/20 px-4 py-2 text-sm font-bold text-[#f5c2ce]"
              >
                Search
              </button>
            </div>
            <p className="mt-3 text-sm text-zinc-500">{status}</p>

            {foundUser ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <AvatarBlock user={foundUser} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{foundUser.name}</p>
                  <p className="text-sm text-zinc-500">{foundUser.id}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFriend}
                  className="grid h-10 w-10 place-items-center rounded-md bg-[#ff2d67] text-white"
                  title="Add friend"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <div className="mt-6">
              <h3 className="mb-3 font-bold">Your Friends</h3>
              <div className="space-y-2">
                {friends.length === 0 ? (
                  <div className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                    No friends yet.
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div key={friend.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                      <AvatarBlock user={friend} />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFriend(friend.id);
                          onTabChange("messages");
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate font-bold text-white">{friend.name}</p>
                        <p className="truncate text-sm text-zinc-500">{friend.listeningTo ? `Listening to ${friend.listeningTo}` : friend.id}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFriend(friend.id)}
                        className="grid h-9 w-9 place-items-center rounded-md text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                        title="Remove friend"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "messages" ? (
        <div className="grid min-h-[560px] gap-5 xl:grid-cols-[20rem_1fr]">
          <aside className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <h2 className="mb-3 px-2 font-bold">Chats</h2>
            <div className="space-y-2">
              {friends.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onTabChange("friends")}
                  className="w-full rounded-md border border-dashed border-white/10 p-5 text-sm text-zinc-500"
                >
                  Add a friend to start chatting.
                </button>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => setActiveFriend(friend.id)}
                    className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition ${
                      activeFriend?.id === friend.id
                        ? "border-[#ff2d67]/45 bg-[#b01340]/20"
                        : "border-white/5 bg-black/15 hover:bg-white/[0.06]"
                    }`}
                  >
                    <AvatarBlock user={friend} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-white">{friend.name}</span>
                      <span className="block truncate text-xs text-zinc-500">{friend.status}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-lg border border-white/10 bg-white/[0.045]">
            {activeFriend ? (
              <>
                <div className="flex items-center gap-3 border-b border-white/10 p-4">
                  <AvatarBlock user={activeFriend} />
                  <div>
                    <h2 className="font-black text-white">{activeFriend.name}</h2>
                    <p className="text-sm text-[#44d7b6]">{activeFriend.status}</p>
                  </div>
                </div>

                <div className="queue-scroll flex-1 space-y-3 overflow-y-auto p-4">
                  {thread.length === 0 ? (
                    <div className="grid h-full place-items-center text-center text-sm text-zinc-500">
                      Say hello to {activeFriend.name}.
                    </div>
                  ) : (
                    thread.map((item) => (
                      <div
                        key={item.id}
                        className={`max-w-[78%] rounded-md p-3 text-sm ${
                          item.mine ? "ml-auto bg-[#b01340] text-white" : "bg-white/[0.08] text-zinc-100"
                        }`}
                      >
                        <p>{item.text}</p>
                        <p className="mt-1 text-[10px] text-white/55">{timeLabel(item.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>

                <form
                  className="flex items-center gap-2 border-t border-white/10 p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSend();
                  }}
                >
                  <input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={`Message ${activeFriend.name}`}
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff2d67]/50"
                  />
                  <button type="submit" className="grid h-11 w-11 place-items-center rounded-md bg-[#ff2d67] text-white">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center text-zinc-500">
                Add a friend, then open a chat.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
