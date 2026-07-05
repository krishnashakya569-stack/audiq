import Song from "../../models/Song.js";
import { publicUrl } from "../../utils/publicUrl.js";
import JioSaavnAdapter from "./adapter.js";

const adapter = new JioSaavnAdapter();

function pickAudioUrl(song) {
  return song.audioUrl || song.mediaUrl || song.streamUrl || "";
}

function pickCover(song) {
  if (Array.isArray(song.image)) {
    return (
      song.image.at(-1)?.url ??
      publicUrl("/media/audiq-logo.png")
    );
  }

  return (
    song.image ||
    song.cover ||
    song.artwork ||
    song.albumArt ||
    publicUrl("/media/audiq-logo.png")
  );
}

function pickArtist(song) {
  if (song.artist || song.primaryArtists || song.singers) {
    return (
      song.artist ||
      song.primaryArtists ||
      song.singers
    );
  }

  if (Array.isArray(song.artists?.primary)) {
    return song.artists.primary
      .map((artist) => artist.name)
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(song.artists?.all)) {
    return song.artists.all
      .filter((artist) =>
        ["primary_artists", "singer"].includes(artist.role)
      )
      .map((artist) => artist.name)
      .filter(Boolean)
      .join(", ");
  }

  return "JioSaavn Artist";
}

function pickAlbum(song) {
  if (typeof song.album === "string") {
    return song.album;
  }

  return (
    song.album?.name ||
    song.albumName ||
    "JioSaavn"
  );
}

function getSongs(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.songs)) {
    return payload.songs;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.data?.results)) {
    return payload.data.results;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

export async function searchJioSaavn(query) {
  const payload = await adapter.search(query);

  const songs = getSongs(payload);

  return songs
    .map((song, index) => {
      const audio = pickAudioUrl(song);

      return new Song({
        id: `jiosaavn:${song.id || song.songId || index}`,

        provider: "jiosaavn",

        title:
          song.title ||
          song.name ||
          "Unknown Title",

        artists: [
          {
            id: song.primaryArtistId || "unknown",
            name: pickArtist(song),
          },
        ],

        album: {
          id: song.albumId || "jiosaavn",
          title: pickAlbum(song),
        },

        artwork: {
          small: pickCover(song),
          medium: pickCover(song),
          large: pickCover(song),
        },

        duration: Number(song.duration) || 0,

        playable: Boolean(audio),

        previewUrl: audio,

        streamUrl: audio,

        explicit: false,

        lyricsAvailable: false,

        language: song.language || null,
      });
    })
    .filter((song) => song.playable);
}