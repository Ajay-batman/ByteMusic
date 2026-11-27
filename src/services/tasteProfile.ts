import { ChartRegion, Playlist, Track } from '../types/spotify';

export interface ChartRegionOption {
  id: ChartRegion;
  label: string;
  shortLabel: string;
}

export const CHART_REGIONS: ChartRegionOption[] = [
  { id: 'us', label: 'Global / US', shortLabel: 'Global' },
  { id: 'in', label: 'India', shortLabel: 'India' },
  { id: 'gb', label: 'United Kingdom', shortLabel: 'UK' },
  { id: 'jp', label: 'Japan', shortLabel: 'Japan' },
  { id: 'kr', label: 'South Korea', shortLabel: 'Korea' },
  { id: 'br', label: 'Brazil', shortLabel: 'Brazil' },
  { id: 'de', label: 'Germany', shortLabel: 'Germany' },
  { id: 'au', label: 'Australia', shortLabel: 'Australia' },
];

export interface TasteProfile {
  topArtists: string[];
  topGenres: string[];
  preferredBpmAvg: number;
  summaryText: string;
  signatureKey: string;
}

/**
 * Returns canonical ISO week identifier (e.g. "2026-W48") for whole-week Discover Weekly locking.
 */
export function getCurrentIsoWeekKey(date: Date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function trackDedupKey(track: Track): string {
  const title = (track.name || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
  const artist = (track.artists?.[0]?.name || '').toLowerCase().trim();
  return `${title}::${artist}`;
}

/**
 * Computes the user's musical Taste Profile from Liked Songs (+3), Custom Playlists (+2),
 * Recently Played (+1.5 decaying), and Skip penalties (-1.5).
 */
export function computeTasteProfile(
  likedTracks: Track[],
  recentlyPlayed: Track[],
  customPlaylists: Playlist[],
  skippedKeys: Record<string, number> = {}
): TasteProfile {
  const artistScores = new Map<string, number>();
  const genreScores = new Map<string, number>();
  let bpmSum = 0;
  let bpmCount = 0;

  const addSignal = (track: Track, weight: number) => {
    const key = trackDedupKey(track);
    const skipPenalty = (skippedKeys[key] || 0) * 1.5;
    const effective = Math.max(0.1, weight - skipPenalty);

    for (const artist of track.artists || []) {
      if (!artist?.name) continue;
      artistScores.set(artist.name, (artistScores.get(artist.name) || 0) + effective);
    }

    const genre = track.genre || inferGenreFromTrack(track);
    if (genre) {
      genreScores.set(genre, (genreScores.get(genre) || 0) + effective);
    }

    if (typeof track.bpm === 'number' && track.bpm > 0) {
      bpmSum += track.bpm;
      bpmCount += 1;
    }
  };

  likedTracks.forEach((t) => addSignal(t, 3));
  customPlaylists.forEach((pl) => pl.tracks.forEach((t) => addSignal(t, 2)));
  recentlyPlayed.slice(0, 25).forEach((t, idx) => {
    const recencyWeight = Math.max(0.4, 1.5 - idx * 0.04);
    addSignal(t, recencyWeight);
  });

  const topArtists = [...artistScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 4);

  const topGenres = [...genreScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 3);

  const resolvedArtists =
    topArtists.length > 0 ? topArtists : ['The Weeknd', 'Daft Punk', 'Billie Eilish'];
  const resolvedGenres = topGenres.length > 0 ? topGenres : ['Pop', 'Electronic'];

  const summaryText =
    topArtists.length >= 2
      ? `Tailored from your affinity for ${resolvedArtists.slice(0, 2).join(' & ')}`
      : topArtists.length === 1
      ? `Personalized around ${resolvedArtists[0]} & ${resolvedGenres[0]}`
      : 'Personalized picks that evolve as you listen and like tracks';

  const signatureKey = `${resolvedArtists.join('|')}__${resolvedGenres.join('|')}`;

  return {
    topArtists: resolvedArtists,
    topGenres: resolvedGenres,
    preferredBpmAvg: bpmCount > 0 ? Math.round(bpmSum / bpmCount) : 116,
    summaryText,
    signatureKey,
  };
}

function inferGenreFromTrack(track: Track): string {
  const joined = `${track.name} ${track.album?.name || ''} ${(track.artists || []).map((a) => a.name).join(' ')}`.toLowerCase();
  if (/daft punk|electronic|house|synth|remix/.test(joined)) return 'Electronic';
  if (/travis scott|hip-hop|rap|rodeo/.test(joined)) return 'Hip-Hop/Rap';
  if (/weeknd|r&b|soul/.test(joined)) return 'R&B/Soul';
  if (/coldplay|viva|rock|alternative|billie/.test(joined)) return 'Alternative';
  return 'Pop';
}
