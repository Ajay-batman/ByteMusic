import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Track, AudioQuality } from '../types/spotify';
import { mockTracks } from '../data/mockSpotifyCatalog';
import { apiUrl } from '../config/api';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    NativeMediaBridge?: {
      updateMetadata: (title: string, artist: string, album: string, imageUrl: string, durationMs: number, positionMs: number, isPlaying: boolean) => void;
      updatePlaybackState?: (isPlaying: boolean, positionMs: number) => void;
    };
  }
}

export interface PlaybackContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  audioQuality: AudioQuality;
  setAudioQuality: (quality: AudioQuality) => void;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (ms: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

export interface PlaybackProgressContextType {
  progressMs: number;
  durationMs: number;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);
const PlaybackProgressContext = createContext<PlaybackProgressContextType>({
  progressMs: 0,
  durationMs: 0,
});

/**
 * PlaybackProgressProvider
 * High-frequency 250ms ticker provider.
 * Isolated from PlaybackContext to prevent full-tree re-render storms during audio playback.
 */
const PlaybackProgressProvider: React.FC<{
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  ytPlayerRef: React.RefObject<any>;
  currentTrack: Track | null;
  children: React.ReactNode;
}> = ({ isPlaying, audioRef, ytPlayerRef, currentTrack, children }) => {
  const [progressMs, setProgressMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(currentTrack?.duration.milliseconds || 0);

  // Sync track duration and reset progress on track change
  useEffect(() => {
    if (currentTrack) {
      setProgressMs(0);
      setDurationMs(currentTrack.duration.milliseconds);
    }
  }, [currentTrack]);

  // Listen for internal seek updates
  useEffect(() => {
    const handleSeek = (e: CustomEvent<number>) => {
      if (typeof e.detail === 'number') {
        setProgressMs(e.detail);
      }
    };
    window.addEventListener('bytemusic-internal-seek' as any, handleSeek);
    return () => window.removeEventListener('bytemusic-internal-seek' as any, handleSeek);
  }, []);

  // 250ms high-frequency time tracking interval (runs ONLY inside this provider)
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        if (audioRef.current && audioRef.current.src && !audioRef.current.paused) {
          setProgressMs(Math.floor(audioRef.current.currentTime * 1000));
          if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setDurationMs(Math.floor(audioRef.current.duration * 1000));
          }
          return;
        }

        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const sec = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            setProgressMs(Math.floor(sec * 1000));
            if (dur > 0) {
              setDurationMs(Math.floor(dur * 1000));
            }
          } catch {}
        }
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, audioRef, ytPlayerRef]);

  const progressValue = useMemo(() => ({ progressMs, durationMs }), [progressMs, durationMs]);

  return (
    <PlaybackProgressContext.Provider value={progressValue}>
      {children}
    </PlaybackProgressContext.Provider>
  );
};

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(mockTracks[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [audioQuality, setAudioQualityState] = useState<AudioQuality>('very_high');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const pendingVideoIdRef = useRef<string | null>(null);
  const userIntentPlayingRef = useRef<boolean>(false);
  const currentTrackRef = useRef<Track | null>(mockTracks[0]);
  const queueRef = useRef<Track[]>(mockTracks);
  const repeatModeRef = useRef<'off' | 'all' | 'one'>(repeatMode);
  const currentBlobUrlRef = useRef<string | null>(null);
  const playRequestIdRef = useRef<number>(0);

  // Keep state refs in sync
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // Clean up cached blob URLs to prevent JS Heap / Graphics memory bloat
  const cleanupBlobUrl = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupBlobUrl();
    };
  }, [cleanupBlobUrl]);

  const seekInternal = useCallback((ms: number) => {
    window.dispatchEvent(new CustomEvent('bytemusic-internal-seek', { detail: ms }));
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = ms / 1000;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(ms / 1000, true);
      } catch {}
    }
    if (window.NativeMediaBridge && typeof window.NativeMediaBridge.updatePlaybackState === 'function') {
      try {
        window.NativeMediaBridge.updatePlaybackState(userIntentPlayingRef.current, Math.round(ms));
      } catch {}
    }
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && currentTrackRef.current) {
      try {
        const durSec = (currentTrackRef.current.duration?.milliseconds || 0) / 1000;
        if (durSec > 0) {
          navigator.mediaSession.setPositionState({
            duration: durSec,
            playbackRate: 1.0,
            position: Math.min(Math.max(0, ms / 1000), durSec),
          });
        }
      } catch {}
    }
  }, []);

  const resumeInternal = useCallback(() => {
    userIntentPlayingRef.current = true;
    if (audioRef.current && audioRef.current.src && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
      try {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      } catch {}
    }
  }, []);

  const pauseInternal = useCallback(() => {
    userIntentPlayingRef.current = false;
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {}
    }
    setIsPlaying(false);
  }, []);

  // Master PlayTrack: Plays 100% FULL Song via YouTube IFrame Engine (or Offline Cache)
  const playTrackInternal = useCallback((track: Track, newQueue?: Track[]) => {
    const playRequestId = ++playRequestIdRef.current;

    if (newQueue && newQueue.length > 0) {
      queueRef.current = newQueue;
    }
    currentTrackRef.current = track;
    setCurrentTrack(track);
    setIsLoading(true);
    window.dispatchEvent(new CustomEvent('bytemusic-internal-seek', { detail: 0 }));

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const startPlayback = (ytId: string) => {
      cleanupBlobUrl();
      if (audioRef.current) {
        audioRef.current.src = '';
      }
      userIntentPlayingRef.current = true;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        ytPlayerRef.current.loadVideoById(ytId);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        setIsLoading(false);
      } else {
        pendingVideoIdRef.current = ytId;
        setIsLoading(true);
      }
    };

    // 1. Check Offline Cache first (for downloaded tracks)
    (async () => {
      try {
        if ('caches' in window) {
          const cache = await caches.open('spotify-offline-audio');
          const cachedRes = await cache.match(apiUrl(`/api/stream?id=${encodeURIComponent(track.youtubeId || '')}`));
          if (cachedRes && audioRef.current) {
            if (playRequestId !== playRequestIdRef.current) return;
            const blob = await cachedRes.blob();
            cleanupBlobUrl();
            const blobUrl = URL.createObjectURL(blob);
            currentBlobUrlRef.current = blobUrl;
            audioRef.current.src = blobUrl;
            audioRef.current.load();
            await audioRef.current.play();
            setIsPlaying(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Offline cache lookup error:', e);
      }

      if (playRequestId !== playRequestIdRef.current) return;

      // 2. Use track.youtubeId or cached ID in localStorage
      const artistName = track.artists[0]?.name || '';
      const cacheKey = `yt_id_${track.name}_${artistName}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const cachedYtId = track.youtubeId || localStorage.getItem(cacheKey);

      if (cachedYtId) {
        startPlayback(cachedYtId);
        return;
      }

      // 3. Resolve via server /api/resolve-yt
      const query = `${track.name} ${artistName}`;
      fetch(apiUrl(`/api/resolve-yt?q=${encodeURIComponent(query)}`))
        .then((res) => res.json())
        .then((data) => {
          if (playRequestId !== playRequestIdRef.current) return;
          if (data.videoId) {
            try {
              localStorage.setItem(cacheKey, data.videoId);
            } catch {}
            track.youtubeId = data.videoId;
            if (currentTrackRef.current?.id === track.id) {
              startPlayback(data.videoId);
            }
          } else {
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (playRequestId !== playRequestIdRef.current) return;
          console.warn('Failed to resolve song ID:', err);
          setIsLoading(false);
        });
    })();
  }, [cleanupBlobUrl]);

  const handleNextTrackInternal = useCallback(() => {
    const q = queueRef.current.length > 0 ? queueRef.current : mockTracks;
    const current = currentTrackRef.current;
    if (!current) return;

    if (repeatModeRef.current === 'one') {
      seekInternal(0);
      resumeInternal();
      return;
    }

    const currentIndex = q.findIndex((t) => t.id === current.id);
    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % q.length;
    }
    const nextItem = q[nextIndex];
    if (nextItem) {
      playTrackInternal(nextItem);
    }
  }, [seekInternal, resumeInternal, playTrackInternal]);

  const handlePrevTrackInternal = useCallback(() => {
    const q = queueRef.current.length > 0 ? queueRef.current : mockTracks;
    const current = currentTrackRef.current;
    if (!current) return;

    const currentIndex = q.findIndex((t) => t.id === current.id);
    let prevIndex = 0;
    if (currentIndex !== -1) {
      prevIndex = (currentIndex - 1 + q.length) % q.length;
    }
    const prevItem = q[prevIndex];
    if (prevItem) {
      playTrackInternal(prevItem);
    }
  }, [playTrackInternal]);

  // Initialize Native HTML5 Audio for offline blob caching
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleEnded = () => {
      setIsLoading(false);
      handleNextTrackInternal();
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleNextTrackInternal]);

  // MASTER: Initialize Official YouTube IFrame Player (100% Full Song, Zero Bot Gate)
  useEffect(() => {
    const initYT = () => {
      if (ytPlayerRef.current || !window.YT || !window.YT.Player) return;
      try {
        ytPlayerRef.current = new window.YT.Player('bytemusic-yt-player', {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
            origin: (window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'https://localhost',
          },
          events: {
            onReady: (event: any) => {
              ytPlayerRef.current = event.target;
              isYtReadyRef.current = true;
              if (pendingVideoIdRef.current) {
                event.target.loadVideoById(pendingVideoIdRef.current);
                event.target.playVideo();
                pendingVideoIdRef.current = null;
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 1) { // PLAYING
                userIntentPlayingRef.current = true;
                setIsPlaying(true);
                setIsLoading(false);
              } else if (event.data === 2) { // PAUSED
                if (userIntentPlayingRef.current) {
                  // Involuntary pause caused by Android backgrounding/screen lock: auto-resume immediately without gap
                  if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
                    try {
                      ytPlayerRef.current.playVideo();
                    } catch {}
                  }
                  setTimeout(() => {
                    if (userIntentPlayingRef.current && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
                      try {
                        ytPlayerRef.current.playVideo();
                      } catch {}
                    }
                  }, 0);
                } else {
                  setIsPlaying(false);
                }
              } else if (event.data === 3) { // BUFFERING
                setIsLoading(true);
              } else if (event.data === 0) { // ENDED
                setIsPlaying(false);
                userIntentPlayingRef.current = false;
                handleNextTrackInternal();
              }
            },
            onError: (err: any) => {
              console.warn('YouTube IFrame player error:', err);
              setIsLoading(false);
            },
          },
        });
      } catch (e) {
        console.warn('Failed to initialize YouTube IFrame player:', e);
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initYT();
      };
    }
  }, [handleNextTrackInternal]);

  // Volume Sync
  useEffect(() => {
    const volLevel = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = volLevel;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(Math.round(volLevel * 100));
      } catch {}
    }
  }, [volume, isMuted]);

  // System MediaSession API for Native Lockscreen & Notification Controls
  // Optimized: Removed progressMs dependency to prevent MediaMetadata recreation 4 times/sec
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artists.map((a) => a.name).join(', '),
        album: currentTrack.album.name,
        artwork: [
          {
            src: currentTrack.album.images[0]?.url || '/spotify.ico',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      try {
        navigator.mediaSession.setActionHandler('play', () => {
          resumeInternal();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          pauseInternal();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlePrevTrackInternal();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handleNextTrackInternal();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            seekInternal(details.seekTime * 1000);
          }
        });
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          const curTime = (audioRef.current?.currentTime || ytPlayerRef.current?.getCurrentTime?.() || 0) * 1000;
          seekInternal(Math.max(0, curTime - 10000));
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
          const curTime = (audioRef.current?.currentTime || ytPlayerRef.current?.getCurrentTime?.() || 0) * 1000;
          const dur = currentTrack.duration.milliseconds;
          seekInternal(Math.min(dur, curTime + 10000));
        });
      } catch (e) {
        console.warn('MediaSession handler error:', e);
      }
    }
  }, [currentTrack, isPlaying, resumeInternal, pauseInternal, handlePrevTrackInternal, handleNextTrackInternal, seekInternal]);

  // Sync with Native Android MediaSession (Lock Screen & Notification Panel)
  useEffect(() => {
    if (currentTrack && window.NativeMediaBridge && typeof window.NativeMediaBridge.updateMetadata === 'function') {
      try {
        const imgUrl = currentTrack.album?.images?.[0]?.url || '';
        const dur = currentTrack.duration?.milliseconds || 0;
        window.NativeMediaBridge.updateMetadata(
          currentTrack.name,
          currentTrack.artists.map((a) => a.name).join(', '),
          currentTrack.album.name,
          imgUrl,
          dur,
          0,
          isPlaying
        );
      } catch (e) {
        console.warn('Failed to update native media bridge:', e);
      }
    }
  }, [currentTrack, isPlaying]);

  const togglePlay = useCallback(() => {
    if (audioRef.current && audioRef.current.src && !audioRef.current.paused) {
      pauseInternal();
      return;
    }
    if (audioRef.current && audioRef.current.src && audioRef.current.paused && audioRef.current.currentTime > 0) {
      resumeInternal();
      return;
    }

    if (ytPlayerRef.current) {
      if (isPlaying) {
        pauseInternal();
      } else {
        resumeInternal();
      }
    } else if (currentTrackRef.current) {
      playTrackInternal(currentTrackRef.current);
    }
  }, [isPlaying, pauseInternal, resumeInternal, playTrackInternal]);

  // Listen for Native Android Lock Screen & Notification Action Commands
  useEffect(() => {
    const executeAction = (action: string) => {
      if (action === 'toggle') {
        togglePlay();
      } else if (action === 'play') {
        resumeInternal();
      } else if (action === 'pause') {
        pauseInternal();
      } else if (action === 'next') {
        handleNextTrackInternal();
      } else if (action === 'prev') {
        handlePrevTrackInternal();
      }
    };

    (window as any).bytemusic_mediaAction = executeAction;

    const handleNativeMediaAction = (event: any) => {
      const action = event?.detail;
      if (action) {
        executeAction(action);
      }
    };

    (window as any).bytemusic_mediaSeek = (positionMs: number) => {
      seekInternal(positionMs);
    };

    const handleNativeMediaSeek = (event: any) => {
      const pos = event?.detail;
      if (typeof pos === 'number') {
        seekInternal(pos);
      }
    };

    window.addEventListener('bytemusic-media-action', handleNativeMediaAction);
    window.addEventListener('bytemusic-media-seek', handleNativeMediaSeek);
    return () => {
      delete (window as any).bytemusic_mediaAction;
      delete (window as any).bytemusic_mediaSeek;
      window.removeEventListener('bytemusic-media-action', handleNativeMediaAction);
      window.removeEventListener('bytemusic-media-seek', handleNativeMediaSeek);
    };
  }, [togglePlay, pauseInternal, resumeInternal, handleNextTrackInternal, handlePrevTrackInternal, seekInternal]);

  const pause = useCallback(() => {
    pauseInternal();
  }, [pauseInternal]);

  const resume = useCallback(() => {
    resumeInternal();
  }, [resumeInternal]);

  const seek = useCallback((ms: number) => {
    seekInternal(ms);
  }, [seekInternal]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (isMuted && val > 0) setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(isMuted ? 0 : Math.round(clamped * 100));
      } catch {}
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (ytPlayerRef.current) {
        try {
          if (next) {
            ytPlayerRef.current.mute();
          } else {
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.setVolume(Math.round(volume * 100));
          }
        } catch {}
      }
      return next;
    });
  }, [volume]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const setAudioQuality = useCallback((quality: AudioQuality) => {
    setAudioQualityState(quality);
  }, []);

  // Memoized low-frequency playback context value
  const playbackContextValue = useMemo<PlaybackContextType>(
    () => ({
      currentTrack,
      isPlaying,
      isLoading,
      volume: isMuted ? 0 : volume,
      isMuted,
      isShuffle,
      repeatMode,
      audioQuality,
      setAudioQuality,
      playTrack: playTrackInternal,
      togglePlay,
      pause,
      resume,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
      nextTrack: handleNextTrackInternal,
      prevTrack: handlePrevTrackInternal,
    }),
    [
      currentTrack,
      isPlaying,
      isLoading,
      volume,
      isMuted,
      isShuffle,
      repeatMode,
      audioQuality,
      setAudioQuality,
      playTrackInternal,
      togglePlay,
      pause,
      resume,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
      handleNextTrackInternal,
      handlePrevTrackInternal,
    ]
  );

  return (
    <PlaybackContext.Provider value={playbackContextValue}>
      <PlaybackProgressProvider
        isPlaying={isPlaying}
        audioRef={audioRef}
        ytPlayerRef={ytPlayerRef}
        currentTrack={currentTrack}
      >
        {children}
      </PlaybackProgressProvider>
      {/* Hidden Official YouTube IFrame Player (kept in active viewport to prevent Chromium compositor suspension) */}
      <div
        id="bytemusic-yt-player-container"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: 1,
          height: 1,
          opacity: 0.001,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: -1,
        }}
      >
        <div id="bytemusic-yt-player" />
      </div>
    </PlaybackContext.Provider>
  );
};

export const usePlayback = (): PlaybackContextType => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};

export const usePlaybackProgress = (): PlaybackProgressContextType => {
  return useContext(PlaybackProgressContext);
};
