import React from 'react';
import { usePlayback } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { Play, Pause, Heart, Loader2 } from 'lucide-react';

interface MobileMiniPlayerProps {
  onOpenFullPlayer: () => void;
}

export const MobileMiniPlayer: React.FC<MobileMiniPlayerProps> = ({ onOpenFullPlayer }) => {
  const { currentTrack, isPlaying, isLoading, progressMs, durationMs, togglePlay } = usePlayback();
  const { isLiked, toggleLike } = useLibrary();
  const { isLiquidGlass } = useTheme();

  if (!currentTrack) return null;

  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <div
      onClick={onOpenFullPlayer}
      className={`fixed bottom-14 left-2 right-2 h-14 z-40 md:hidden rounded-lg flex items-center justify-between px-3 cursor-pointer select-none shadow-xl transition-all ${
        isLiquidGlass
          ? 'glass-player border border-white/25 backdrop-blur-2xl'
          : 'bg-[#282828] text-white border border-[#383838]'
      }`}
    >
      {/* Left: Track Info & Artwork */}
      <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
        {currentTrack.album.images[0] && (
          <img
            src={currentTrack.album.images[0].url}
            alt={currentTrack.name}
            className="w-10 h-10 rounded object-cover flex-shrink-0 shadow-sm"
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
            liked ? 'text-[#1db954]' : 'text-[#b3b3b3]'
          }`}
        >
          {liked ? <Heart size={18} className="fill-[#1db954]" /> : <Heart size={18} />}
        </button>

        {/* Play/Pause */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          disabled={isLoading}
          className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-black" />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Bottom Mini Progress Indicator Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 rounded-b-lg overflow-hidden">
        <div
          style={{ width: `${progressPercent}%` }}
          className="h-full bg-[#1db954] transition-all duration-100"
        />
      </div>
    </div>
  );
};
