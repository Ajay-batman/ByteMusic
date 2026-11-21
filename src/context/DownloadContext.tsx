import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Track } from '../types/spotify';
import { apiUrl } from '../config/api';

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
const CACHE_NAME = 'spotify-offline-audio';

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
      // 1. Resolve YouTube ID if not present
      let ytId = track.youtubeId;
      const artistName = track.artists[0]?.name || '';
      const cacheKey = `yt_id_${track.name}_${artistName}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

      if (!ytId) {
        ytId = localStorage.getItem(cacheKey) || undefined;
      }

      if (!ytId) {
        const query = `${track.name} ${artistName}`;
        const res = await fetch(apiUrl(`/api/resolve-yt?q=${encodeURIComponent(query)}`));
        const data = await res.json();
        if (data.videoId) {
          ytId = data.videoId;
          try {
            localStorage.setItem(cacheKey, data.videoId);
          } catch {}
          track.youtubeId = data.videoId;
        }
      }

      if (!ytId) {
        throw new Error('Could not resolve audio stream for track: ' + track.name);
      }

      // 2. Prepare filename and download URL
      const filename = `${artistName} - ${track.name}.m4a`.replace(/[\\/:*?"<>|]/g, '_');
      const downloadUrl = apiUrl(`/api/download?id=${encodeURIComponent(ytId)}&filename=${encodeURIComponent(filename)}`);

      // 3. Trigger immediate native browser/device file download
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // 4. Cache audio stream in background for offline playback
      if ('caches' in window) {
        caches.open(CACHE_NAME).then(async (cache) => {
          try {
            const streamRes = await fetch(apiUrl(`/api/stream?id=${encodeURIComponent(ytId!)}`));
            if (streamRes.ok) {
              await cache.put(apiUrl(`/api/stream?id=${encodeURIComponent(ytId!)}`), streamRes);
            }
          } catch {}
        });
      }

      // 5. Save metadata to localStorage for offline library display
      try {
        localStorage.setItem(`spotify_offline_meta_${track.id}`, JSON.stringify(track));
      } catch {}

      // 6. Mark as downloaded
      setDownloadedTrackIds((prev) => new Set(prev).add(track.id));
    } catch (err) {
      console.error('Error downloading track:', err);
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
      const artistName = track.artists[0]?.name || '';
      const cacheKey = `yt_id_${track.name}_${artistName}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const ytId = track.youtubeId || localStorage.getItem(cacheKey);

      if (ytId && 'caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(apiUrl(`/api/stream?id=${encodeURIComponent(ytId)}`));
      }

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

  return (
    <DownloadContext.Provider
      value={{
        downloadedTrackIds,
        downloadingTrackIds,
        downloadTrack,
        removeDownload,
        isDownloaded,
        isDownloading,
        downloadPlaylist,
      }}
    >
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
