import React, { useState } from 'react';
import { usePlayback } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { LiquidGlassSlider } from '../Common/LiquidGlassSlider';
import { DownloadButton } from '../Common/DownloadButton';
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
  Loader2
} from 'lucide-react';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const BottomPlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    progressMs,
    durationMs,
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
  const { isLiquidGlass } = useTheme();

  const [showQualityMenu, setShowQualityMenu] = useState(false);

  if (!currentTrack) return null;

  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;
  const isCurrentLiked = isLiked(currentTrack.id);

  return (
    <footer
      className={`transition-all duration-300 z-50 select-none ${
        isLiquidGlass
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
            className="w-14 h-14 rounded object-cover shadow"
          />
        )}
        <div className="flex flex-col truncate">
          <span className="text-sm font-medium text-white hover:underline truncate cursor-pointer">
            {currentTrack.name}
          </span>
          <span className="text-xs text-[#b3b3b3] hover:underline hover:text-white truncate cursor-pointer">
            {currentTrack.artists.map((a) => a.name).join(', ')}
          </span>
        </div>
        <button
          onClick={() => toggleLike(currentTrack)}
          title={isCurrentLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          className="ml-2 transition-transform hover:scale-110 flex-shrink-0"
        >
          {isCurrentLiked ? (
            <Heart size={18} className="text-[#1db954] fill-[#1db954]" />
          ) : (
            <Heart size={18} className="text-[#b3b3b3] hover:text-white" />
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
            className={`transition-colors ${isShuffle ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'}`}
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={prevTrack}
            className="text-[#b3b3b3] hover:text-white transition-colors"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-white hover:scale-105 transition-transform flex items-center justify-center text-black shadow disabled:opacity-75"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-black" />
            ) : isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={nextTrack}
            className="text-[#b3b3b3] hover:text-white transition-colors"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
          <button
            onClick={toggleRepeat}
            className={`transition-colors ${repeatMode !== 'off' ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Progress Bar with LiquidGlassSlider */}
        <div className="w-full flex items-center gap-3 text-xs text-[#b3b3b3] font-mono">
          <span className="w-9 text-right">{formatDuration(progressMs)}</span>
          <div className="flex-1">
            <LiquidGlassSlider
              value={progressMs}
              min={0}
              max={durationMs || 1}
              onChange={(newMs) => seek(newMs)}
              formatTooltip={(ms) => formatDuration(ms)}
            />
          </div>
          <span className="w-9">{formatDuration(durationMs)}</span>
        </div>
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
          />
        </div>
        <button className="hover:text-white transition-colors ml-1">
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
