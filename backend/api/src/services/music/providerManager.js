import { searchSongs } from "../deezer.service.js";

class ProviderManager {

  async search(query) {

    return await searchSongs(query);

  }

}

export const providerManager = new ProviderManager();