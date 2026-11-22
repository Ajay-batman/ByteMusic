import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Track, Playlist } from '../types/spotify';
import { mockTracks, mockPlaylists } from '../data/mockSpotifyCatalog';
import { usePlayback } from './PlaybackContext';
import { apiUrl } from '../config/api';

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
}

const LibraryContext = createContext<LibraryContextType | null>(null);

const STORAGE_KEYS = {
  LIKED: 'spotify_liked_tracks',
  RECENT: 'spotify_recently_played',
  CUSTOM: 'spotify_custom_playlists',
};

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTrack, isPlaying } = usePlayback();

  // 1. Liked Tracks State
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LIKED);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load liked tracks from localStorage:', e);
    }
    // Default seed with first 3 mock tracks
    return mockTracks.slice(0, 3);
  });

  // 2. Recently Played Tracker State
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECENT);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load recently played from localStorage:', e);
    }
    return [mockTracks[0]];
  });

  // 3. Custom Playlists State
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load custom playlists from localStorage:', e);
    }
    return [];
  });

  // Load from disk database on initial mount
  useEffect(() => {
    fetch(apiUrl('/api/library'))
      .then((res) => res.json())
      .then((data) => {
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
        }
      })
      .catch((err) => {
        console.warn('Could not load library from server:', err);
      });
  }, []);

  // Sync to disk database whenever state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        fetch(apiUrl('/api/library'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            likedTracks,
            recentlyPlayed,
            customPlaylists,
          }),
        }).catch(() => {});
      } catch {}
    }, 400);

    return () => clearTimeout(timer);
  }, [likedTracks, recentlyPlayed, customPlaylists]);

  // Auto-track recently played songs whenever a song starts playing
  useEffect(() => {
    if (currentTrack && isPlaying) {
      setRecentlyPlayed((prev) => {
        // If the current track is already the top recently played track, do nothing
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
        ].slice(0, 50); // Keep last 50 songs

        try {
          localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [currentTrack?.id, isPlaying]);

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

  // Compute live synthesized playlists (Liked Songs, Recently Played, Custom, Built-in)
  const allPlaylists: Playlist[] = useMemo(() => {
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

    // Built-in public catalogs
    const builtIn = mockPlaylists.filter((p) => p.id !== 'playlist-favorites');

    return [
      likedSongsPlaylist,
      recentlyPlayedPlaylist,
      ...customPlaylists,
      ...builtIn,
    ];
  }, [likedTracks, recentlyPlayed, customPlaylists]);

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
