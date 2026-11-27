/**
 * Spotify Types & Data Contracts
 * Reconstructed from Spotify Desktop Client (xpui.spa / xpui-routes-search.js & xpui-routes-playlist.js)
 * Adheres to REA Obligation ID: spotify.track.schema-contract
 */

export interface SpotifyImage {
  url: string;
  width?: number;
  height?: number;
}

export interface Artist {
  id: string;
  name: string;
  uri: string;
}

export interface Album {
  id: string;
  name: string;
  uri: string;
  images: SpotifyImage[];
  releaseDate?: string;
}

export interface Track {
  id: string;
  uri: string;
  name: string;
  duration: {
    milliseconds: number;
  };
  artists: Artist[];
  album: Album;
  isPlayable: boolean;
  isExplicit: boolean;
  audioUrl?: string; // Preview or playback URL
  youtubeId?: string; // Full-length audio stream ID
  addedAt?: string;
  bpm?: number;
  genre?: string;
}

export type ChartRegion = 'us' | 'in' | 'gb' | 'jp' | 'br' | 'de' | 'au' | 'kr';

export interface Playlist {
  id: string;
  uri: string;
  name: string;
  description: string;
  owner: {
    id: string;
    displayName: string;
  };
  images: SpotifyImage[];
  tracks: Track[];
}

export type AppView = 'home' | 'search' | 'library' | 'playlist' | 'about' | 'downloader';

export interface AboutFields {
  appName: string;
  version: string;
  description: string;
  developerName: string;
}

export type SearchCategory =
  | 'all'
  | 'artists'
  | 'albums'
  | 'playlists'
  | 'tracks'
  | 'podcasts'
  | 'genres';

export interface SearchCatalogArtist {
  id: string;
  name: string;
  genre: string;
  image: string;
  matchScore: number;
  tracks: Track[];
}

export interface SearchCatalogAlbum {
  id: string;
  name: string;
  artistName: string;
  releaseYear: string;
  trackCount: number;
  genre: string;
  image: string;
}

export interface SearchCatalogPodcast {
  id: string;
  name: string;
  artistName: string;
  trackCount: number;
  genre: string;
  image: string;
}

export interface SearchCatalogResponse {
  query: string;
  region: string;
  tracks: Track[];
  artists: SearchCatalogArtist[];
  albums: SearchCatalogAlbum[];
  podcasts: SearchCatalogPodcast[];
  artistPlaylists: Playlist[];
}

export enum ColumnType {
  INDEX = 'INDEX',
  TITLE_AND_ARTIST = 'TITLE_AND_ARTIST',
  ALBUM = 'ALBUM',
  ADDED_AT = 'ADDED_AT',
  DURATION = 'DURATION',
  BPM = 'BPM'
}

export type AudioQuality = 'low' | 'normal' | 'high' | 'very_high';

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  progressMs: number;
  durationMs: number;
  volume: number; // 0 to 1
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  audioQuality: AudioQuality;
}

export interface PlayContextItemOptions {
  uri: string;
  track?: Track;
  index?: number;
  queue?: Track[];
  featureIdentifier?: string;
  referrerIdentifier?: string;
}

export interface PlayContextItemReturn {
  isActive: boolean;
  isPlaying: boolean;
  isLoading?: boolean;
  triggerPlay: (options?: { loggingParams?: unknown }) => void;
  togglePlay: (options?: { loggingParams?: unknown }) => void;
}
