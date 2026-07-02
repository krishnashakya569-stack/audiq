import { streamEngine } from "./services/stream/streamEngine.js";

console.log("FIRST REQUEST");

await streamEngine.get("dQw4w9WgXcQ");

console.log(streamEngine.stats());

console.log("----------------");

console.log("SECOND REQUEST");

await streamEngine.get("dQw4w9WgXcQ");

console.log(streamEngine.stats());