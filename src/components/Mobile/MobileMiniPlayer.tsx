import React, { useEffect, useRef } from 'react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { VelvetMetaballVolumeMiniPlayer } from '../Velvet/VelvetMetaballVolumeMiniPlayer';
import { captureTransitionOrigin, registerMiniPlayerArtwork, registerMiniPlayerContainer } from '../../utils/motion';
import { Play, Pause, Heart, Loader2 } from 'lucide-react';

interface MobileMiniPlayerProps {
  onOpenFullPlayer: () => void;
}

/**
 * Isolated thin progress line indicator.
 * Consumes usePlaybackProgress() so ONLY this 2.5px line recalculates its width every 250ms,
 * preventing the entire MobileMiniPlayer from re-rendering.
 */
const MiniProgressBar: React.FC = React.memo(() => {
  const { progressMs, durationMs } = usePlaybackProgress();
  const { isVelvetLime, isUltraviolet } = useTheme();
  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 rounded-b-lg overflow-hidden">
      <div
        style={{ width: `${progressPercent}%` }}
        className={`h-full transition-all duration-100 ${
          isUltraviolet
            ? 'bg-gradient-to-r from-[#a855f7] to-[#d946ef] shadow-[0_0_8px_rgba(217,70,239,0.9)]'
            : isVelvetLime
            ? 'bg-[#D2F843]'
            : 'bg-[#1db954]'
        }`}
      />
    </div>
  );
});

export const MobileMiniPlayer: React.FC<MobileMiniPlayerProps> = ({ onOpenFullPlayer }) => {
  const { currentTrack, isPlaying, isLoading, togglePlay } = usePlayback();
  const { isLiked, toggleLike } = useLibrary();
  const { isLiquidGlass, isVelvetLime, isUltraviolet, isVelvetStyle } = useTheme();
  const artworkRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVelvetStyle) return;
    registerMiniPlayerArtwork(artworkRef.current);
    registerMiniPlayerContainer(containerRef.current);
    return () => {
      registerMiniPlayerArtwork(null);
      registerMiniPlayerContainer(null);
    };
  }, [isVelvetStyle, currentTrack?.id]);

  if (!currentTrack) return null;

  // Velvet & Spatial Liquid Glass Metaball Volume Mini-Player
  if (isVelvetStyle) {
    return (
      <div
        style={{ bottom: 'calc(100px + var(--safe-bottom, 0px))' }}
        className="fixed inset-x-0 z-40 md:hidden px-2 pointer-events-none anim-mini-enter"
      >
        <VelvetMetaballVolumeMiniPlayer onOpenFullPlayer={onOpenFullPlayer} />
      </div>
    );
  }

  const liked = isLiked(currentTrack.id);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        captureTransitionOrigin(e.currentTarget, currentTrack.album.images[0]?.url);
        onOpenFullPlayer();
      }}
      style={{ bottom: 'calc(82px + var(--safe-bottom, 0px))' }}
      className={`fixed z-40 md:hidden flex items-center justify-between px-3.5 cursor-pointer select-none shadow-2xl transition-colors anim-mini-enter ${
        isUltraviolet
          ? 'left-4 right-4 max-w-[380px] mx-auto h-14 rounded-full glass-player border border-white/20 shadow-[0_0_24px_rgba(217,70,239,0.3)]'
          : isVelvetLime
          ? 'left-4 right-4 max-w-[380px] mx-auto h-14 rounded-full frosted-3d-dock border border-white/20'
          : isLiquidGlass
          ? 'left-2.5 right-2.5 h-14 rounded-2xl glass-player border border-white/25'
          : 'left-2.5 right-2.5 h-14 rounded-2xl bg-[#26262a] text-white border border-[#38383d]'
      }`}
    >
      {/* Left: Track Info & Artwork */}
      <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
        {currentTrack.album.images[0] && (
          <img
            ref={artworkRef}
            src={currentTrack.album.images[0].url}
            alt={currentTrack.name}
            loading="lazy"
            decoding="async"
            width={40}
            height={40}
            className={`w-10 h-10 object-cover flex-shrink-0 shadow-sm bg-[#282828] ${
              isUltraviolet
                ? 'rounded-full border border-white/30 shadow-[0_0_10px_rgba(217,70,239,0.4)]'
                : isVelvetLime
                ? 'rounded-full border border-white/20'
                : 'rounded'
            }`}
          />
        )}
        <div className="flex flex-col truncate">
          <span className="text-xs font-semibold text-white truncate">
            {currentTrack.name}
          </span>
          <span className="text-[11px] text-[#b3b3b3] truncate">
            {currentTrack.artists.map((a) => a.name).join(', ')}
          </span>
        </div>
      </div>

      {/* Right: Quick Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Heart Favorite */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(currentTrack);
          }}
          className={`p-1.5 transition-transform hover:scale-110 ${
            liked
              ? isUltraviolet
                ? 'text-[#d946ef]'
                : isVelvetLime
                ? 'text-[#D2F843]'
                : 'text-[#1db954]'
              : 'text-[#8E8E9F] hover:text-white'
          }`}
        >
          {liked ? (
            <Heart
              size={18}
              className={
                isUltraviolet
                  ? 'fill-[#d946ef]'
                  : isVelvetLime
                  ? 'fill-[#D2F843]'
                  : 'fill-[#1db954]'
              }
            />
          ) : (
            <Heart size={18} />
          )}
        </button>

        {/* Play/Pause */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          disabled={isLoading}
          className={`w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow ${
            isUltraviolet
              ? 'light-glass-disc text-white'
              : isVelvetLime
              ? 'bg-[#D2F843] text-black shadow-[0_0_12px_rgba(210,248,67,0.4)]'
              : 'bg-white text-black'
          }`}
        >
          {isLoading ? (
            <Loader2 size={16} className={`animate-spin ${isUltraviolet ? 'text-white' : 'text-black'}`} />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Bottom Mini Progress Indicator Line */}
      <MiniProgressBar />
    </div>
  );
};
