function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[()[\]{}]/g, "")
    .replace(/feat\..*/gi, "")
    .replace(/ft\..*/gi, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(query, title) {
  const q = normalize(query);
  const t = normalize(title);

  if (q === t) return 100;

  if (t.startsWith(q)) return 90;

  if (t.includes(q)) return 80;

  const qWords = q.split(" ");
  const tWords = t.split(" ");

  let matched = 0;

  for (const word of qWords) {
    if (tWords.includes(word)) {
      matched++;
    }
  }

  return Math.round(
    (matched / qWords.length) * 70
  );
}

export function filterSearch(query, songs) {
  return songs.filter((song) => {
    const title = similarity(query, song.title);

    const artist = similarity(
      query,
      song.artists
        ?.map((a) => a.name)
        .join(" ") || ""
    );

    return Math.max(title, artist) >= 35;
  });
}