import { providerManager } from "./providerManager.js";

class MusicEngine {

  async search(query) {

    return await providerManager.search(query);

  }

}

export const musicEngine = new MusicEngine();