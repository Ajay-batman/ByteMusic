import { Capacitor, CapacitorHttp } from '@capacitor/core';
import {
  AboutFields,
  ChartRegion,
  Playlist,
  SearchCatalogAlbum,
  SearchCatalogArtist,
  SearchCatalogPodcast,
  SearchCatalogResponse,
  Track,
} from '../types/spotify';
import { getCurrentIsoWeekKey, trackDedupKey } from './tasteProfile';

const REGION_NAME_MAP: Record<ChartRegion, string> = {
  us: 'United States / Global',
  in: 'India',
  gb: 'United Kingdom',
  jp: 'Japan',
  br: 'Brazil',
  de: 'Germany',
  au: 'Australia',
  kr: 'South Korea',
};

const GENRE_ID_MAP: Record<string, number> = {
  Pop: 14,
  Electronic: 7,
  Dance: 17,
  'Hip-Hop/Rap': 18,
  'R&B/Soul': 15,
  Alternative: 20,
  Rock: 21,
  Indie: 20,
};

const DEFAULT_DISCOVER_GENRES = ['Pop', 'Electronic', 'Alternative', 'Hip-Hop/Rap', 'R&B/Soul'];
const VARIANT_PENALTY_RE =
  /\b(live|karaoke|tribute|instrumental|sped up|slowed|reverb|8d audio|commentary|demo|backing track|a cappella|acoustic version)\b/i;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;

const clientChartCache = new Map<string, { expiresAt: number; payload: any }>();
const clientSearchCache = new Map<string, { expiresAt: number; payload: SearchCatalogResponse }>();

export const CLIENT_ABOUT_VIEW_PASSCODE = '00000';
export const CLIENT_ABOUT_EDIT_PASSCODE = '749283';

/**
 * Returns true when running on Desktop Web so local Node/Vite `/api/*` routes are tried first.
 * On native Android (Capacitor), runs completely serverless on-device against public CORS APIs
 * and native plugins without any backend server.
 */
export function shouldPreferServerBackend(): boolean {
  return !Capacitor.isNativePlatform();
}

function normalizeArtworkUrl(url?: string, size = 500): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop';
  }
  return url
    .replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, `/${size}x${size}bb.$1`)
    .replace(/\/\d+x\d+-\d+\.(jpg|png|webp)$/i, `/${size}x${size}bb.$1`);
}

function safeRegionCode(region?: string): ChartRegion {
  if (region && region in REGION_NAME_MAP) {
    return region as ChartRegion;
  }
  return 'us';
}

function mapItunesSearchItemToTrack(item: any, addedAt = 'Dynamic Feed'): Track {
  const trackId = String(item.trackId || item.collectionId || Math.random().toString(36).slice(2));
  const artistName = item.artistName || 'Unknown Artist';
  const artistId = String(item.artistId || artistName.toLowerCase().replace(/\s+/g, '-'));
  const collectionId = String(item.collectionId || trackId);

  return {
    id: `itunes-${trackId}`,
    uri: `spotify:track:itunes-${trackId}`,
    name: item.trackName || 'Unknown Track',
    duration: { milliseconds: Number(item.trackTimeMillis) || 195000 },
    artists: [
      {
        id: `artist-${artistId}`,
        name: artistName,
        uri: `spotify:artist:${artistId}`,
      },
    ],
    album: {
      id: `album-${collectionId}`,
      name: item.collectionName || item.trackName || 'Single',
      uri: `spotify:album:${collectionId}`,
      releaseDate: item.releaseDate ? String(item.releaseDate).slice(0, 10) : undefined,
      images: [
        {
          url: normalizeArtworkUrl(item.artworkUrl100 || item.artworkUrl60, 500),
          width: 500,
          height: 500,
        },
      ],
    },
    isPlayable: true,
    isExplicit: item.trackExplicitness === 'explicit',
    audioUrl: item.previewUrl,
    addedAt,
    genre: item.primaryGenreName || 'Pop',
  };
}

