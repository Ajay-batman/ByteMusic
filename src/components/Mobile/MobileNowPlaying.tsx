import React, { useState, useRef, useCallback } from 'react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { LiquidGlassSlider } from '../Common/LiquidGlassSlider';
import { DownloadButton } from '../Common/DownloadButton';
import { AudioQuality } from '../../types/spotify';
import { mockTracks } from '../../data/mockSpotifyCatalog';
import { VelvetMetaballFullPlayer } from '../Velvet/VelvetMetaballPlayer';
import {
  ChevronDown,
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Sliders,
  Check,
  Loader2,
  MoreVertical,
  ListMusic,
  X,
} from 'lucide-react';

interface MobileNowPlayingProps {
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Screen 1 Audio Waveform Visualizer Scrubber.
 * Features ~40 dynamic vertical bars matching the uploaded design reference.
 * Played bars shine solid glowing white; unplayed bars are translucent frosted white.
 */
const WAVEFORM_HEIGHTS = [
  12, 16, 22, 16, 26, 36, 22, 16, 30, 42, 34, 18, 24, 34, 46, 30, 20, 16, 24, 38,
  44, 28, 20, 32, 42, 26, 18, 28, 42, 36, 20, 26, 38, 20, 16, 12, 20, 30, 22, 14
];

const WaveformAudioScrubber: React.FC<{ seek: (ms: number) => void }> = React.memo(({ seek }) => {
  const { progressMs, durationMs } = usePlaybackProgress();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  const currentPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;
  const activePercent = isDragging && dragPercent !== null ? dragPercent : currentPercent;

  const calculatePercent = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    return Math.min(Math.max(raw, 0), 100);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const pct = calculatePercent(e.clientX);
    setDragPercent(pct);
    seek((pct / 100) * (durationMs || 1));
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const pct = calculatePercent(e.clientX);
    setDragPercent(pct);
    seek((pct / 100) * (durationMs || 1));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragPercent(null);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const totalBars = WAVEFORM_HEIGHTS.length;

  return (
    <div className="w-full flex flex-col gap-2 select-none touch-none px-1">
      {/* Waveform Bar Container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-14 flex items-center justify-between gap-[3px] sm:gap-1 cursor-pointer py-1 relative group"
        title="Click or drag across audio soundwave to seek"
      >
        {WAVEFORM_HEIGHTS.map((height, i) => {
          const barPercent = (i / (totalBars - 1)) * 100;
          const isPlayed = barPercent <= activePercent;

          return (
            <div
              key={i}
              style={{ height: `${height}px` }}
              className={`flex-1 min-w-[2.5px] max-w-[6px] rounded-full transition-all duration-75 ${
                isPlayed
                  ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)] scale-y-105'
                  : 'bg-white/25 group-hover:bg-white/35'
              }`}
            />
          );
        })}
      </div>

      {/* Timestamps */}
      <div className="flex items-center justify-between text-xs font-semibold text-white/70 px-1 font-sans">
        <span>{formatDuration(progressMs)}</span>
        <span>{formatDuration(durationMs)}</span>
      </div>
    </div>
  );
});

/**
 * Standard Scrubber Slider for Classic & Velvet & Lime Themes.
 */
const NowPlayingProgressBar: React.FC<{ seek: (ms: number) => void }> = React.memo(({ seek }) => {
  const { progressMs, durationMs } = usePlaybackProgress();
  const { isVelvetLime } = useTheme();
  const remainingMs = Math.max(0, (durationMs || 0) - progressMs);

  return (
    <div className="flex flex-col gap-1 w-full">
      <LiquidGlassSlider
        value={progressMs}
        min={0}
        max={durationMs || 1}
        onChange={(newMs) => seek(newMs)}
        formatTooltip={(ms) => formatDuration(ms)}
        accentColor={isVelvetLime ? '#D2F843' : undefined}
      />
      <div className={`flex items-center justify-between text-xs px-1 ${
        isVelvetLime ? 'font-sans font-medium text-white/50' : 'font-mono text-[#b3b3b3]'
      }`}>
        <span>{formatDuration(progressMs)}</span>
        <span>{isVelvetLime ? `-${formatDuration(remainingMs)}` : formatDuration(durationMs)}</span>
      </div>
    </div>
  );
});

export const MobileNowPlaying: React.FC<MobileNowPlayingProps> = ({ onClose }) => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    isShuffle,
    repeatMode,
    audioQuality,
    setAudioQuality,
    togglePlay,
    playTrack,
    seek,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    prevTrack,
  } = usePlayback();

  const { isLiked, toggleLike } = useLibrary();
  const { isLiquidGlass, isVelvetLime, isUltraviolet, isVelvetStyle, currentThemeDef } = useTheme();
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const albumCoverUrl = currentTrack.album.images[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';

  // Cosmic Ultraviolet Layout (Matching Screen 1 "Now Playing" from Reference Image)
  if (isUltraviolet) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/80 md:backdrop-blur-2xl animate-in fade-in duration-200 select-none">
        {/* Backdrop dismiss for desktop */}
        <div className="hidden md:block absolute inset-0 cursor-pointer" onClick={onClose} />

        <div className="w-full md:max-w-md h-full md:h-[92vh] md:max-h-[820px] md:rounded-[36px] md:border md:border-white/20 glass-player shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col justify-between p-6 relative overflow-hidden cosmic-now-playing-bg text-white z-10">
          {/* Top Atmospheric Aura Radiance */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#7c3aed]/25 via-[#a855f7]/15 to-transparent pointer-events-none z-0" />

          {/* Top Bar: Controls & Header */}
          <div className="flex items-center justify-between pt-1 relative z-10">
            <button
              onClick={onClose}
              className="frosted-circle-btn w-11 h-11 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
              title="Minimize Player"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-white tracking-tight font-sans">
                Now Playing
              </span>
            </div>

            <button
              onClick={() => toggleLike(currentTrack)}
              className="frosted-circle-btn w-11 h-11 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
              title="Save to Favourites"
            >
              <Heart
                size={20}
                className={liked ? 'text-[#d946ef] fill-[#d946ef]' : 'text-white'}
              />
            </button>
          </div>

          {/* Center: Large Circular Vinyl Disc with Atmospheric Aura Glow */}
          <div className="flex items-center justify-center my-auto py-2 relative z-10">
            {/* Ambient radiant glow behind circular image */}
            <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-[#d946ef]/30 via-[#a855f7]/35 to-[#6366f1]/25 blur-3xl pointer-events-none z-0" />

            <div className="relative z-10 group">
              <img
                src={albumCoverUrl}
                alt={currentTrack.name}
                decoding="async"
                width={320}
                height={320}
                className="w-60 h-60 sm:w-72 sm:h-72 aspect-square object-cover rounded-full shadow-[0_0_40px_rgba(168,85,247,0.5),0_20px_50px_rgba(0,0,0,0.85)] border-2 border-white/25 ring-1 ring-white/10"
              />
            </div>
          </div>

          {/* Bottom Area: Track Title, Artist, Waveform Scrubber & Controls */}
          <div className="flex flex-col gap-3 pb-1 relative z-10">
            {/* Title & Artist (Centered, bold) */}
            <div className="flex flex-col items-center text-center my-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans truncate max-w-[90%] drop-shadow-md">
                {currentTrack.name}
              </h2>
              <span className="text-sm font-medium text-[#c4b5fd] mt-0.5 font-sans">
                {currentTrack.artists.map((a) => a.name).join(', ')}
              </span>
            </div>

            {/* Waveform Audio Visualizer Scrubber (Screen 1) */}
            <WaveformAudioScrubber seek={seek} />

            {/* Master Playback Controls */}
            <div className="flex items-center justify-between px-3 pt-2">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-all ${
                  isShuffle ? 'text-[#d946ef] drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]' : 'text-white/60 hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle size={20} />
              </button>
              <button
                onClick={prevTrack}
                className="p-2 text-white hover:opacity-80 transition-opacity active:scale-95"
                title="Previous"
              >
                <SkipBack size={26} fill="currentColor" />
              </button>

              {/* Master Play/Pause: Large Circular Light Frosted Glass Disc */}
              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all light-glass-disc text-white shadow-[0_0_24px_rgba(168,85,247,0.35)]"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <Loader2 size={26} className="animate-spin text-white" />
                ) : isPlaying ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" className="ml-1" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="p-2 text-white hover:opacity-80 transition-opacity active:scale-95"
                title="Next"
              >
                <SkipForward size={26} fill="currentColor" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-2 transition-all ${
                  repeatMode !== 'off'
                    ? 'text-[#d946ef] drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Repeat"
              >
                {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
              </button>
            </div>

            {/* Quality Selector Badge */}
            <div className="flex items-center justify-between pt-1 text-[#b3b3b3] text-xs">
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-white"
                >
                  <Sliders size={13} />
                  <span>
                    {audioQuality === 'very_high'
                      ? '320k'
                      : audioQuality === 'high'
                      ? '256k'
                      : audioQuality === 'normal'
                      ? '160k'
                      : '96k'}
                  </span>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-10 left-0 w-48 bg-[#18122c] border border-white/20 rounded-xl shadow-2xl p-1.5 z-50 backdrop-blur-xl">
                    {[
                      { id: 'very_high', label: 'Very High', rate: '320 kbps' },
                      { id: 'high', label: 'High', rate: '256 kbps' },
                      { id: 'normal', label: 'Normal', rate: '160 kbps' },
                      { id: 'low', label: 'Low', rate: '96 kbps' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        onClick={() => {
                          setAudioQuality(q.id as AudioQuality);
                          setShowQualityMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left ${
                          audioQuality === q.id ? 'text-[#d946ef] font-bold' : 'text-white'
                        }`}
                      >
                        <span>{q.label}</span>
                        {audioQuality === q.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[11px] text-[#b3b3b3]">Streaming via YouTube Audio</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Velvet & Spatial Liquid Glass Metaball Music Player (Full card + Dock + Scrubber)
  if (isVelvetStyle) {
    return <VelvetMetaballFullPlayer onClose={onClose} />;
  }

  // Classic Spotify & Liquid Glass Layouts
  return (
    <div
      className={`fixed inset-0 z-50 md:hidden flex flex-col justify-between p-6 select-none overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300 ${
        isVelvetLime
          ? 'bg-[#0B0B12] text-white'
          : isLiquidGlass
          ? 'liquid-glass-bg text-white'
          : 'bg-gradient-to-b from-[#3a3a3a] via-[#121212] to-black text-white'
      }`}
    >
      {/* Transparent Frosted Glass Top Half (Velvet & Lime) */}
      {isVelvetLime && (
        <div className="absolute top-0 left-0 right-0 h-[58%] overflow-hidden pointer-events-none z-0">
          <div
            className="w-full h-full bg-cover bg-center scale-110 opacity-30"
            style={{
              backgroundImage: `url(${albumCoverUrl})`,
              filter: 'blur(24px) saturate(160%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(22, 23, 33, 0.75) 0%, rgba(14, 15, 22, 0.88) 85%, transparent 100%)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.45)',
            }}
          />
        </div>
      )}

      {/* Top Bar: Controls & Header */}
      <div className="flex items-center justify-between pt-2 relative z-10">
        {isVelvetLime ? (
          <button
            onClick={onClose}
            className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ChevronLeft size={22} />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="p-2 text-white hover:opacity-75 transition-opacity"
          >
            <ChevronDown size={28} />
          </button>
        )}

        <div className="flex flex-col items-center">
          <span className={`text-[11px] uppercase tracking-widest ${
            isVelvetLime ? 'font-bold text-white/90 font-sans' : 'font-bold text-[#b3b3b3]'
          }`}>
            {isVelvetLime ? 'Now Playing' : 'PLAYING FROM PLAYLIST'}
          </span>
          {!isVelvetLime && (
            <span className="text-xs font-bold text-white truncate max-w-[200px]">
              {currentTrack.album.name}
            </span>
          )}
        </div>

        {isVelvetLime ? (
          <button
            onClick={() => toggleLike(currentTrack)}
            className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <Heart
              size={19}
              className={liked ? 'text-[#D2F843] fill-[#D2F843]' : 'text-white'}
            />
          </button>
        ) : (
          <button className="p-2 text-[#b3b3b3] hover:text-white transition-colors">
            <MoreVertical size={20} />
          </button>
        )}
      </div>

      {/* Center: Large Album Art */}
      <div className="flex items-center justify-center my-auto py-2 relative z-10">
        {isVelvetLime && (
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-[#f97316]/30 via-[#D8B4FE]/25 to-[#D2F843]/20 blur-3xl pointer-events-none z-0" />
        )}
        {currentTrack.album.images[0] ? (
          <img
            src={currentTrack.album.images[0].url}
            alt={currentTrack.name}
            decoding="async"
            width={320}
            height={320}
            className={`aspect-square object-cover shadow-[0_20px_50px_rgba(0,0,0,0.85)] bg-[#181824] relative z-10 ${
              isVelvetLime
                ? 'w-60 h-60 sm:w-72 sm:h-72 rounded-full border-4 border-white/20 ring-1 ring-white/10'
                : isLiquidGlass
                ? 'w-full max-w-[300px] rounded-2xl border border-white/20'
                : 'w-full max-w-[300px] rounded-xl'
            }`}
          />
        ) : (
          <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-[#181824] flex items-center justify-center shadow-2xl relative z-10 border-4 border-white/20">
            <span className="text-6xl text-[#757575]">♪</span>
          </div>
        )}
      </div>

      {/* Bottom Area: Info, Scrubber & Controls */}
      <div className="flex flex-col gap-3 pb-2 relative z-10">
        {isVelvetLime ? (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans truncate max-w-[90%]">
              {currentTrack.name}
            </h2>
            <span className="text-xs sm:text-sm font-medium text-white/60 mt-0.5 font-sans">
              {currentTrack.artists.map((a) => a.name).join(' x ')}
            </span>

            {/* 3-Line Synced Lyrics Snippet Card */}
            <div className="flex flex-col items-center text-center my-3 max-w-xs mx-auto space-y-1 select-none">
              <p className="text-xs sm:text-sm text-white/35 font-medium transition-colors">
                Whispers in the midnight breeze,
              </p>
              <p className="text-sm sm:text-base text-white font-bold tracking-tight py-0.5 drop-shadow-sm">
                Carrying dreams across the seas,
              </p>
              <p className="text-xs sm:text-sm text-white/35 font-medium transition-colors">
                I close my eyes, let go, and drift away.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate mr-4">
              <span className="text-xl font-bold text-white truncate">
                {currentTrack.name}
              </span>
              <span className="text-sm text-[#b3b3b3] truncate">
                {currentTrack.artists.map((a) => a.name).join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <DownloadButton track={currentTrack} size={24} />
              <button
                onClick={() => toggleLike(currentTrack)}
                className="p-2 transition-transform hover:scale-110 flex-shrink-0"
              >
                {liked ? (
                  <Heart size={24} className="text-[#1db954] fill-[#1db954]" />
                ) : (
                  <Heart size={24} className="text-[#b3b3b3]" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Scrubber Progress Slider */}
        <NowPlayingProgressBar seek={seek} />

        {/* Master Playback Controls */}
        <div className="flex items-center justify-between px-2 pt-1">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-[#D2F843]' : 'text-white/60 hover:text-white'
            }`}
          >
            <Shuffle size={20} />
          </button>
          <button
            onClick={prevTrack}
            className="p-2 text-white hover:opacity-80 transition-opacity"
          >
            <SkipBack size={26} fill="currentColor" />
          </button>
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl ${
              isVelvetLime
                ? 'bg-[#D2F843] text-black shadow-[0_0_30px_rgba(210,248,67,0.4)]'
                : 'bg-white text-black'
            }`}
          >
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-black" />
            ) : isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </button>
          <button
            onClick={nextTrack}
            className="p-2 text-white hover:opacity-80 transition-opacity"
          >
            <SkipForward size={26} fill="currentColor" />
          </button>

          {isVelvetLime ? (
            <button className="p-2 text-white/60 hover:text-white transition-colors">
              <ListMusic size={20} />
            </button>
          ) : (
            <button
              onClick={toggleRepeat}
              className={`p-2 transition-colors ${
                repeatMode !== 'off' ? 'text-white' : 'text-[#b3b3b3]'
              }`}
              style={{ color: repeatMode !== 'off' ? currentThemeDef.accentColor : undefined }}
            >
              {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          )}
        </div>

        {/* Quality Selector Badge */}
        <div className="flex items-center justify-between pt-1 text-[#b3b3b3] text-xs">
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-white"
            >
              <Sliders size={13} />
              <span>
                {audioQuality === 'very_high'
                  ? '320k'
                  : audioQuality === 'high'
                  ? '256k'
                  : audioQuality === 'normal'
                  ? '160k'
                  : '96k'}
              </span>
            </button>

            {showQualityMenu && (
              <div className="absolute bottom-10 left-0 w-48 bg-[#282828] border border-[#3e3e3e] rounded-xl shadow-2xl p-1.5 z-50">
                {[
                  { id: 'very_high', label: 'Very High', rate: '320 kbps' },
                  { id: 'high', label: 'High', rate: '256 kbps' },
                  { id: 'normal', label: 'Normal', rate: '160 kbps' },
                  { id: 'low', label: 'Low', rate: '96 kbps' },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setAudioQuality(q.id as AudioQuality);
                      setShowQualityMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left ${
                      audioQuality === q.id ? 'text-[#D2F843] font-bold' : 'text-white'
                    }`}
                  >
                    <span>{q.label}</span>
                    {audioQuality === q.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-[11px] text-[#b3b3b3]">Streaming via YouTube Audio</span>
        </div>
      </div>
    </div>
  );
};
