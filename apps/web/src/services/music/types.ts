export interface SongArtist {
  id: string;
  name: string;
}

export interface SongAlbum {
  id: string;
  title: string;
}

export interface SongArtwork {
  small: string | null;
  medium: string | null;
  large: string | null;
}

export interface SongProvider {
  provider: string;
  id: string;
  playable: boolean;
}

export interface Song {
  id: string;

  provider: string;

  title: string;

  artists: SongArtist[];

  album: SongAlbum;

  artwork: SongArtwork;

  duration: number;

  playable: boolean;

  streamUrl: string | null;

  previewUrl: string | null;

  explicit: boolean;

  lyricsAvailable: boolean;

  language: string | null;

  providers?: SongProvider[];
}