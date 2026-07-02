"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AudiqUser = {
  id: string;
  name: string;
  handle: string;
  avatarColor: string;
  status: "online" | "listening" | "offline";
  listeningTo?: string;
};

export type ChatMessage = {
  id: string;
  friendId: string;
  text: string;
  mine: boolean;
  createdAt: number;
};

export const discoverableUsers: AudiqUser[] = [
  {
    id: "AQ-AARAV",
    name: "Aarav",
    handle: "@aarav",
    avatarColor: "#ff5c8a",
    status: "listening",
    listeningTo: "After Hours",
  },
  {
    id: "AQ-ANANYA",
    name: "Ananya",
    handle: "@ananya",
    avatarColor: "#44d7b6",
    status: "online",
    listeningTo: "Lo-fi Beats",
  },
  {
    id: "AQ-VIVEK",
    name: "Vivek",
    handle: "@vivek",
    avatarColor: "#f7b955",
    status: "listening",
    listeningTo: "Indie Vibes",
  },
  {
    id: "AQ-KINGFAN",
    name: "King Fan",
    handle: "@kingfan",
    avatarColor: "#a78bfa",
    status: "offline",
  },
];

type SocialState = {
  me: AudiqUser;
  friends: AudiqUser[];
  messages: ChatMessage[];
  activeFriendId: string | null;
  setMyProfile: (name: string, id: string) => void;
  searchUser: (id: string) => AudiqUser | undefined;
  addFriend: (user: AudiqUser) => void;
  removeFriend: (id: string) => void;
  setActiveFriend: (id: string | null) => void;
  sendMessage: (friendId: string, text: string) => void;
};

function normalizeId(id: string) {
  return id.trim().toUpperCase().replace(/\s+/g, "-");
}

function createReply(friendId: string, text: string): ChatMessage {
  const replies = [
    "Added it to my queue.",
    "Send me that playlist next.",
    "This fits the vibe perfectly.",
    "I am listening now.",
  ];

  return {
    id: crypto.randomUUID(),
    friendId,
    text: text.includes("?") ? "Yes, I am in." : replies[Math.floor(Math.random() * replies.length)],
    mine: false,
    createdAt: Date.now() + 1,
  };
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      me: {
        id: "AQ-KRISHNA",
        name: "Krishna",
        handle: "@krishna",
        avatarColor: "#b01340",
        status: "online",
      },
      friends: [],
      messages: [],
      activeFriendId: null,

      setMyProfile(name, id) {
        const safeName = name.trim() || "AudiQ User";
        const safeId = normalizeId(id || safeName);

        set((state) => ({
          me: {
            ...state.me,
            name: safeName,
            id: safeId.startsWith("AQ-") ? safeId : `AQ-${safeId}`,
            handle: `@${safeName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "audiq"}`,
          },
        }));
      },

      searchUser(id) {
        const query = normalizeId(id);

        return discoverableUsers.find((user) => user.id === query || user.handle.toUpperCase() === query);
      },

      addFriend(user) {
        set((state) => {
          const exists = state.friends.some((friend) => friend.id === user.id);

          if (exists || user.id === state.me.id) {
            return {};
          }

          return {
            friends: [...state.friends, user],
            activeFriendId: user.id,
          };
        });
      },

      removeFriend(id) {
        set((state) => ({
          friends: state.friends.filter((friend) => friend.id !== id),
          messages: state.messages.filter((message) => message.friendId !== id),
          activeFriendId: state.activeFriendId === id ? null : state.activeFriendId,
        }));
      },

      setActiveFriend(id) {
        set({ activeFriendId: id });
      },

      sendMessage(friendId, text) {
        const value = text.trim();

        if (!value) return;

        const message: ChatMessage = {
          id: crypto.randomUUID(),
          friendId,
          text: value,
          mine: true,
          createdAt: Date.now(),
        };

        const friend = get().friends.find((item) => item.id === friendId);
        const reply = friend ? createReply(friend.id, value) : null;

        set((state) => ({
          messages: reply ? [...state.messages, message, reply] : [...state.messages, message],
        }));
      },
    }),
    {
      name: "audiq-social",
    }
  )
);
