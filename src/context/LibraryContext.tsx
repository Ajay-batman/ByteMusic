import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChartRegion, Track, Playlist } from '../types/spotify';
import { mockTracks, mockPlaylists } from '../data/mockSpotifyCatalog';
import { usePlayback } from './PlaybackContext';
import { apiUrl } from '../config/api';
import {
  CHART_REGIONS,
  computeTasteProfile,
  getCurrentIsoWeekKey,
  TasteProfile,
  trackDedupKey,
} from '../services/tasteProfile';
import {
  fetchDiscoverWeeklyDirect,
  fetchPersonalizedRecommendationsDirect,
  fetchTopHitsDirect,
  shouldPreferServerBackend,
} from '../services/catalogClient';

interface DiscoverWeeklyState {
  weekKey: string;
  offset: number;
  tracks: Track[];
  genresUsed?: string[];
  updatedAt?: string;
}

interface LibraryContextType {
  likedTracks: Track[];
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => void;
  recentlyPlayed: Track[];
  clearRecentlyPlayed: () => void;
  customPlaylists: Playlist[];
  createPlaylist: (name?: string, description?: string, initialTracks?: Track[]) => Playlist;
  addTrackToPlaylist: (playlistId: string, track: Track) => { success: boolean; alreadyExists: boolean };
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  allPlaylists: Playlist[];
  getPlaylistById: (id: string) => Playlist | undefined;

  // Dynamic Today's Top Hits (Regional Charts)
  chartRegion: ChartRegion;
  setChartRegion: (region: ChartRegion) => void;
  topHitsTracks: Track[];
  isLoadingTopHits: boolean;
  refreshTopHits: (regionOverride?: ChartRegion) => Promise<void>;

  // Dynamic Week-Locked Discover Weekly
  discoverWeeklyTracks: Track[];
  discoverWeekKey: string;
  isLoadingDiscover: boolean;
  refreshDiscoverWeekly: () => Promise<void>;

