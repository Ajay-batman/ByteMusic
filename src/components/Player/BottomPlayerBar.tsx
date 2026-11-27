import React, { useState } from 'react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { LiquidGlassSlider } from '../Common/LiquidGlassSlider';
import { DownloadButton } from '../Common/DownloadButton';
import { VelvetMetaballVolumeMiniPlayer } from '../Velvet/VelvetMetaballVolumeMiniPlayer';
import { AudioQuality } from '../../types/spotify';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Maximize2,
  Sliders,
  Check,
  Loader2,
} from 'lucide-react';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Isolated high-frequency scrubber component.
 * Consumes usePlaybackProgress() so ONLY this child re-renders on the 250ms interval,
 * keeping the parent BottomPlayerBar and its controls completely stationary.
 */
const PlayerProgressBar: React.FC<{ seek: (ms: number) => void }> = React.memo(({ seek }) => {
  const { progressMs, durationMs } = usePlaybackProgress();
  const { isVelvetLime, isUltraviolet, isGlacialGlass } = useTheme();

  return (
    <div className={`w-full flex items-center gap-3 text-xs font-mono ${isGlacialGlass ? 'text-slate-600' : 'text-[#b3b3b3]'}`}>
      <span className="w-9 text-right">{formatDuration(progressMs)}</span>
      <div className="flex-1">
        <LiquidGlassSlider
          value={progressMs}
          min={0}
          max={durationMs || 1}
          onChange={(newMs) => seek(newMs)}
          formatTooltip={(ms) => formatDuration(ms)}
          accentColor={isUltraviolet ? '#d946ef' : isVelvetLime ? '#D2F843' : isGlacialGlass ? '#38bdf8' : undefined}
        />
      </div>
      <span className="w-9">{formatDuration(durationMs)}</span>
    </div>
  );
});

interface BottomPlayerBarProps {
  onOpenNowPlaying?: () => void;
}

