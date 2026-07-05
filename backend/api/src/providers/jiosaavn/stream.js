export async function getJioSaavnStream(song) {
  if (!song?.previewUrl) {
    throw new Error("No JioSaavn stream available.");
  }

  return {
    streamUrl: song.previewUrl,
  };
}