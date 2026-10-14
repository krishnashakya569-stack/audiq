export default class Song {
  constructor({
    id,
    provider,
    title,
    artists = [],
    album = null,
    artwork = {},
    duration = 0,
    playable = false,
    streamUrl = null,
    previewUrl = null,
    isPreview = false,
    explicit = false,
    lyricsAvailable = false,
    language = null,
    sourceRank = null,
  }) {
    this.id = id;
    this.provider = provider;

    this.title = title;

    this.artists = artists;

    this.album = album;

    this.artwork = artwork;

    this.duration = duration;

    this.playable = playable;

    this.streamUrl = streamUrl;

    this.previewUrl = previewUrl;

    this.isPreview = isPreview;

    this.explicit = explicit;

    this.lyricsAvailable = lyricsAvailable;

    this.language = language;

    this.sourceRank = sourceRank;
  }
}