  // Dynamic User Preference Recommendations ("Made For You")
  recommendedTracks: Track[];
  tasteProfile: TasteProfile;
  isLoadingRecommendations: boolean;
  refreshRecommendations: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

const STORAGE_KEYS = {
  LIKED: 'spotify_liked_tracks',
  RECENT: 'spotify_recently_played',
  CUSTOM: 'spotify_custom_playlists',
  REGION: 'spotify_chart_region',
  DISCOVER: 'spotify_discover_weekly',
  SKIPS: 'spotify_skipped_tracks',
  RECS: 'spotify_recommended_cache',
};

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {}
  return fallback;
}

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTrack, isPlaying } = usePlayback();

  // 1. Liked Tracks State
  const [likedTracks, setLikedTracks] = useState<Track[]>(() =>
    readJsonStorage<Track[]>(STORAGE_KEYS.LIKED, mockTracks.slice(0, 3))
  );

  // 2. Recently Played Tracker State
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() =>
    readJsonStorage<Track[]>(STORAGE_KEYS.RECENT, [mockTracks[0]])
  );

  // 3. Custom Playlists State
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() =>
    readJsonStorage<Playlist[]>(STORAGE_KEYS.CUSTOM, [])
  );

  // 4. Skip History Weights
  const [skippedKeys, setSkippedKeys] = useState<Record<string, number>>(() =>
    readJsonStorage<Record<string, number>>(STORAGE_KEYS.SKIPS, {})
  );

  // 5. Regional Chart Selection (Today's Top Hits)
  const [chartRegion, setChartRegionState] = useState<ChartRegion>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REGION) as ChartRegion | null;
      if (saved && CHART_REGIONS.some((r) => r.id === saved)) {
        return saved;
      }
    } catch {}
    return 'us';
  });
  const [topHitsTracks, setTopHitsTracks] = useState<Track[]>(mockTracks);
  const [isLoadingTopHits, setIsLoadingTopHits] = useState<boolean>(false);

  // 6. Week-Locked Discover Weekly State (keeps same tracks for the whole ISO week until manually refreshed)
  const [discoverState, setDiscoverState] = useState<DiscoverWeeklyState>(() =>
    readJsonStorage<DiscoverWeeklyState>(STORAGE_KEYS.DISCOVER, {
      weekKey: '',
      offset: 0,
      tracks: [mockTracks[1], mockTracks[3], mockTracks[4], mockTracks[5], mockTracks[6]],
    })
  );
  const [isLoadingDiscover, setIsLoadingDiscover] = useState<boolean>(false);

  // 7. Personalized Recommendations State
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>(() =>
    readJsonStorage<Track[]>(STORAGE_KEYS.RECS, mockTracks.slice(0, 8))
  );
  const [recOffset, setRecOffset] = useState<number>(0);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const lastFetchedSigRef = useRef<string>('');
  const diskLoadedRef = useRef<boolean>(false);

  // Compute real-time User Taste Profile from Likes, Playlists, History & Skips
  const tasteProfile = useMemo(
    () => computeTasteProfile(likedTracks, recentlyPlayed, customPlaylists, skippedKeys),
    [likedTracks, recentlyPlayed, customPlaylists, skippedKeys]
  );

  // Load persisted library & weekly Discover lock from disk database on desktop/custom server
  useEffect(() => {
    if (!shouldPreferServerBackend()) {
      diskLoadedRef.current = true;
      return;
    }
    fetch(apiUrl('/api/library'))
      .then((res) => res.json())
      .then((data) => {
        diskLoadedRef.current = true;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.likedTracks)) {
            setLikedTracks(data.likedTracks);
            try {
              localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(data.likedTracks));
            } catch {}
          }
          if (Array.isArray(data.recentlyPlayed)) {
            setRecentlyPlayed(data.recentlyPlayed);
            try {
              localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(data.recentlyPlayed));
            } catch {}
          }
          if (Array.isArray(data.customPlaylists)) {
            setCustomPlaylists(data.customPlaylists);
            try {
              localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(data.customPlaylists));
            } catch {}
          }
          if (data.chartRegion && CHART_REGIONS.some((r) => r.id === data.chartRegion)) {
            setChartRegionState(data.chartRegion);
            try {
              localStorage.setItem(STORAGE_KEYS.REGION, data.chartRegion);
            } catch {}
          }
          if (
            data.discoverWeekly &&
            typeof data.discoverWeekly === 'object' &&
            Array.isArray(data.discoverWeekly.tracks) &&
            data.discoverWeekly.tracks.length > 0
          ) {
            setDiscoverState(data.discoverWeekly);
            try {
              localStorage.setItem(STORAGE_KEYS.DISCOVER, JSON.stringify(data.discoverWeekly));
            } catch {}
          }
          if (data.skippedKeys && typeof data.skippedKeys === 'object') {
            setSkippedKeys(data.skippedKeys);
            try {
              localStorage.setItem(STORAGE_KEYS.SKIPS, JSON.stringify(data.skippedKeys));
            } catch {}
          }
        }
      })
      .catch((err) => {
        diskLoadedRef.current = true;
        console.warn('Could not load library from server:', err);
      });
  }, []);

  // Sync persisted library state & Discover Weekly week-lock to disk database when backend is enabled
  useEffect(() => {
    if (!shouldPreferServerBackend()) return;
    const timer = setTimeout(() => {
      try {
        fetch(apiUrl('/api/library'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            likedTracks,
            recentlyPlayed,
            customPlaylists,
            chartRegion,
            discoverWeekly: discoverState,
            skippedKeys,
          }),
        }).catch(() => {});
      } catch {}
    }, 450);

    return () => clearTimeout(timer);
  }, [likedTracks, recentlyPlayed, customPlaylists, chartRegion, discoverState, skippedKeys]);

  // Listen for early track skips from PlaybackContext
  useEffect(() => {
    const handleSkip = (e: Event) => {
      const custom = e as CustomEvent<Track>;
      const track = custom.detail;
      if (!track) return;
      const key = trackDedupKey(track);
      setSkippedKeys((prev) => {
        const next = { ...prev, [key]: (prev[key] || 0) + 1 };
        try {
          localStorage.setItem(STORAGE_KEYS.SKIPS, JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    window.addEventListener('bytemusic-track-skip', handleSkip);
    return () => window.removeEventListener('bytemusic-track-skip', handleSkip);
  }, []);

  // Auto-track recently played songs whenever a song starts playing
  useEffect(() => {
    if (currentTrack && isPlaying) {
      setRecentlyPlayed((prev) => {
        if (prev[0]?.id === currentTrack.id) {
          return prev;
        }
        const filtered = prev.filter((t) => t.id !== currentTrack.id);
        const updated = [
          {
            ...currentTrack,
            addedAt: 'Just now',
          },
          ...filtered,
        ].slice(0, 50);

        try {
          localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [currentTrack?.id, isPlaying]);

  // Fetch Today's Top Hits live for selected region (direct client-side on Android, or backend-with-fallback on Desktop)
  const refreshTopHits = useCallback(
    async (regionOverride?: ChartRegion, bypassCache = false) => {
      const targetRegion = regionOverride || chartRegion;
      setIsLoadingTopHits(true);
      try {
        let data: any = null;
        if (shouldPreferServerBackend()) {
          try {
            const res = await fetch(
              apiUrl(`/api/charts/top-hits?region=${targetRegion}&limit=25${bypassCache ? '&refresh=true' : ''}`)
            );
            if (res.ok) data = await res.json();
          } catch {}
        }
        if (!data || !Array.isArray(data?.tracks) || data.tracks.length === 0) {
          data = await fetchTopHitsDirect({ region: targetRegion, limit: 25, refresh: bypassCache });
        }
        if (Array.isArray(data?.tracks) && data.tracks.length > 0) {
          setTopHitsTracks(data.tracks);
        }
      } catch (err) {
        console.warn('Top Hits fetch failed, keeping fallback tracks:', err);
      } finally {
        setIsLoadingTopHits(false);
      }
    },
    [chartRegion]
  );

  const setChartRegion = useCallback((region: ChartRegion) => {
    setChartRegionState(region);
    try {
      localStorage.setItem(STORAGE_KEYS.REGION, region);
    } catch {}
  }, []);

  useEffect(() => {
    refreshTopHits(chartRegion, false);
  }, [chartRegion, refreshTopHits]);

  // Fetch or keep Discover Weekly (locked for the full ISO week until manually refreshed)
  const fetchDiscoverBatch = useCallback(
    async (nextOffset: number) => {
      setIsLoadingDiscover(true);
      try {
        const excludeKeys = [
          ...likedTracks.map(trackDedupKey),
          ...topHitsTracks.slice(0, 12).map(trackDedupKey),
        ].slice(0, 40);

        let data: any = null;
        if (shouldPreferServerBackend()) {
          try {
            const params = new URLSearchParams({
              region: chartRegion,
              offset: String(nextOffset),
              genres: tasteProfile.topGenres.join(','),
              exclude: excludeKeys.join('|'),
            });
            const res = await fetch(apiUrl(`/api/discover-weekly?${params.toString()}`));
            if (res.ok) data = await res.json();
          } catch {}
        }

        if (!data || !Array.isArray(data?.tracks) || data.tracks.length === 0) {
          data = await fetchDiscoverWeeklyDirect({
            region: chartRegion,
            genres: tasteProfile.topGenres,
            excludeKeys,
            offset: nextOffset,
          });
        }

        if (Array.isArray(data?.tracks) && data.tracks.length > 0) {
          const nextState: DiscoverWeeklyState = {
            weekKey: data.weekKey || getCurrentIsoWeekKey(),
            offset: nextOffset,
            tracks: data.tracks,
            genresUsed: data.genresUsed,
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
          setDiscoverState(nextState);
          try {
            localStorage.setItem(STORAGE_KEYS.DISCOVER, JSON.stringify(nextState));
          } catch {}
        }
      } catch (err) {
        console.warn('Discover Weekly fetch failed:', err);
      } finally {
        setIsLoadingDiscover(false);
      }
    },
    [chartRegion, likedTracks, topHitsTracks, tasteProfile.topGenres]
  );

  // Auto-populate Discover Weekly ONLY if week rolled over or never populated yet
  useEffect(() => {
    const currentWeek = getCurrentIsoWeekKey();
    const isLockedForThisWeek =
      discoverState.weekKey === currentWeek && discoverState.tracks.length > 5;
    if (!isLockedForThisWeek) {
      const timer = setTimeout(() => {
        fetchDiscoverBatch(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [discoverState.weekKey, discoverState.tracks.length, fetchDiscoverBatch]);

  const refreshDiscoverWeekly = useCallback(async () => {
    await fetchDiscoverBatch((discoverState.offset || 0) + 1);
  }, [discoverState.offset, fetchDiscoverBatch]);

  // Fetch Personalized Recommendations ("Made For You") based on Taste Profile
  const fetchRecommendations = useCallback(
    async (offsetVal: number) => {
      setIsLoadingRecommendations(true);
      try {
        const excludeKeys = likedTracks.map(trackDedupKey).slice(0, 50);
        let data: any = null;
        if (shouldPreferServerBackend()) {
          try {
            const res = await fetch(apiUrl('/api/recommendations'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                seedArtists: tasteProfile.topArtists,
                seedGenres: tasteProfile.topGenres,
                excludeKeys,
                region: chartRegion,
                offset: offsetVal,
              }),
            });
            if (res.ok) data = await res.json();
          } catch {}
        }

        if (!data || !Array.isArray(data?.tracks) || data.tracks.length === 0) {
          data = await fetchPersonalizedRecommendationsDirect({
            seedArtists: tasteProfile.topArtists,
            seedGenres: tasteProfile.topGenres,
            excludeKeys,
            region: chartRegion,
            offset: offsetVal,
          });
        }

        if (Array.isArray(data?.tracks) && data.tracks.length > 0) {
          setRecommendedTracks(data.tracks);
          try {
            localStorage.setItem(STORAGE_KEYS.RECS, JSON.stringify(data.tracks));
          } catch {}
        }
      } catch (err) {
        console.warn('Recommendation fetch failed:', err);
      } finally {
        setIsLoadingRecommendations(false);
      }
    },
    [tasteProfile.topArtists, tasteProfile.topGenres, likedTracks, chartRegion]
  );

  // Refresh recommendations gently when Taste Profile signature shifts
  useEffect(() => {
    const sig = `${tasteProfile.signatureKey}::${chartRegion}`;
    if (lastFetchedSigRef.current === sig) return;
    const timer = setTimeout(() => {
      lastFetchedSigRef.current = sig;
      fetchRecommendations(recOffset);
    }, 900);
    return () => clearTimeout(timer);
  }, [tasteProfile.signatureKey, chartRegion, recOffset, fetchRecommendations]);

  const refreshRecommendations = useCallback(async () => {
    const nextOffset = recOffset + 1;
    setRecOffset(nextOffset);
    await fetchRecommendations(nextOffset);
  }, [recOffset, fetchRecommendations]);

  // Is track liked?
  const isLiked = useCallback(
    (trackId: string) => {
      return likedTracks.some((t) => t.id === trackId);
    },
    [likedTracks]
  );

  // Toggle Like status
  const toggleLike = useCallback((track: Track) => {
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      let updated: Track[];
      if (exists) {
        updated = prev.filter((t) => t.id !== track.id);
      } else {
        updated = [{ ...track, addedAt: 'Just now' }, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Clear recently played history
  const clearRecentlyPlayed = useCallback(() => {
    setRecentlyPlayed([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.RECENT);
    } catch {}
  }, []);

  // Create a new playlist
  const createPlaylist = useCallback(
    (name?: string, description?: string, initialTracks: Track[] = []) => {
      const id = `custom-playlist-${Date.now()}`;
      const playlistName = name?.trim() || `My Playlist #${customPlaylists.length + 1}`;
      const newPlaylist: Playlist = {
        id,
        uri: `spotify:playlist:${id}`,
        name: playlistName,
        description: description?.trim() || 'Created by you.',
        owner: { id: 'current-user', displayName: 'You' },
        images: initialTracks[0]?.album.images[0]
          ? [initialTracks[0].album.images[0]]
          : [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop' }],
        tracks: initialTracks.map((t) => ({ ...t, addedAt: 'Just now' })),
      };

      setCustomPlaylists((prev) => {
        const updated = [newPlaylist, ...prev];
        try {
          localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      return newPlaylist;
    },
    [customPlaylists.length]
  );

  // Add track to custom playlist
  const addTrackToPlaylist = useCallback((playlistId: string, track: Track) => {
    let success = false;
    let alreadyExists = false;

    setCustomPlaylists((prev) => {
      const updated = prev.map((pl) => {
        if (pl.id === playlistId) {
          if (pl.tracks.some((t) => t.id === track.id)) {
            alreadyExists = true;
            return pl;
          }
          success = true;
          const newTracks = [{ ...track, addedAt: 'Just now' }, ...pl.tracks];
          const images =
            pl.tracks.length === 0 && track.album.images[0]
              ? [track.album.images[0]]
              : pl.images;
          return {
            ...pl,
            tracks: newTracks,
            images,
          };
        }
        return pl;
      });

      if (success) {
        try {
          localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    return { success, alreadyExists };
  }, []);

  // Remove track from custom playlist
  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setCustomPlaylists((prev) => {
      const updated = prev.map((pl) => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            tracks: pl.tracks.filter((t) => t.id !== trackId),
          };
        }
        return pl;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Delete a custom playlist
  const deletePlaylist = useCallback((playlistId: string) => {
    setCustomPlaylists((prev) => {
      const updated = prev.filter((pl) => pl.id !== playlistId);
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Compute live synthesized playlists (Liked Songs, Recently Played, Custom, Dynamic Charts, Discover Weekly, Made For You)
  const allPlaylists: Playlist[] = useMemo(() => {
    const regionInfo = CHART_REGIONS.find((r) => r.id === chartRegion) || CHART_REGIONS[0];
    const topArtistNames = Array.from(
      new Set(topHitsTracks.slice(0, 3).map((t) => t.artists[0]?.name).filter(Boolean))
    ).join(', ');

    const likedSongsPlaylist: Playlist = {
      id: 'playlist-favorites',
      uri: 'spotify:playlist:user-favorites-playlist',
      name: 'Liked Songs',
      description: 'Your favorite tracks and songs from search and playlists.',
      owner: { id: 'current-user', displayName: 'You' },
      images: [
        { url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop' },
      ],
      tracks: likedTracks,
    };

    const recentlyPlayedPlaylist: Playlist = {
      id: 'playlist-recently-played',
      uri: 'spotify:playlist:recently-played-tracker',
      name: 'Recently Played',
      description: 'Live history tracker of all the songs and tracks you have played.',
      owner: { id: 'current-user', displayName: 'Playback Tracker' },
      images: [
        { url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop' },
      ],
      tracks: recentlyPlayed,
    };

    const madeForYouPlaylist: Playlist = {
      id: 'playlist-recommended-for-you',
      uri: 'spotify:playlist:made-for-you-taste-profile',
      name: 'Made For You',
      description: tasteProfile.summaryText,
      owner: { id: 'spotify', displayName: 'Taste Profile AI' },
      images: [
        recommendedTracks[0]?.album.images[0] || {
          url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
        },
      ],
      tracks: recommendedTracks,
    };

    const todayTopHitsPlaylist: Playlist = {
      id: 'playlist-today-top-hits',
      uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      name: "Today's Top Hits",
      description: topArtistNames
        ? `${regionInfo.label} Charts — Featuring ${topArtistNames} and today's hottest tracks.`
        : `Live Top Charts for ${regionInfo.label}.`,
      owner: { id: 'spotify', displayName: `${regionInfo.shortLabel} Charts` },
      images: [
        topHitsTracks[0]?.album.images[0] || {
          url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
        },
      ],
      tracks: topHitsTracks,
    };

    const activeWeek = discoverState.weekKey || getCurrentIsoWeekKey();
    const discoverWeeklyPlaylist: Playlist = {
      id: 'playlist-discover-weekly',
      uri: 'spotify:playlist:37i9dQZEVXcQ9JaJVvgvxv',
      name: 'Discover Weekly',
      description: `Fresh trending discoveries (${activeWeek}). Locked all week until you tap Refresh Mix.`,
      owner: { id: 'spotify', displayName: `Weekly (${activeWeek})` },
      images: [
        discoverState.tracks[0]?.album.images[0] || {
          url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&h=300&fit=crop',
        },
      ],
      tracks: discoverState.tracks,
    };

    // Remaining curated mock collections (excluding overridden dynamic ones)
    const staticCurated = mockPlaylists.filter(
      (p) =>
        p.id !== 'playlist-favorites' &&
        p.id !== 'playlist-today-top-hits' &&
        p.id !== 'playlist-discover-weekly'
    );

    return [
      likedSongsPlaylist,
      recentlyPlayedPlaylist,
      ...customPlaylists,
      madeForYouPlaylist,
      todayTopHitsPlaylist,
      discoverWeeklyPlaylist,
      ...staticCurated,
    ];
  }, [
    likedTracks,
    recentlyPlayed,
    customPlaylists,
    chartRegion,
    topHitsTracks,
    discoverState,
    recommendedTracks,
    tasteProfile.summaryText,
  ]);

  const getPlaylistById = useCallback(
    (id: string) => {
      return allPlaylists.find((p) => p.id === id);
    },
    [allPlaylists]
  );

  const contextValue = useMemo<LibraryContextType>(
    () => ({
      likedTracks,
      isLiked,
      toggleLike,
      recentlyPlayed,
      clearRecentlyPlayed,
      customPlaylists,
      createPlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      deletePlaylist,
      allPlaylists,
      getPlaylistById,
      chartRegion,
      setChartRegion,
      topHitsTracks,
      isLoadingTopHits,
      refreshTopHits: (regionOverride?: ChartRegion) => refreshTopHits(regionOverride, true),
      discoverWeeklyTracks: discoverState.tracks,
      discoverWeekKey: discoverState.weekKey || getCurrentIsoWeekKey(),
      isLoadingDiscover,
      refreshDiscoverWeekly,
      recommendedTracks,
      tasteProfile,
      isLoadingRecommendations,
      refreshRecommendations,
    }),
    [
      likedTracks,
      isLiked,
      toggleLike,
      recentlyPlayed,
      clearRecentlyPlayed,
      customPlaylists,
      createPlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      deletePlaylist,
      allPlaylists,
      getPlaylistById,
      chartRegion,
      setChartRegion,
      topHitsTracks,
      isLoadingTopHits,
      refreshTopHits,
      discoverState.tracks,
      discoverState.weekKey,
      isLoadingDiscover,
      refreshDiscoverWeekly,
      recommendedTracks,
      tasteProfile,
      isLoadingRecommendations,
      refreshRecommendations,
    ]
  );

  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
