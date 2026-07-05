import BaseProvider from "../base/BaseProvider.js";
import { searchJioSaavn } from "./search.js";
import { getJioSaavnStream } from "./stream.js";

export default class JioSaavnProvider extends BaseProvider {
  constructor() {
    super("jiosaavn");
  }

  async search(query) {
    return searchJioSaavn(query);
  }

  async getStream(id) {
    return getJioSaavnStream(id);
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