function mapRssEntryToTrack(entry: any, lookupMap: Map<string, any>, addedAt = 'Top Charts'): Track {
  const trackId = String(entry?.id?.attributes?.['im:id'] || '');
  const enriched = trackId ? lookupMap.get(trackId) : null;
  if (enriched) {
    return mapItunesSearchItemToTrack(enriched, addedAt);
  }

  const name = entry?.['im:name']?.label || entry?.title?.label || 'Unknown Track';
  const artistName = entry?.['im:artist']?.label || 'Unknown Artist';
  const imgs = Array.isArray(entry?.['im:image']) ? entry['im:image'] : [];
  const rawImg = imgs[imgs.length - 1]?.label || imgs[0]?.label;
  const albumName = entry?.['im:collection']?.['im:name']?.label || name;
  const genre = entry?.category?.attributes?.label || 'Pop';
  const safeId = trackId || encodeURIComponent(`${name}-${artistName}`).slice(0, 24);

  return {
    id: `itunes-${safeId}`,
    uri: `spotify:track:itunes-${safeId}`,
    name,
    duration: { milliseconds: 195000 },
    artists: [
      {
        id: `artist-${artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: artistName,
        uri: `spotify:artist:${encodeURIComponent(artistName)}`,
      },
    ],
    album: {
      id: `album-${safeId}`,
      name: albumName,
      uri: `spotify:album:${safeId}`,
      releaseDate: entry?.['im:releaseDate']?.label?.slice(0, 10),
      images: [{ url: normalizeArtworkUrl(rawImg, 500), width: 500, height: 500 }],
    },
    isPlayable: true,
    isExplicit: false,
    addedAt,
    genre,
  };
}

function mapPodcastEpisodeToTrack(item: any): Track {
  const episodeId = String(item.trackId || Math.random().toString(36).slice(2));
  const showId = String(item.collectionId || episodeId);
  const showName = item.collectionName || 'Podcast';
  return {
    id: `podcast-ep-${episodeId}`,
    uri: `spotify:track:podcast-ep-${episodeId}`,
    name: item.trackName || showName,
    duration: { milliseconds: Number(item.trackTimeMillis) || 1800000 },
    artists: [
      {
        id: `artist-${showId}`,
        name: item.artistName || showName,
        uri: `spotify:artist:${showId}`,
      },
    ],
    album: {
      id: `album-${showId}`,
      name: showName,
      uri: `spotify:album:${showId}`,
      releaseDate: item.releaseDate ? String(item.releaseDate).slice(0, 10) : undefined,
      images: [
        {
          url: normalizeArtworkUrl(
            item.artworkUrl600 || item.artworkUrl160 || item.artworkUrl100 || item.artworkUrl60,
            500
          ),
          width: 500,
          height: 500,
        },
      ],
    },
    isPlayable: true,
    isExplicit: item.trackExplicitness === 'explicit' || item.contentAdvisoryRating === 'Explicit',
    audioUrl: item.episodeUrl || item.previewUrl,
    addedAt: item.releaseDate ? String(item.releaseDate).slice(0, 10) : 'Episode',
    genre: Array.isArray(item.genres) && item.genres[0] ? item.genres[0] : 'Podcast',
  };
}

function dedupeAndPrioritizeArtistTracks(tracks: Track[], limit = 25): Track[] {
  const studio: Track[] = [];
  const variants: { track: Track; coreTitle: string }[] = [];
  const seenCoreTitles = new Set<string>();

  for (const t of tracks) {
    if (!t?.name) continue;
    const coreTitle = t.name
      .toLowerCase()
      .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '')
      .replace(/\s+-\s+(live|remix|radio edit|acoustic|instrumental).*$/i, '')
      .trim();
    if (!coreTitle) continue;

    if (VARIANT_PENALTY_RE.test(t.name) || VARIANT_PENALTY_RE.test(t.album?.name || '')) {
      variants.push({ track: t, coreTitle });
    } else if (!seenCoreTitles.has(coreTitle)) {
      seenCoreTitles.add(coreTitle);
      studio.push(t);
    }
  }

  for (const { track, coreTitle } of variants) {
    if (!seenCoreTitles.has(coreTitle)) {
      seenCoreTitles.add(coreTitle);
      studio.push(track);
    }
  }

  return studio.slice(0, limit);
}

function scoreArtistNameMatch(artistName = '', query = ''): number {
  const a = artistName.toLowerCase().trim();
  const q = query.toLowerCase().trim();
  if (!a || !q) return 0;
  if (a === q) return 100;
  if (a.startsWith(q)) return 75;
  if (a.includes(q)) return 50;
  return 10;
}

async function fetchRssTopSongs({
  region = 'us',
  limit = 25,
  genreId = null,
  addedAt = 'Top Charts',
}: {
  region?: ChartRegion;
  limit?: number;
  genreId?: number | null;
  addedAt?: string;
}): Promise<Track[]> {
  const safeRegion = safeRegionCode(region);
  const safeLimit = Math.max(5, Math.min(50, Number(limit) || 25));
  const genreSegment = genreId ? `/genre=${genreId}` : '';
  const rssUrl = `https://itunes.apple.com/${safeRegion}/rss/topsongs/limit=${safeLimit}${genreSegment}/json`;

  const res = await fetch(rssUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`RSS chart fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  const entries = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
  const ids = entries.map((e: any) => e?.id?.attributes?.['im:id']).filter(Boolean);

  const lookupMap = new Map<string, any>();
  if (ids.length > 0) {
    try {
      const lookupRes = await fetch(
        `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${safeRegion}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        for (const item of lookupData?.results || []) {
          if (item?.trackId) {
            lookupMap.set(String(item.trackId), item);
          }
        }
      }
    } catch {}
  }

  return entries.map((entry: any) => mapRssEntryToTrack(entry, lookupMap, addedAt));
}

async function fetchItunesEntity(term: string, entity: string, region: ChartRegion, limit: number): Promise<any[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${region}&entity=${entity}&limit=${limit}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    return [];
  }
}

