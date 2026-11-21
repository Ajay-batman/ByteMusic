import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track, PlaybackState, AudioQuality } from '../types/spotify';
import { mockTracks } from '../data/mockSpotifyCatalog';
import { apiUrl } from '../config/api';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface PlaybackContextType extends PlaybackState {
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
  setAudioQuality: (quality: AudioQuality) => void;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(mockTracks[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressMs, setProgressMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(mockTracks[0].duration.milliseconds);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [audioQuality, setAudioQualityState] = useState<AudioQuality>('very_high');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const pendingVideoIdRef = useRef<string | null>(null);
  const currentTrackRef = useRef<Track | null>(mockTracks[0]);
  const queueRef = useRef<Track[]>(mockTracks);
  const repeatModeRef = useRef<'off' | 'all' | 'one'>(repeatMode);

  // Keep state refs in sync
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const seekInternal = (ms: number) => {
    setProgressMs(ms);
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = ms / 1000;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(ms / 1000, true);
      } catch {}
    }
  };

  const resumeInternal = () => {
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
  };

  const pauseInternal = useCallback(() => {
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
  }, []);

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
  }, []);

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
                setIsPlaying(true);
                setIsLoading(false);
              } else if (event.data === 2) { // PAUSED
                setIsPlaying(false);
              } else if (event.data === 3) { // BUFFERING
                setIsLoading(true);
              } else if (event.data === 0) { // ENDED
                setIsPlaying(false);
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

  // High-Precision Time Tracking Interval
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
  }, [isPlaying]);

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
          seekInternal(Math.max(0, progressMs - 10000));
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
          seekInternal(Math.min(durationMs, progressMs + 10000));
        });
      } catch (e) {
        console.warn('MediaSession handler error:', e);
      }

      if ('setPositionState' in navigator.mediaSession && durationMs > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(0, durationMs / 1000),
            playbackRate: 1.0,
            position: Math.min(Math.max(0, progressMs / 1000), durationMs / 1000),
          });
        } catch {}
      }
    }
  }, [currentTrack, isPlaying, durationMs, progressMs, handleNextTrackInternal, handlePrevTrackInternal]);

  // Master PlayTrack: Plays 100% FULL Song via YouTube IFrame Engine (or Offline Cache)
  const playTrackInternal = useCallback((track: Track, newQueue?: Track[]) => {
    if (newQueue && newQueue.length > 0) {
      queueRef.current = newQueue;
    }
    currentTrackRef.current = track;
    setCurrentTrack(track);
    setDurationMs(track.duration.milliseconds);
    setProgressMs(0);
    setIsLoading(true);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const startPlayback = (ytId: string) => {
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
            const blob = await cachedRes.blob();
            audioRef.current.src = URL.createObjectURL(blob);
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
          console.warn('Failed to resolve song ID:', err);
          setIsLoading(false);
        });
    })();
  }, []);

  const togglePlay = useCallback(() => {
    if (audioRef.current && audioRef.current.src && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (audioRef.current && audioRef.current.src && audioRef.current.paused && audioRef.current.currentTime > 0) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    if (ytPlayerRef.current) {
      if (isPlaying) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
        setIsPlaying(false);
      } else {
        try {
          const videoUrl = typeof ytPlayerRef.current.getVideoUrl === 'function' ? ytPlayerRef.current.getVideoUrl() : null;
          if (!videoUrl && currentTrackRef.current) {
            playTrackInternal(currentTrackRef.current);
            return;
          }
          ytPlayerRef.current.playVideo();
        } catch {
          if (currentTrackRef.current) {
            playTrackInternal(currentTrackRef.current);
            return;
          }
        }
        setIsPlaying(true);
      }
    } else if (currentTrackRef.current) {
      playTrackInternal(currentTrackRef.current);
    }
  }, [isPlaying, playTrackInternal]);

  const pause = useCallback(() => {
    pauseInternal();
  }, [pauseInternal]);

  const resume = useCallback(() => {
    resumeInternal();
  }, []);

  const seek = useCallback((ms: number) => {
    seekInternal(ms);
  }, []);

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

  return (
    <PlaybackContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        progressMs,
        durationMs,
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
      }}
    >
      {children}
      {/* Hidden Official YouTube IFrame Player */}
      <div
        id="bytemusic-yt-player-container"
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 200,
          height: 200,
          opacity: 0.01,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: -9999,
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
