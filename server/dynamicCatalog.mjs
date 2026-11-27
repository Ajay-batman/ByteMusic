/**
 * Shared Dynamic Catalog, Chart & Recommendation API Handler
 * Used identically by Vite Dev Middleware (vite.config.ts) and Production Server (server.mjs).
 * Uses zero-key public feeds (iTunes RSS Top Songs + iTunes Batch Lookup + iTunes Search).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __catalogFilename = fileURLToPath(import.meta.url);
const __catalogDirname = path.dirname(__catalogFilename);
const ABOUT_DATA_DIR = path.resolve(__catalogDirname, '../data');
const ABOUT_DATA_FILE = path.resolve(ABOUT_DATA_DIR, 'about.json');

const VIEW_PASSCODE = '00000';
const DEFAULT_EDIT_PASSCODE = '749283';
const DEFAULT_ABOUT_FIELDS = {
  appName: 'ByteMusic',
  version: '1.0.0',
  description:
    'Spatial audio & dynamic discovery player powered by live regional charts, week-locked mixes, and personalized taste profiles.',
  developerName: '',
};

let inMemoryAboutRecord = null;

function readOrInitAboutRecord() {
  try {
    if (fs.existsSync(ABOUT_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ABOUT_DATA_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object' && parsed.fields) {
        inMemoryAboutRecord = {
          fields: {
            appName: typeof parsed.fields.appName === 'string' ? parsed.fields.appName : DEFAULT_ABOUT_FIELDS.appName,
            version: typeof parsed.fields.version === 'string' ? parsed.fields.version : DEFAULT_ABOUT_FIELDS.version,
            description:
              typeof parsed.fields.description === 'string'
                ? parsed.fields.description
                : DEFAULT_ABOUT_FIELDS.description,
            developerName: typeof parsed.fields.developerName === 'string' ? parsed.fields.developerName : '',
          },
          editPasscode:
            typeof parsed.editPasscode === 'string' && parsed.editPasscode.trim()
              ? parsed.editPasscode.trim()
              : DEFAULT_EDIT_PASSCODE,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
        return inMemoryAboutRecord;
      }
    }
  } catch {}

  if (inMemoryAboutRecord) {
    return inMemoryAboutRecord;
  }

  inMemoryAboutRecord = {
    fields: { ...DEFAULT_ABOUT_FIELDS },
    editPasscode: DEFAULT_EDIT_PASSCODE,
    updatedAt: new Date().toISOString(),
  };
  try {
    if (!fs.existsSync(ABOUT_DATA_DIR)) {
      fs.mkdirSync(ABOUT_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ABOUT_DATA_FILE, JSON.stringify(inMemoryAboutRecord, null, 2), 'utf-8');
  } catch {}
  return inMemoryAboutRecord;
}

function writeAboutRecord(record) {
  inMemoryAboutRecord = record;
  try {
    if (!fs.existsSync(ABOUT_DATA_DIR)) {
      fs.mkdirSync(ABOUT_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ABOUT_DATA_FILE, JSON.stringify(record, null, 2), 'utf-8');
  } catch {}
}

export const SUPPORTED_REGIONS = {
  us: 'United States / Global',
  in: 'India',
  gb: 'United Kingdom',
  jp: 'Japan',
  br: 'Brazil',
  de: 'Germany',
  au: 'Australia',
  kr: 'South Korea',
};

// Apple Music / iTunes RSS Genre IDs mapped by human-readable name
const GENRE_ID_MAP = {
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

// In-memory 6-hour cache for regional charts + 15-min cache for search catalog
const chartCache = new Map(); // key -> { expiresAt, payload }
const searchCache = new Map(); // key -> { expiresAt, payload }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;

export function getCurrentIsoWeekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function normalizeArtworkUrl(url, size = 500) {
  if (!url) {
    return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop';
  }
  return url
    .replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, `/${size}x${size}bb.$1`)
    .replace(/\/\d+x\d+-\d+\.(jpg|png|webp)$/i, `/${size}x${size}bb.$1`);
}

function trackDedupKey(track) {
  const title = (track.name || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
  const artist = (track.artists?.[0]?.name || '').toLowerCase().trim();
  return `${title}::${artist}`;
}

function mapItunesSearchItemToTrack(item, addedAt = 'Dynamic Feed') {
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
      releaseDate: item.releaseDate ? item.releaseDate.slice(0, 10) : undefined,
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

function mapRssEntryToTrack(entry, lookupMap, addedAt = 'Top Charts') {
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

async function fetchRssTopSongs({ region = 'us', limit = 25, genreId = null, addedAt = 'Top Charts' }) {
  const safeRegion = SUPPORTED_REGIONS[region] ? region : 'us';
  const safeLimit = Math.max(5, Math.min(50, Number(limit) || 25));
  const genreSegment = genreId ? `/genre=${genreId}` : '';
  const rssUrl = `https://itunes.apple.com/${safeRegion}/rss/topsongs/limit=${safeLimit}${genreSegment}/json`;

  const res = await fetch(rssUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`RSS chart fetch failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  const entries = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
  const ids = entries.map((e) => e?.id?.attributes?.['im:id']).filter(Boolean);

  const lookupMap = new Map();
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
    } catch {
      // Fall back cleanly to RSS entry fields if lookup times out
    }
  }

  return entries.map((entry) => mapRssEntryToTrack(entry, lookupMap, addedAt));
}

async function fetchItunesSearchTracks(term, region = 'us', limit = 12, addedAt = 'Recommended') {
  const safeRegion = SUPPORTED_REGIONS[region] ? region : 'us';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${safeRegion}&entity=song&limit=${limit}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results || [])
      .filter((item) => item?.trackName && item?.artistName)
      .map((item) => mapItunesSearchItemToTrack(item, addedAt));
  } catch {
    return [];
  }
}

const VARIANT_PENALTY_RE = /\b(live|karaoke|tribute|instrumental|sped up|slowed|reverb|8d audio|commentary|demo|backing track|a cappella|acoustic version)\b/i;

function isStudioVariantTitle(title = '', albumName = '') {
  return VARIANT_PENALTY_RE.test(title) || VARIANT_PENALTY_RE.test(albumName);
}

/**
 * Deduplicate artist catalog tracks by normalized core title and place signature studio releases
 * ahead of live, karaoke, instrumental, or sped-up variants.
 */
