import type { Song } from "./types";

export const mockSongs: Song[] = [
  {
    id: "mock:1",

    provider: "local",

    title: "Starboy",

    artists: [
      {
        id: "artist:1",
        name: "The Weeknd",
      },
    ],

    album: {
      id: "album:1",
      title: "Starboy",
    },

    artwork: {
      small: "/covers/after-hours.svg",
      medium: "/covers/after-hours.svg",
      large: "/covers/after-hours.svg",
    },

    duration: 230,

    playable: false,

    streamUrl: null,

    previewUrl: null,

    explicit: false,

    lyricsAvailable: false,

    language: "en",
  },

  {
    id: "mock:2",

    provider: "local",

    title: "Husn",

    artists: [
      {
        id: "artist:2",
        name: "Anuv Jain",
      },
    ],

    album: {
      id: "album:2",
      title: "Husn",
    },

    artwork: {
      small: "/covers/lofi-beats.svg",
      medium: "/covers/lofi-beats.svg",
      large: "/covers/lofi-beats.svg",
    },

    duration: 205,

    playable: false,

    streamUrl: null,

    previewUrl: null,

    explicit: false,

    lyricsAvailable: false,

    language: "hi",
  },

  {
    id: "mock:3",

    provider: "local",

    title: "Blinding Lights",

    artists: [
      {
        id: "artist:3",
        name: "The Weeknd",
      },
    ],

    album: {
      id: "album:3",
      title: "After Hours",
    },

    artwork: {
      small: "/covers/night-drive.svg",
      medium: "/covers/night-drive.svg",
      large: "/covers/night-drive.svg",
    },

    duration: 201,

    playable: false,

    streamUrl: null,

    previewUrl: null,

    explicit: false,

    lyricsAvailable: false,

    language: "en",
  },

  {
    id: "mock:4",

    provider: "local",

    title: "Kesariya",

    artists: [
      {
        id: "artist:4",
        name: "Arijit Singh",
      },
    ],

    album: {
      id: "album:4",
      title: "Brahmastra",
    },

    artwork: {
      small: "/covers/indie-vibes.svg",
      medium: "/covers/indie-vibes.svg",
      large: "/covers/indie-vibes.svg",
    },

    duration: 244,

    playable: false,

    streamUrl: null,

    previewUrl: null,

    explicit: false,

    lyricsAvailable: false,

    language: "hi",
  },
];