import providerManager from "./providerManager.js";

import YouTubeProvider from "./youtube/YouTubeProvider.js";

providerManager.register(new YouTubeProvider());

export default providerManager;