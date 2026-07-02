import axios from "axios";
import { getAudioStream } from "../services/stream.service.js";

export async function info(req, res) {
  try {
    const data = await getAudioStream(req.params.videoId);

    res.json({
      title: data.title,
      artist: data.artist,
      duration: data.duration,
      thumbnail: data.thumbnail,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
}

export async function play(req, res) {
  try {
    const data = await getAudioStream(req.params.videoId);

    console.log("Streaming:", data.streamUrl);

    const response = await axios({
      method: "GET",
      url: data.streamUrl,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
      },
      validateStatus: () => true,
    });

    console.log("STATUS:", response.status);
    console.log("TYPE:", response.headers["content-type"]);

    if (response.status !== 200 && response.status !== 206) {
      console.log(response.headers);
      return res.status(response.status).send("YouTube rejected stream");
    }

    res.status(response.status);

    Object.entries(response.headers).forEach(([key, value]) => {
      if (value) {
        res.setHeader(key, value);
      }
    });

    response.data.pipe(res);
  } catch (err) {
    console.error("STREAM ERROR");
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}