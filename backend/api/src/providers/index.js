import providerManager from "./providerManager.js";

import YouTubeProvider from "./youtube/YouTubeProvider.js";
import JioSaavnProvider from "./jiosaavn/JioSaavnProvider.js";
import ItunesProvider from "./itunes/ItunesProvider.js";

providerManager.register(new YouTubeProvider());
providerManager.register(new JioSaavnProvider());
providerManager.register(new ItunesProvider());

export default providerManager;