export async function fetchTopHitsDirect({
  region = 'us',
  limit = 25,
  refresh = false,
}: {
  region?: ChartRegion;
  limit?: number;
  refresh?: boolean;
}) {
  const safeRegion = safeRegionCode(region);
  const cacheKey = `${safeRegion}:${limit}`;
  const cached = clientChartCache.get(cacheKey);
  if (!refresh && cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const tracks = await fetchRssTopSongs({
    region: safeRegion,
    limit,
    addedAt: 'Charting Today',
  });

  const payload = {
    region: safeRegion,
    regionLabel: REGION_NAME_MAP[safeRegion],
    tracks,
    updatedAt: new Date().toISOString(),
  };

  if (tracks.length > 0) {
    clientChartCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  }
  return payload;
}

export async function fetchDiscoverWeeklyDirect({
  region = 'us',
  genres = [],
  excludeKeys = [],
  offset = 0,
}: {
  region?: ChartRegion;
  genres?: string[];
  excludeKeys?: string[];
  offset?: number;
}) {
  const safeRegion = safeRegionCode(region);
  const weekKey = getCurrentIsoWeekKey();

  const prioritized: string[] = [];
  for (const g of genres) {
    const matchKey = Object.keys(GENRE_ID_MAP).find((k) => k.toLowerCase() === String(g).toLowerCase());
    if (matchKey && !prioritized.includes(matchKey)) {
      prioritized.push(matchKey);
    }
  }
  for (const fallback of DEFAULT_DISCOVER_GENRES) {
    if (!prioritized.includes(fallback)) {
      prioritized.push(fallback);
    }
  }
  const activeGenres = prioritized.slice(0, 4);

  const excludeSet = new Set(excludeKeys.map((k) => String(k).toLowerCase()));
  const seen = new Set<string>();

  const buckets = await Promise.all(
    activeGenres.map((genreName) =>
      fetchRssTopSongs({
        region: safeRegion,
        limit: 18,
        genreId: GENRE_ID_MAP[genreName],
        addedAt: `${weekKey} Discovery`,
      }).catch(() => [] as Track[])
    )
  );

  const combined: Track[] = [];
  const maxLen = Math.max(0, ...buckets.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (let gIdx = 0; gIdx < buckets.length; gIdx++) {
      const candidate = buckets[gIdx][i];
      if (!candidate) continue;
      const dKey = trackDedupKey(candidate);
      if (excludeSet.has(dKey) || excludeSet.has(candidate.id.toLowerCase()) || seen.has(dKey)) {
        continue;
      }
      seen.add(dKey);
      combined.push(candidate);
    }
  }

  const targetCount = 20;
  let selected = combined;
  if (combined.length > targetCount) {
    const start = (Number(offset) * 7) % combined.length;
    const rotated = [...combined.slice(start), ...combined.slice(0, start)];
    selected = rotated.slice(0, targetCount);
  }

  return {
    weekKey,
    region: safeRegion,
    genresUsed: activeGenres,
    tracks: selected,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchPersonalizedRecommendationsDirect({
  seedArtists = [],
  seedGenres = [],
  excludeKeys = [],
  region = 'us',
  offset = 0,
}: {
  seedArtists?: string[];
  seedGenres?: string[];
  excludeKeys?: string[];
  region?: ChartRegion;
  offset?: number;
}) {
  const safeRegion = safeRegionCode(region);
  const artistsToQuery = (seedArtists.length > 0 ? seedArtists : ['The Weeknd', 'Daft Punk', 'Billie Eilish']).slice(
    0,
    4
  );
  const genresToQuery = (seedGenres.length > 0 ? seedGenres : ['Synth Pop', 'Electronic']).slice(0, 2);

  const queries = [...artistsToQuery, ...genresToQuery.map((g) => `${g} hits`)];
  const results = await Promise.all(
    queries.map(async (term) => {
      const raw = await fetchItunesEntity(term, 'song', safeRegion, 12);
      return raw
        .filter((item) => item?.trackName && item?.artistName)
        .map((item) => mapItunesSearchItemToTrack(item, 'Recommended For You'));
    })
  );

  const excludeSet = new Set(excludeKeys.map((k) => String(k).toLowerCase()));
  const seen = new Set<string>();
  const artistCount = new Map<string, number>();
  const ranked: Track[] = [];

  const maxLen = Math.max(0, ...results.map((r) => r.length));
  for (let i = 0; i < maxLen; i++) {
    for (let sIdx = 0; sIdx < results.length; sIdx++) {
      const candidate = results[sIdx][i];
      if (!candidate) continue;
      const dKey = trackDedupKey(candidate);
      if (excludeSet.has(dKey) || excludeSet.has(candidate.id.toLowerCase()) || seen.has(dKey)) {
        continue;
      }
      const primaryArtist = (candidate.artists?.[0]?.name || '').toLowerCase();
      const count = artistCount.get(primaryArtist) || 0;
      if (count >= 3) continue;

      seen.add(dKey);
      artistCount.set(primaryArtist, count + 1);
      ranked.push(candidate);
    }
  }

  const targetCount = 20;
  let finalTracks = ranked;
  if (ranked.length > targetCount) {
    const start = (Number(offset) * 5) % ranked.length;
    const rotated = [...ranked.slice(start), ...ranked.slice(0, start)];
    finalTracks = rotated.slice(0, targetCount);
  }

  return {
    tracks: finalTracks,
    seedsUsed: { artists: artistsToQuery, genres: genresToQuery },
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchCollectionTracksDirect({
  id,
  type = 'album',
  region = 'us',
}: {
  id: string;
  type?: 'artist' | 'album' | 'podcast';
  region?: ChartRegion;
}): Promise<{ id: string; type: string; tracks: Track[] }> {
  const safeRegion = safeRegionCode(region);
  if (!id) return { id: '', type, tracks: [] };
  const entity = type === 'podcast' ? 'podcastEpisode' : 'song';
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(String(id))}&country=${safeRegion}&entity=${entity}&limit=35`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { id: String(id), type, tracks: [] };
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    if (type === 'podcast') {
      const episodes = results
        .filter((item: any) => item?.wrapperType === 'podcastEpisode' || item?.kind === 'podcast-episode')
        .map((item: any) => mapPodcastEpisodeToTrack(item));
      return { id: String(id), type, tracks: episodes };
    }

    const rawTracks = results
      .filter((item: any) => item?.wrapperType === 'track' && item?.trackName)
      .map((item: any) =>
        mapItunesSearchItemToTrack(item, type === 'artist' ? 'Popular Track' : 'Album Track')
      );

    const tracks = type === 'artist' ? dedupeAndPrioritizeArtistTracks(rawTracks, 25) : rawTracks;
    return { id: String(id), type, tracks };
  } catch {
    return { id: String(id), type, tracks: [] };
  }
}

export async function searchFullCatalogDirect({
  q,
  region = 'us',
}: {
  q: string;
  region?: ChartRegion;
}): Promise<SearchCatalogResponse> {
  const query = String(q || '').trim();
  const safeRegion = safeRegionCode(region);
  if (!query) {
    return {
      query: '',
      region: safeRegion,
      tracks: [],
      artists: [],
      albums: [],
      podcasts: [],
      artistPlaylists: [],
    };
  }

  const cacheKey = `${safeRegion}:${query.toLowerCase()}`;
  const cached = clientSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const [songResults, artistResults, albumResults, podcastResults] = await Promise.all([
    fetchItunesEntity(query, 'song', safeRegion, 25),
    fetchItunesEntity(query, 'musicArtist', safeRegion, 5),
    fetchItunesEntity(query, 'album', safeRegion, 10),
    fetchItunesEntity(query, 'podcast', safeRegion, 8),
  ]);

  const tracks = songResults
    .filter((item) => item?.trackName && item?.artistName)
    .map((item) => mapItunesSearchItemToTrack(item, 'Global Search'));

  const sortedRawArtists = artistResults
    .filter((item) => item?.artistId && item?.artistName)
    .sort((a, b) => scoreArtistNameMatch(b.artistName, query) - scoreArtistNameMatch(a.artistName, query));

  const topArtistCandidates = [...sortedRawArtists];
  if (topArtistCandidates.length === 0 && tracks.length > 0 && songResults[0]?.artistId) {
    topArtistCandidates.push({
      artistId: songResults[0].artistId,
      artistName: songResults[0].artistName,
      primaryGenreName: songResults[0].primaryGenreName || 'Pop',
    });
  }

  const primaryArtistsToExpand = topArtistCandidates.slice(0, 2);
  const expandedArtistTracks = await Promise.all(
    primaryArtistsToExpand.map((a) =>
      fetchCollectionTracksDirect({ id: String(a.artistId), type: 'artist', region: safeRegion })
    )
  );

  const artistPlaylists: Playlist[] = [];
  const artists: SearchCatalogArtist[] = [];

  for (const raw of sortedRawArtists) {
    const artistIdStr = String(raw.artistId);
    const expandedIdx = primaryArtistsToExpand.findIndex((a) => String(a.artistId) === artistIdStr);
    const popularTracks = expandedIdx >= 0 ? expandedArtistTracks[expandedIdx].tracks : [];
    const matchingSongFallback = tracks.find(
      (t) => t.artists[0]?.name.toLowerCase() === raw.artistName.toLowerCase()
    );
    const coverImage =
      popularTracks[0]?.album.images[0]?.url ||
      matchingSongFallback?.album.images[0]?.url ||
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop';

    artists.push({
      id: artistIdStr,
      name: raw.artistName,
      genre: raw.primaryGenreName || 'Music',
      image: coverImage,
      matchScore: scoreArtistNameMatch(raw.artistName, query),
      tracks: popularTracks,
    });

    if (popularTracks.length > 0) {
      artistPlaylists.push({
        id: `artist-mix-${artistIdStr}`,
        uri: `spotify:playlist:artist-mix-${artistIdStr}`,
        name: `This Is ${raw.artistName}`,
        description: `The essential tracks and most popular songs by ${raw.artistName}.`,
        owner: { id: 'bytemusic', displayName: 'Spotify Essentials' },
        images: [{ url: coverImage, width: 500, height: 500 }],
        tracks: popularTracks,
      });
    }
  }

  if (artists.length === 0 && primaryArtistsToExpand.length > 0 && expandedArtistTracks[0]?.tracks?.length > 0) {
    const raw = primaryArtistsToExpand[0];
    const popularTracks = expandedArtistTracks[0].tracks;
    const coverImage =
      popularTracks[0].album.images[0]?.url ||
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop';
    artists.push({
      id: String(raw.artistId),
      name: raw.artistName,
      genre: raw.primaryGenreName || 'Music',
      image: coverImage,
      matchScore: scoreArtistNameMatch(raw.artistName, query),
      tracks: popularTracks,
    });
    artistPlaylists.push({
      id: `artist-mix-${raw.artistId}`,
      uri: `spotify:playlist:artist-mix-${raw.artistId}`,
      name: `This Is ${raw.artistName}`,
      description: `The essential tracks and most popular songs by ${raw.artistName}.`,
      owner: { id: 'bytemusic', displayName: 'Spotify Essentials' },
      images: [{ url: coverImage, width: 500, height: 500 }],
      tracks: popularTracks,
    });
  }

  const albums: SearchCatalogAlbum[] = albumResults
    .filter((item) => item?.collectionId && item?.collectionName)
    .map((item) => ({
      id: String(item.collectionId),
      name: item.collectionName,
      artistName: item.artistName || 'Various Artists',
      releaseYear: item.releaseDate ? String(item.releaseDate).slice(0, 4) : '',
      trackCount: Number(item.trackCount) || 0,
      genre: item.primaryGenreName || 'Album',
      image: normalizeArtworkUrl(item.artworkUrl100 || item.artworkUrl60, 500),
    }));

  const podcasts: SearchCatalogPodcast[] = podcastResults
    .filter((item) => item?.collectionId && (item?.collectionName || item?.trackName))
    .map((item) => ({
      id: String(item.collectionId),
      name: item.collectionName || item.trackName,
      artistName: item.artistName || 'Podcast Creator',
      trackCount: Number(item.trackCount) || 0,
      genre: item.primaryGenreName || 'Podcast',
      image: normalizeArtworkUrl(item.artworkUrl600 || item.artworkUrl100 || item.artworkUrl60, 500),
    }));

  const payload: SearchCatalogResponse = {
    query,
    region: safeRegion,
    tracks,
    artists,
    albums,
    podcasts,
    artistPlaylists,
  };

  if (clientSearchCache.size > 80) {
    const oldestKey = clientSearchCache.keys().next().value;
    if (oldestKey) clientSearchCache.delete(oldestKey);
  }
  clientSearchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, payload });

  return payload;
}

export function verifyAboutPasscodeLocal(action: 'view' | 'edit', passcode: string): boolean {
  const clean = passcode.trim();
  if (!clean) return false;
  return action === 'edit'
    ? clean === CLIENT_ABOUT_EDIT_PASSCODE
    : clean === CLIENT_ABOUT_VIEW_PASSCODE;
}

export function saveAboutFieldsLocal(fields: AboutFields): void {
  try {
    localStorage.setItem('spotify_about_fields', JSON.stringify(fields));
    localStorage.setItem('spotify_about_updated_at', new Date().toISOString());
  } catch {}
}

/**
 * Resolves a YouTube videoId directly from Android native CapacitorHttp (bypassing WebView CORS)
 * so full-song playback works without any Render/Node backend server.
 */
export async function resolveYouTubeVideoIdDirect(query: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  try {
    const res = await CapacitorHttp.post({
      url: 'https://www.youtube.com/youtubei/v1/search',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        query: `${query} official audio`,
      },
    });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents?.[0]?.itemSectionRenderer?.contents;
    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (item?.videoRenderer?.videoId) {
          return String(item.videoRenderer.videoId);
        }
      }
    }
  } catch (err) {
    console.warn('Direct native YouTube search failed:', err);
  }
  return null;
}
