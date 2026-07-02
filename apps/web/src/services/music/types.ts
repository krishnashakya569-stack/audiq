export interface MusicArtist {
  name: string;
}

export interface MusicAlbum {
  title?: string;
  cover_medium: string;
}

export interface Song {
  id: number | string;
  title: string;
  artist: MusicArtist;
  album: MusicAlbum;
  duration: number;
  preview: string;
  isPreview?: boolean;
  rank?: number;
  source?: "audius" | "itunes" | "jiosaavn" | "local" | "youtube";
  videoId?: string;
  externalUrl?: string;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  cover: string;
}