export const BottomPlayerBar: React.FC<BottomPlayerBarProps> = ({ onOpenNowPlaying }) => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    audioQuality,
    setAudioQuality,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    prevTrack,
  } = usePlayback();

  const { isLiked, toggleLike } = useLibrary();
  const { isLiquidGlass, isVelvetLime, isUltraviolet, isGlacialGlass, isVelvetStyle } = useTheme();

  const [showQualityMenu, setShowQualityMenu] = useState(false);

  if (!currentTrack) return null;

  if (isVelvetStyle) {
    return (
      <footer className="pb-3 pt-1 px-4 flex items-center justify-center z-40 select-none">
        <VelvetMetaballVolumeMiniPlayer onOpenFullPlayer={() => onOpenNowPlaying?.()} />
      </footer>
    );
  }

  const isCurrentLiked = isLiked(currentTrack.id);

  return (
    <footer
      className={`transition-all duration-300 z-50 select-none ${
        isGlacialGlass
          ? 'mx-4 mb-3 rounded-[32px] glacial-sculpted-dock h-20 px-6 grid grid-cols-[1fr_2fr_1fr] items-center shadow-2xl border border-white/80 text-slate-800'
          : isVelvetLime
          ? 'mx-4 mb-3 rounded-2xl frosted-3d-dock h-20 px-5 grid grid-cols-[1fr_2fr_1fr] items-center shadow-2xl'
          : isUltraviolet
          ? 'mx-4 mb-3 rounded-2xl glass-player h-20 px-5 grid grid-cols-[1fr_2fr_1fr] items-center shadow-2xl'
          : isLiquidGlass
          ? 'mx-3 mb-2 rounded-2xl glass-player h-20 px-5 grid grid-cols-[1fr_2fr_1fr] items-center shadow-2xl'
          : 'h-20 bg-[#181818] border-t border-[#282828] px-4 grid grid-cols-[1fr_2fr_1fr] items-center'
      }`}
    >
      {/* Left: Current Track Info */}
      <div className="flex items-center gap-3.5 min-w-0">
        {currentTrack.album.images[0] && (
          <img
            src={currentTrack.album.images[0].url}
            alt={currentTrack.name}
            loading="lazy"
            decoding="async"
            width={56}
            height={56}
            onClick={onOpenNowPlaying}
            title="Expand Now Playing"
            className={`w-14 h-14 object-cover shadow flex-shrink-0 cursor-pointer ${
              isGlacialGlass
                ? 'rounded-2xl border border-white/70 shadow-md bg-white/20'
                : isUltraviolet
                ? 'rounded-full border-2 border-[#d946ef]/60 shadow-[0_0_15px_rgba(217,70,239,0.45)] hover:scale-105 transition-all bg-[#282828]'
                : isVelvetLime
                ? 'rounded-full border border-white/20 bg-[#282828]'
                : 'rounded bg-[#282828]'
            }`}
          />
        )}
        <div
          className="flex flex-col truncate cursor-pointer"
          onClick={onOpenNowPlaying}
          title="Expand Now Playing"
        >
          <span className={`text-sm font-bold truncate font-sans ${isGlacialGlass ? 'text-slate-900 hover:text-sky-600' : 'text-white hover:underline'}`}>
            {currentTrack.name}
          </span>
          <span className={`text-xs truncate ${isGlacialGlass ? 'text-slate-500' : 'text-[#b3b3b3] hover:underline hover:text-white'}`}>
            {currentTrack.artists.map((a) => a.name).join(', ')}
          </span>
        </div>
        <button
          onClick={() => toggleLike(currentTrack)}
          title={isCurrentLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          className="ml-2 transition-transform hover:scale-110 flex-shrink-0"
        >
          {isCurrentLiked ? (
            <Heart
              size={18}
              className={
                isGlacialGlass
                  ? 'text-[#f43f5e] fill-[#f43f5e]'
                  : isUltraviolet
                  ? 'text-[#d946ef] fill-[#d946ef]'
                  : isVelvetLime
                  ? 'text-[#D2F843] fill-[#D2F843]'
                  : 'text-[#1db954] fill-[#1db954]'
              }
            />
          ) : (
            <Heart size={18} className={isGlacialGlass ? 'text-slate-400 hover:text-slate-600' : 'text-[#b3b3b3] hover:text-white'} />
          )}
        </button>
        <DownloadButton track={currentTrack} size={18} className="ml-1" />
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center max-w-[722px] w-full px-4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-5 mb-1.5">
          <button
            onClick={toggleShuffle}
            className={`transition-colors ${
              isShuffle
                ? isGlacialGlass
                  ? 'text-sky-600'
                  : isUltraviolet
                  ? 'text-[#d946ef]'
                  : isVelvetLime
                  ? 'text-[#D2F843]'
                  : 'text-[#1db954]'
                : isGlacialGlass
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={prevTrack}
            className={`${isGlacialGlass ? 'text-slate-600 hover:text-slate-900' : 'text-[#b3b3b3] hover:text-white'} transition-colors`}
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          {/* Center Play/Pause button */}
          {isGlacialGlass ? (
            <div className="chromatic-halo">
              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-11 h-11 rounded-full bg-white text-slate-900 hover:scale-105 active:scale-90 transition-all flex items-center justify-center shadow-lg"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin text-slate-900" />
                ) : isPlaying ? (
                  <Pause size={18} fill="#0f172a" className="text-slate-900" />
                ) : (
                  <Play size={18} fill="#0f172a" className="text-slate-900 ml-0.5" />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className={`w-10 h-10 rounded-full hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow disabled:opacity-75 ${
                isUltraviolet
                  ? 'light-glass-disc text-white shadow-[0_0_20px_rgba(217,70,239,0.35)]'
                  : isVelvetLime
                  ? 'bg-[#D2F843] text-black shadow-[0_0_18px_rgba(210,248,67,0.4)]'
                  : 'bg-white text-black'
              }`}
            >
              {isLoading ? (
                <Loader2 size={16} className={`animate-spin ${isUltraviolet ? 'text-white' : 'text-black'}`} />
              ) : isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>
          )}

          <button
            onClick={nextTrack}
            className={`${isGlacialGlass ? 'text-slate-600 hover:text-slate-900' : 'text-[#b3b3b3] hover:text-white'} transition-colors`}
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
          <button
            onClick={toggleRepeat}
            className={`transition-colors ${
              repeatMode !== 'off'
                ? isGlacialGlass
                  ? 'text-sky-600'
                  : isUltraviolet
                  ? 'text-[#d946ef]'
                  : isVelvetLime
                  ? 'text-[#D2F843]'
                  : 'text-[#1db954]'
                : isGlacialGlass
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Isolated Progress Bar with LiquidGlassSlider */}
        <PlayerProgressBar seek={seek} />
      </div>

      {/* Right: Volume & Utility */}
      <div className="flex items-center justify-end gap-3 text-[#b3b3b3]">
        <button
          onClick={toggleMute}
          className="hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div className="w-24">
          <LiquidGlassSlider
            value={isMuted ? 0 : volume}
            min={0}
            max={1}
            onChange={(newVol) => setVolume(newVol)}
            formatTooltip={(vol) => `${Math.round(vol * 100)}%`}
            accentColor={isUltraviolet ? '#d946ef' : isVelvetLime ? '#D2F843' : undefined}
          />
        </div>
        <button
          onClick={onOpenNowPlaying}
          title="Expand Now Playing"
          className="hover:text-white transition-all ml-1 p-1 rounded-full hover:bg-white/10 active:scale-95 cursor-pointer"
        >
          <Maximize2 size={16} />
        </button>

        {/* Audio Quality / Bitrate Selector */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowQualityMenu((prev) => !prev)}
            title="Audio Quality & Bitrate"
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
              showQualityMenu ? 'bg-[#282828] text-[#1db954]' : 'hover:bg-[#282828] text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Sliders size={14} />
            <span>{audioQuality === 'very_high' ? '320k' : audioQuality === 'high' ? '256k' : audioQuality === 'normal' ? '160k' : '96k'}</span>
          </button>

          {/* Quality Popover Menu */}
          {showQualityMenu && (
            <div className="absolute bottom-10 right-0 w-52 bg-[#282828] border border-[#383838] rounded-lg shadow-2xl p-1.5 text-xs z-50">
              <div className="px-2.5 py-1.5 font-bold text-white border-b border-[#383838] mb-1">
                Audio Quality (Bitrate)
              </div>
              {[
                { id: 'very_high', label: 'Very High', rate: '320 kbps' },
                { id: 'high', label: 'High', rate: '256 kbps' },
                { id: 'normal', label: 'Normal', rate: '160 kbps' },
                { id: 'low', label: 'Low (Data Saver)', rate: '96 kbps' },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setAudioQuality(q.id as AudioQuality);
                    setShowQualityMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-colors ${
                    audioQuality === q.id
                      ? 'bg-[#383838] text-[#1db954] font-bold'
                      : 'hover:bg-[#333333] text-white font-normal'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{q.label}</span>
                    <span className="text-[10px] text-[#b3b3b3]">{q.rate}</span>
                  </div>
                  {audioQuality === q.id && <Check size={14} className="text-[#1db954]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
