import { streamCache } from "./services/stream/cache.js";

streamCache.set("abc", {
  title: "Song",
});

console.log(streamCache.get("abc"));

console.log(streamCache.getStats());