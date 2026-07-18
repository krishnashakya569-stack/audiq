const POSITIVE_CHANNELS = [
  "topic",
  "vevo",
  "official",
];

const NEGATIVE_WORDS = [
  "lyrics",
  "lyric",
  "live",
  "cover",
  "karaoke",
  "remix",
  "nightcore",
  "slowed",
  "reverb",
  "8d",
  "bass boosted",
  "fan made",
  "fanmade",
  "fan edit",
  "edit",
  "mashup",
  "tamil",
  "sped up",
  "speed up",
];

const POSITIVE_WORDS = [
  "official",
  "official audio",
  "official video",
  "audio",
  "topic",
  "album",
  "visualizer",
  "explicit",
];

function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTitle(query, song) {
  let score = 0;

  const q = normalize(query);
  const title = normalize(song.title);

  if (title === q) {
    score += 140;
  } else if (title.startsWith(q)) {
    score += 120;
  } else if (title.includes(q)) {
    score += 80;
  }

  return score;
}

function scoreArtist(query, song) {
  let score = 0;

  const artist = normalize(
    song.artists
      ?.map((a) => a.name)
      .join(" ") || ""
  );

  const q = normalize(query);

  if (artist.includes(q))
    score += 80;

  return score;
}

function scoreChannel(song) {
  let score = 0;

  const artist = normalize(
    song.artists
      ?.map((a) => a.name)
      .join(" ") || ""
  );

  for (const word of POSITIVE_CHANNELS) {
    if (artist.includes(word))
      score += 60;
  }

  return score;
}

function scoreMetadata(song) {
  let score = 0;

  const title = normalize(song.title);

  for (const word of POSITIVE_WORDS) {
    if (title.includes(word))
      score += 25;
  }

  return score;
}

function scoreDuration(song) {
  const duration = song.duration || 0;

  if (duration < 60) return -200;

  if (duration > 120 && duration < 420)
    return 25;

  if (duration > 900)
    return -100;

  return 0;
}

function scorePenalty(song) {
  let score = 0;

  const title = normalize(song.title);

  for (const word of NEGATIVE_WORDS) {
    if (title.includes(word))
      score -= 120;
  }

  return score;
}

function scoreProvider(song) {
  switch (song.provider) {
    case "spotify":
      return 40;

    case "jiosaavn":
      return 30;

    case "youtube":
      return 45;

    case "itunes":
      return 35;

    case "audius":
      return 20;

    default:
      return 0;
  }
}

function scoreSourceRank(song) {
  if (typeof song.sourceRank !== "number") {
    return 0;
  }

  return Math.max(0, 260 - song.sourceRank * 18);
}

function calculateScore(query, song) {
  return (
    scoreTitle(query, song) +
    scoreArtist(query, song) +
    scoreChannel(song) +
    scoreMetadata(song) +
    scoreDuration(song) +
    scoreProvider(song) +
    scoreSourceRank(song) +
    scorePenalty(song)
  );
}

export function rankSongs(query, songs) {
  return songs
    .map((song) => ({
      song,
      score: calculateScore(query, song),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ song }) => song);
}
