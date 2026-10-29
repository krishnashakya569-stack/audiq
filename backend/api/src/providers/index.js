import providerManager from "./providerManager.js";

import YouTubeProvider from "./youtube/YouTubeProvider.js";
import JioSaavnProvider from "./jiosaavn/JioSaavnProvider.js";
import AudiusProvider from "./audius/AudiusProvider.js";

providerManager.register(new AudiusProvider());
providerManager.register(new YouTubeProvider());
providerManager.register(new JioSaavnProvider());

export default providerManager;
