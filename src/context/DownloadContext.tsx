import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Track } from '../types/spotify';

interface DownloadContextType {
  downloadedTrackIds: Set<string>;
  downloadingTrackIds: Set<string>;
  downloadTrack: (track: Track) => Promise<void>;
  removeDownload: (track: Track) => Promise<void>;
  isDownloaded: (trackId: string) => boolean;
  isDownloading: (trackId: string) => boolean;
  downloadPlaylist: (tracks: Track[]) => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | null>(null);

const STORAGE_KEY = 'spotify_downloaded_ids';

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloadedTrackIds, setDownloadedTrackIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [downloadingTrackIds, setDownloadingTrackIds] = useState<Set<string>>(new Set());

  // Save to localStorage whenever downloadedTrackIds change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(downloadedTrackIds)));
    } catch (e) {
      console.warn('Failed to save downloaded track IDs to localStorage:', e);
    }
  }, [downloadedTrackIds]);

  const isDownloaded = useCallback(
    (trackId: string) => downloadedTrackIds.has(trackId),
    [downloadedTrackIds]
  );

  const isDownloading = useCallback(
    (trackId: string) => downloadingTrackIds.has(trackId),
    [downloadingTrackIds]
  );

  const downloadTrack = useCallback(async (track: Track) => {
    if (downloadedTrackIds.has(track.id) || downloadingTrackIds.has(track.id)) {
      return;
    }

    setDownloadingTrackIds((prev) => new Set(prev).add(track.id));

    try {
      // 1. Resolve and cache YouTube ID locally
      let ytId = track.youtubeId;
      const artistName = track.artists[0]?.name || '';
      const cacheKey = `yt_id_${track.name}_${artistName}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

      if (!ytId) {
        ytId = localStorage.getItem(cacheKey) || undefined;
      }

      if (ytId) {
        try {
          localStorage.setItem(cacheKey, ytId);
        } catch {}
      }

      // 2. Save metadata to localStorage for offline library display
      try {
        localStorage.setItem(`spotify_offline_meta_${track.id}`, JSON.stringify(track));
      } catch {}

      // 3. Mark as downloaded
      setDownloadedTrackIds((prev) => new Set(prev).add(track.id));
    } catch (err) {
      console.error('Error saving offline track:', err);
    } finally {
      setDownloadingTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  }, [downloadedTrackIds, downloadingTrackIds]);

  const removeDownload = useCallback(async (track: Track) => {
    try {
      localStorage.removeItem(`spotify_offline_meta_${track.id}`);

      setDownloadedTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    } catch (err) {
      console.warn('Failed to remove download:', err);
    }
  }, []);

  const downloadPlaylist = useCallback(async (tracks: Track[]) => {
    for (const t of tracks) {
      if (!downloadedTrackIds.has(t.id)) {
        await downloadTrack(t);
      }
    }
  }, [downloadedTrackIds, downloadTrack]);

  const contextValue = useMemo<DownloadContextType>(
    () => ({
      downloadedTrackIds,
      downloadingTrackIds,
      downloadTrack,
      removeDownload,
      isDownloaded,
      isDownloading,
      downloadPlaylist,
    }),
    [
      downloadedTrackIds,
      downloadingTrackIds,
      downloadTrack,
      removeDownload,
      isDownloaded,
      isDownloading,
      downloadPlaylist,
    ]
  );

  return (
    <DownloadContext.Provider value={contextValue}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = (): DownloadContextType => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
};
