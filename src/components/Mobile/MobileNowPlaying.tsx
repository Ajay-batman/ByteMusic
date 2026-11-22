import React, { useState } from 'react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { LiquidGlassSlider } from '../Common/LiquidGlassSlider';
import { DownloadButton } from '../Common/DownloadButton';
import { AudioQuality } from '../../types/spotify';
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
 * Isolated Scrubber Slider for Mobile Now Playing Screen.
 * Subscribes to usePlaybackProgress() so ONLY the slider and time labels re-render every 250ms,
 * preserving 60fps animations and avoiding image re-render jank.
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
    seek,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    prevTrack,
  } = usePlayback();

  const { isLiked, toggleLike } = useLibrary();
  const { isLiquidGlass, isVelvetLime, currentThemeDef } = useTheme();
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const albumCoverUrl = currentTrack.album.images[0]?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';

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
      {/* Dynamic Blurred Artwork Backdrop Behind Transparent Glass (Dribbble Screen 2) */}
      {isVelvetLime && (
        <div className="absolute top-0 left-0 right-0 h-[62%] overflow-hidden pointer-events-none z-0">
          <div
            className="w-full h-full bg-cover bg-center scale-125 filter blur-3xl opacity-60"
            style={{
              backgroundImage: `url(${albumCoverUrl})`,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0) 100%)',
            }}
          />
          {/* Transparent Frosted Smoked Glass Overlay */}
          <div className="absolute inset-0 bg-[#0B0B12]/20 backdrop-blur-sm" />
        </div>
      )}

      {/* Top Bar: Controls & Header (Z-10) */}
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

      {/* Center: Large Album Art (Circular Vinyl Disc on Velvet & Lime theme) */}
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

      {/* Bottom Area: Info, Lyrics Snippet, Scrubber & Controls */}
      <div className="flex flex-col gap-3 pb-2 relative z-10">
        {/* Title & Artist */}
        {isVelvetLime ? (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans truncate max-w-[90%]">
              {currentTrack.name}
            </h2>
            <span className="text-xs sm:text-sm font-medium text-white/60 mt-0.5 font-sans">
              {currentTrack.artists.map((a) => a.name).join(' x ')}
            </span>

            {/* 3-Line Synced Lyrics Snippet Card (Dribbble Screen 2) */}
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
