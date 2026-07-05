const PRIORITY = [
  "spotify",
  "jiosaavn",
  "youtube",
  "audius",
];

export function sortProviders(providers = []) {
  return [...providers].sort((a, b) => {
    return (
      PRIORITY.indexOf(a.provider) -
      PRIORITY.indexOf(b.provider)
    );
  });
}

export function getBestProvider(song) {
  if (!song.providers?.length) {
    return null;
  }

  return sortProviders(song.providers)[0];
}