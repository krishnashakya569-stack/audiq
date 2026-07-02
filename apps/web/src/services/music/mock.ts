import { Song } from "./types";

export const mockSongs: Song[] = [
  {
    id: 1,
    title: "Starboy",
    artist: { name: "The Weeknd" },
    album: {
      title: "Starboy",
      cover_medium: "/covers/after-hours.svg",
    },
    duration: 230,
    preview: "",
    isPreview: true,
  },
  {
    id: 2,
    title: "Husn",
    artist: { name: "Anuv Jain" },
    album: {
      title: "Husn",
      cover_medium: "/covers/lofi-beats.svg",
    },
    duration: 205,
    preview: "",
    isPreview: true,
  },
  {
    id: 3,
    title: "Blinding Lights",
    artist: { name: "The Weeknd" },
    album: {
      title: "After Hours",
      cover_medium: "/covers/night-drive.svg",
    },
    duration: 201,
    preview: "",
    isPreview: true,
  },
  {
    id: 4,
    title: "Kesariya",
    artist: { name: "Arijit Singh" },
    album: {
      title: "Brahmastra",
      cover_medium: "/covers/indie-vibes.svg",
    },
    duration: 244,
    preview: "",
    isPreview: true,
  },
];
