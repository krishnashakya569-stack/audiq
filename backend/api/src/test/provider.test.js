import dotenv from "dotenv";
dotenv.config();
import providerManager from "../providers/index.js";

console.log("YOUTUBE_API_KEY:", process.env.YOUTUBE_API_KEY);

console.log("Providers:", providerManager.getAll().length);

const songs = await providerManager.search("Starboy");

console.log("Songs length:", songs.length);

console.log(songs);