function dedupeAndPrioritizeArtistTracks(tracks, limit = 25) {
  const studio = [];
  const variants = [];
  const seenCoreTitles = new Set();

  for (const t of tracks) {
    if (!t?.name) continue;
    const coreTitle = t.name
      .toLowerCase()
      .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '')
      .replace(/\s+-\s+(live|remix|radio edit|acoustic|instrumental).*$/i, '')
      .trim();
    if (!coreTitle) continue;

    if (isStudioVariantTitle(t.name, t.album?.name)) {
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

function mapPodcastEpisodeToTrack(item) {
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
      releaseDate: item.releaseDate ? item.releaseDate.slice(0, 10) : undefined,
      images: [
        {
          url: normalizeArtworkUrl(item.artworkUrl600 || item.artworkUrl160 || item.artworkUrl100 || item.artworkUrl60, 500),
          width: 500,
          height: 500,
        },
      ],
    },
    isPlayable: true,
    isExplicit: item.trackExplicitness === 'explicit' || item.contentAdvisoryRating === 'Explicit',
    audioUrl: item.episodeUrl || item.previewUrl,
    addedAt: item.releaseDate ? item.releaseDate.slice(0, 10) : 'Episode',
    genre: Array.isArray(item.genres) && item.genres[0] ? item.genres[0] : 'Podcast',
  };
}

