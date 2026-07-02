import { extractAudio } from "./services/stream/extractor.js";

const data = await extractAudio("dQw4w9WgXcQ");

console.log(data);