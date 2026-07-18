const PRIORITY = [
  "youtube",
  "jiosaavn",
  "itunes",
  "audius",
  "spotify",
];

function priorityOf(provider) {
  const index = PRIORITY.indexOf(provider);
  return index === -1 ? PRIORITY.length : index;
}

export function sortProviders(providers = []) {
  return [...providers].sort((a, b) => {
    return priorityOf(a.provider) - priorityOf(b.provider);
  });
}

export function getBestProvider(song) {
  if (!song.providers?.length) {
    return null;
  }

  return sortProviders(song.providers)[0];
}