function scoreArtistNameMatch(artistName = '', query = '') {
  const a = artistName.toLowerCase().trim();
  const q = query.toLowerCase().trim();
  if (!a || !q) return 0;
  if (a === q) return 100;
  if (a.startsWith(q)) return 75;
  if (a.includes(q)) return 50;
  return 10;
}

async function fetchItunesEntity(term, entity, region = 'us', limit = 8) {
  const safeRegion = SUPPORTED_REGIONS[region] ? region : 'us';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${safeRegion}&entity=${entity}&limit=${limit}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    return [];
  }
}

export async function getCollectionTracks({ id, type = 'album', region = 'us' } = {}) {
  const safeRegion = SUPPORTED_REGIONS[region] ? region : 'us';
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
        .filter((item) => item?.wrapperType === 'podcastEpisode' || item?.kind === 'podcast-episode')
        .map((item) => mapPodcastEpisodeToTrack(item));
      return { id: String(id), type, tracks: episodes };
    }

    const rawTracks = results
      .filter((item) => item?.wrapperType === 'track' && item?.trackName)
      .map((item) => mapItunesSearchItemToTrack(item, type === 'artist' ? 'Popular Track' : 'Album Track'));

    const tracks = type === 'artist' ? dedupeAndPrioritizeArtistTracks(rawTracks, 25) : rawTracks;
    return { id: String(id), type, tracks };
  } catch {
    return { id: String(id), type, tracks: [] };
  }
}

export async function searchFullCatalog({ q = '', region = 'us' } = {}) {
  const query = String(q || '').trim();
  const safeRegion = SUPPORTED_REGIONS[region] ? region : 'us';
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
  const cached = searchCache.get(cacheKey);
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

  // Prioritize artists that actually match the search term closely
  const sortedRawArtists = artistResults
    .filter((item) => item?.artistId && item?.artistName)
    .sort((a, b) => scoreArtistNameMatch(b.artistName, query) - scoreArtistNameMatch(a.artistName, query));

  // If iTunes musicArtist search returns sparse results, infer primary artist from top returned tracks
  const topArtistCandidates = [...sortedRawArtists];
  if (topArtistCandidates.length === 0 && tracks.length > 0) {
    const firstArtist = songResults[0];
    if (firstArtist?.artistId && firstArtist?.artistName) {
      topArtistCandidates.push({
        artistId: firstArtist.artistId,
        artistName: firstArtist.artistName,
        primaryGenreName: firstArtist.primaryGenreName || 'Pop',
      });
    }
  }

  // Fetch canonical popular songs for top 2 matched artists via lookup?id=...&entity=song
  const primaryArtistsToExpand = topArtistCandidates.slice(0, 2);
  const expandedArtistTracks = await Promise.all(
    primaryArtistsToExpand.map((a) => getCollectionTracks({ id: a.artistId, type: 'artist', region: safeRegion }))
  );

  const artistPlaylists = [];
  const artists = [];

  for (let i = 0; i < sortedRawArtists.length; i++) {
    const raw = sortedRawArtists[i];
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

  // If musicArtist search returned empty but song fallback expanded an artist
  if (artists.length === 0 && primaryArtistsToExpand.length > 0 && expandedArtistTracks[0]?.tracks?.length > 0) {
    const raw = primaryArtistsToExpand[0];
    const popularTracks = expandedArtistTracks[0].tracks;
    const coverImage = popularTracks[0].album.images[0]?.url;
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

  const albums = albumResults
    .filter((item) => item?.collectionId && item?.collectionName)
    .map((item) => ({
      id: String(item.collectionId),
      name: item.collectionName,
      artistName: item.artistName || 'Various Artists',
      releaseYear: item.releaseDate ? item.releaseDate.slice(0, 4) : '',
      trackCount: Number(item.trackCount) || 0,
      genre: item.primaryGenreName || 'Album',
      image: normalizeArtworkUrl(item.artworkUrl100 || item.artworkUrl60, 500),
    }));

  const podcasts = podcastResults
    .filter((item) => item?.collectionId && (item?.collectionName || item?.trackName))
    .map((item) => ({
      id: String(item.collectionId),
      name: item.collectionName || item.trackName,
      artistName: item.artistName || 'Podcast Creator',
      trackCount: Number(item.trackCount) || 0,
      genre: item.primaryGenreName || 'Podcast',
      image: normalizeArtworkUrl(item.artworkUrl600 || item.artworkUrl100 || item.artworkUrl60, 500),
    }));

  const payload = {
    query,
    region: safeRegion,
    tracks,
    artists,
    albums,
    podcasts,
    artistPlaylists,
  };

  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(cacheKey, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    payload,
  });

  return payload;
}

export async function getTopHitsChart({ region = 'us', limit = 25, refresh = false } = {}) {
  const safeRegion = SUPPORTED_REGIONS[region] ? region : 'us';
  const cacheKey = `${safeRegion}:${limit}`;
  const cached = chartCache.get(cacheKey);
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
    regionLabel: SUPPORTED_REGIONS[safeRegion],
    tracks,
    updatedAt: new Date().toISOString(),
  };

  if (tracks.length > 0) {
    chartCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    });
  }
  return payload;
}

