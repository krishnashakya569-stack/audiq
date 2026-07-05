import BaseProvider from "../base/BaseProvider.js";
import { searchYouTube } from "./search.js";
import { getYouTubeStream } from "./stream.js";

export default class YouTubeProvider extends BaseProvider {
  constructor() {
    super("youtube");
  }

  async search(query) {
    return searchYouTube(query);
  }

  async getStream(id) {
    return getYouTubeStream(id);
  }

  async getSong(id) {
    throw new Error("Not implemented");
  }

  async getAlbum(id) {
    return null;
  }

  async getArtist(id) {
    return null;
  }

  async getPlaylist(id) {
    return null;
  }
}