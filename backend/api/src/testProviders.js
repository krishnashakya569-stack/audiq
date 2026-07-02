import { providerManager } from "./services/music/providerManager.js";

const songs = await providerManager.search("tum se");

console.log("Songs:", songs.length);

console.log(songs.slice(0, 5));