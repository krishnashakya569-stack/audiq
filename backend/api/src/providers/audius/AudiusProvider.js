import BaseProvider from "../base/BaseProvider.js";
import Song from "../../models/Song.js";
import {
  audiusStreamUrl,
  searchAudiusTracks,
} from "../../services/audius.service.js";

export default class AudiusProvider extends BaseProvider {
  constructor() {
    super("audius");
  }

  async search(query) {
    const tracks = await searchAudiusTracks(query);

    return tracks
      .map((track, index) => {
        const id = String(track.id).replace(/^audius:/, "");
        const artwork = track.album?.cover_medium || null;

        return new Song({
          id: `audius:${id}`,
          provider: "audius",
          title: track.title,
          artists: [
            { id: "audius", name: track.artist?.name || "Audius Artist" },
          ],
          album: { id: "audius", title: track.album?.title || "Audius" },
          artwork: { small: artwork, medium: artwork, large: artwork },
          duration: Number(track.duration) || 0,
          playable: Boolean(track.preview),
          streamUrl: track.preview || null,
          isPreview: false,
          sourceRank: index,
        });
      })
      .filter((track) => track.playable);
  }

  async getStream(id) {
    return { streamUrl: audiusStreamUrl(id) };
  }
}
