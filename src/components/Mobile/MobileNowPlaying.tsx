import React, { useState } from 'react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { LiquidGlassSlider } from '../Common/LiquidGlassSlider';
import { DownloadButton } from '../Common/DownloadButton';
import { AudioQuality } from '../../types/spotify';
import {
  ChevronDown,
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

  return (
    <div className="flex flex-col gap-1">
      <LiquidGlassSlider
        value={progressMs}
        min={0}
        max={durationMs || 1}
        onChange={(newMs) => seek(newMs)}
        formatTooltip={(ms) => formatDuration(ms)}
      />
      <div className="flex items-center justify-between text-xs font-mono text-[#b3b3b3] px-1">
        <span>{formatDuration(progressMs)}</span>
        <span>{formatDuration(durationMs)}</span>
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
  const { isLiquidGlass } = useTheme();
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden flex flex-col justify-between p-6 select-none animate-in fade-in slide-in-from-bottom-10 duration-300 ${
        isLiquidGlass
          ? 'liquid-glass-bg text-white'
          : 'bg-gradient-to-b from-[#3a3a3a] via-[#121212] to-black text-white'
      }`}
    >
      {/* Top Bar: Collapse Chevron + Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onClose}
          className="p-2 text-white hover:opacity-75 transition-opacity"
        >
          <ChevronDown size={28} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#b3b3b3]">
            PLAYING FROM PLAYLIST
          </span>
          <span className="text-xs font-bold text-white truncate max-w-[200px]">
            {currentTrack.album.name}
          </span>
        </div>
        <button className="p-2 text-[#b3b3b3] hover:text-white transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Center: Large Album Art */}
      <div className="flex items-center justify-center my-auto py-4">
        {currentTrack.album.images[0] ? (
          <img
            src={currentTrack.album.images[0].url}
            alt={currentTrack.name}
            decoding="async"
            width={320}
            height={320}
            className={`w-full max-w-[320px] aspect-square object-cover rounded-xl shadow-2xl bg-[#282828] ${
              isLiquidGlass ? 'border border-white/20' : ''
            }`}
          />
        ) : (
          <div className="w-full max-w-[320px] aspect-square rounded-xl bg-[#282828] flex items-center justify-center shadow-2xl">
            <span className="text-6xl text-[#757575]">♪</span>
          </div>
        )}
      </div>

      {/* Bottom Area: Info, Scrubber & Controls */}
      <div className="flex flex-col gap-4 pb-4">
        {/* Title, Artist & Like */}
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

        {/* Scrubber Progress Slider */}
        <NowPlayingProgressBar seek={seek} />

        {/* Master Playback Controls */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-[#1db954]' : 'text-[#b3b3b3]'
            }`}
          >
            <Shuffle size={20} />
          </button>
          <button
            onClick={prevTrack}
            className="p-2 text-white hover:opacity-75 transition-opacity"
          >
            <SkipBack size={28} fill="currentColor" />
          </button>
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl"
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
            className="p-2 text-white hover:opacity-75 transition-opacity"
          >
            <SkipForward size={28} fill="currentColor" />
          </button>
          <button
            onClick={toggleRepeat}
            className={`p-2 transition-colors ${
              repeatMode !== 'off' ? 'text-[#1db954]' : 'text-[#b3b3b3]'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>

        {/* Quality Selector Badge */}
        <div className="flex items-center justify-between pt-2 text-[#b3b3b3] text-xs">
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
                      audioQuality === q.id ? 'text-[#1db954] font-bold' : 'text-white'
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