export async function getDiscoverWeekly({
  region = 'us',
  genres = [],
  excludeKeys = [],
  offset = 0,
} = {}) {
  const safeRegion = SUPPORTED_REGIONS[region] ? region : 'us';
  const weekKey = getCurrentIsoWeekKey();

  // Combine requested preference genres with diverse fallback discovery genres
  const prioritized = [];
  for (const g of genres) {
    const matchKey = Object.keys(GENRE_ID_MAP).find(
      (k) => k.toLowerCase() === String(g).toLowerCase()
    );
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
  const seen = new Set();

  const buckets = await Promise.all(
    activeGenres.map((genreName) =>
      fetchRssTopSongs({
        region: safeRegion,
        limit: 18,
        genreId: GENRE_ID_MAP[genreName],
        addedAt: `${weekKey} Discovery`,
      }).catch(() => [])
    )
  );

  // Interleave tracks across genres for variety and apply weekly/manual offset rotation
  const combined = [];
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

  // Rotate slice when user clicks Refresh Mix (offset increments)
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

export async function getPersonalizedRecommendations({
  seedArtists = [],
  seedGenres = [],
  excludeKeys = [],
  region = 'us',
  offset = 0,
} = {}) {
  const safeRegion = SUPPORTED_REGIONS[region] ? region : 'us';
  const artistsToQuery = (seedArtists.length > 0 ? seedArtists : ['The Weeknd', 'Daft Punk', 'Billie Eilish']).slice(0, 4);
  const genresToQuery = (seedGenres.length > 0 ? seedGenres : ['Synth Pop', 'Electronic']).slice(0, 2);

  const queries = [
    ...artistsToQuery.map((a) => ({ term: a, weight: 3 })),
    ...genresToQuery.map((g) => ({ term: `${g} hits`, weight: 2 })),
  ];

  const results = await Promise.all(
    queries.map((q) => fetchItunesSearchTracks(q.term, safeRegion, 12, 'Recommended For You'))
  );

  const excludeSet = new Set(excludeKeys.map((k) => String(k).toLowerCase()));
  const seen = new Set();
  const artistCount = new Map();
  const ranked = [];

  // Interleave candidates across seeds while capping per-artist repetition for a balanced mix
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
    seedsUsed: {
      artists: artistsToQuery,
      genres: genresToQuery,
    },
    updatedAt: new Date().toISOString(),
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Shared HTTP route handler for /api/charts/*, /api/discover-weekly, and /api/recommendations.
 * Returns true if the request matched and was handled; false otherwise.
 */
export async function handleDynamicCatalogRoute(req, res, pathname, url) {
  if (pathname === '/api/charts/top-hits') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const region = url.searchParams.get('region') || 'us';
      const limit = Number(url.searchParams.get('limit') || 25);
      const refresh = url.searchParams.get('refresh') === 'true';
      const payload = await getTopHitsChart({ region, limit, refresh });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'Chart fetch failed' }));
    }
    return true;
  }

  if (pathname === '/api/discover-weekly') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const region = url.searchParams.get('region') || 'us';
      const genresParam = url.searchParams.get('genres') || '';
      const excludeParam = url.searchParams.get('exclude') || '';
      const offset = Number(url.searchParams.get('offset') || 0);
      const genres = genresParam ? genresParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const excludeKeys = excludeParam ? excludeParam.split('|').map((s) => s.trim()).filter(Boolean) : [];
      const payload = await getDiscoverWeekly({ region, genres, excludeKeys, offset });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'Discover Weekly generation failed' }));
    }
    return true;
  }

  if (pathname === '/api/recommendations') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      const seedArtists = Array.isArray(body.seedArtists)
        ? body.seedArtists
        : (url.searchParams.get('artists') || '').split(',').map((s) => s.trim()).filter(Boolean);
      const seedGenres = Array.isArray(body.seedGenres)
        ? body.seedGenres
        : (url.searchParams.get('genres') || '').split(',').map((s) => s.trim()).filter(Boolean);
      const excludeKeys = Array.isArray(body.excludeKeys) ? body.excludeKeys : [];
      const region = body.region || url.searchParams.get('region') || 'us';
      const offset = Number(body.offset || url.searchParams.get('offset') || 0);

      const payload = await getPersonalizedRecommendations({
        seedArtists,
        seedGenres,
        excludeKeys,
        region,
        offset,
      });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'Recommendation generation failed' }));
    }
    return true;
  }

  if (pathname === '/api/search/catalog') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const q = url.searchParams.get('q') || '';
      const region = url.searchParams.get('region') || 'us';
      const payload = await searchFullCatalog({ q, region });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'Catalog search failed' }));
    }
    return true;
  }

  if (pathname === '/api/search/collection') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const id = url.searchParams.get('id') || '';
      const type = url.searchParams.get('type') || 'album';
      const region = url.searchParams.get('region') || 'us';
      const payload = await getCollectionTracks({ id, type, region });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'Collection lookup failed' }));
    }
    return true;
  }

  if (pathname === '/api/about') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const record = readOrInitAboutRecord();
      if (req.method === 'GET') {
        res.end(JSON.stringify({ fields: record.fields, updatedAt: record.updatedAt }));
        return true;
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const submittedCode = String(body?.passcode || '').trim();
        if (!submittedCode || submittedCode !== record.editPasscode) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'Invalid edit passcode' }));
          return true;
        }
        const incoming = body?.fields || {};
        const nextRecord = {
          ...record,
          fields: {
            appName: typeof incoming.appName === 'string' ? incoming.appName : record.fields.appName,
            version: typeof incoming.version === 'string' ? incoming.version : record.fields.version,
            description:
              typeof incoming.description === 'string' ? incoming.description : record.fields.description,
            developerName:
              typeof incoming.developerName === 'string' ? incoming.developerName : record.fields.developerName,
          },
          updatedAt: new Date().toISOString(),
        };
        writeAboutRecord(nextRecord);
        res.end(JSON.stringify({ success: true, fields: nextRecord.fields, updatedAt: nextRecord.updatedAt }));
        return true;
      }
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'About storage error' }));
      return true;
    }
  }

  if (pathname === '/api/about/verify') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      const action = body?.action === 'edit' ? 'edit' : 'view';
      const submittedCode = String(body?.passcode || '').trim();
      const record = readOrInitAboutRecord();
      const expected = action === 'edit' ? record.editPasscode : VIEW_PASSCODE;
      const ok = submittedCode.length > 0 && submittedCode === expected;
      res.end(JSON.stringify({ ok, action }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: err.message || 'Verification failed' }));
    }
    return true;
  }

  return false;
}
