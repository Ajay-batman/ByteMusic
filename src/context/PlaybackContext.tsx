import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track, PlaybackState, AudioQuality } from '../types/spotify';
import { mockTracks } from '../data/mockSpotifyCatalog';
import { apiUrl } from '../config/api';

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

  // Forward declarations for player event hooks
  const seekInternal = (ms: number) => {
    setProgressMs(ms);
    if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000;
    }
  };

  const resumeInternal = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
  };

  const pauseInternal = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
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

  // Initialize Native HTML5 Audio Engine for 100% Mobile Background Playback
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.currentTime) {
        setProgressMs(Math.floor(audio.currentTime * 1000));
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDurationMs(Math.floor(audio.duration * 1000));
      }
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsLoading(false);
      handleNextTrackInternal();
    };

    const handleError = () => {
      console.warn('Native audio stream error');
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleNextTrackInternal]);

  // Sync Volume
  useEffect(() => {
    const volLevel = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = volLevel;
    }
  }, [volume, isMuted]);

  // MASTER: Navigator MediaSession API (Native Lock-screen & Notification Controls)
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

  // Master PlayTrack function: Streams FULL YouTube Audio through Native HTML5 Audio
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

    const startStream = async (ytId: string) => {
      if (audioRef.current) {
        const streamUri = apiUrl(`/api/stream?id=${encodeURIComponent(ytId)}`);
        try {
          if ('caches' in window) {
            const cache = await caches.open('spotify-offline-audio');
            const cachedRes = await cache.match(streamUri);
            if (cachedRes) {
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
          console.warn('Offline cache lookup error, falling back to stream:', e);
        }

        audioRef.current.src = streamUri;
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((err) => {
            console.warn('Auto-play blocked or stream error:', err);
            setIsLoading(false);
          });
      }
    };

    const artistName = track.artists[0]?.name || '';
    const cacheKey = `yt_id_${track.name}_${artistName}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cachedYtId = track.youtubeId || localStorage.getItem(cacheKey);

    if (cachedYtId) {
      startStream(cachedYtId);
      return;
    }

    // Resolve full YouTube song via resolver
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
            startStream(data.videoId);
          }
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to resolve YouTube audio:', err);
        setIsLoading(false);
      });
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseInternal();
    } else {
      resumeInternal();
    }
  }, [isPlaying, pauseInternal]);

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
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

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
