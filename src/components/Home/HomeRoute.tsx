import React, { useState } from 'react';
import { mockPlaylists, mockTracks } from '../../data/mockSpotifyCatalog';
import { Playlist, Track } from '../../types/spotify';
import { Play, Palette, Server, Heart, Sparkles } from 'lucide-react';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { useTheme } from '../../context/ThemeContext';
import { ServerSettingsModal } from '../Common/ServerSettingsModal';

interface HomeRouteProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const HomeRoute: React.FC<HomeRouteProps> = ({ onSelectPlaylist }) => {
  const { isLiquidGlass, isVelvetLime, openThemeModal, currentThemeDef } = useTheme();
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'new' | 'trending' | 'daily' | 'playlists'>('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New Release' },
    { id: 'trending', label: 'Trending' },
    { id: 'daily', label: 'Top Daily' },
    { id: 'playlists', label: 'Playlists' },
  ] as const;

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 sm:space-y-8">
      {/* Greeting Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-[#b3b3b3]">Good afternoon</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Hi, Listener</h1>
        </div>

        {/* Mobile Quick Controls: Server Settings & Theme */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsServerModalOpen(true)}
            title="Backend Server Connection"
            className={`p-2 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
              isLiquidGlass ? 'glass-pill text-white shadow-sm' : 'bg-[#282828] text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Server size={14} className="text-[#1db954]" />
          </button>
          <button
            onClick={openThemeModal}
            title="Choose Theme Style"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isLiquidGlass ? 'glass-pill text-white shadow-sm' : 'bg-[#282828] text-white hover:bg-[#333]'
            }`}
          >
            <Palette size={13} style={{ color: currentThemeDef.accentColor }} />
            <span>{currentThemeDef.name}</span>
          </button>
        </div>
      </div>

      {/* Aesthetic Horizontal Category Filter Chips (Dribbble Design) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? isVelvetLime
                    ? 'bg-[#D2F843] text-black shadow-md scale-105'
                    : 'bg-white text-black shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-[#a0a0b0] border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Aesthetic Curated & Trending Hero Banner (Dribbble Design) */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 bg-gradient-to-r from-[#D8B4FE] via-[#E9D5FF] to-[#C4B5FD] text-[#2E1065] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 z-10">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#2E1065]/10 text-[#4C1D95] mb-2 w-max">
            <Sparkles size={12} />
            <span>Curated & trending</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2E1065] tracking-tight">
            Discover weekly
          </h2>
          <p className="text-xs sm:text-sm text-[#4C1D95]/85 max-w-sm mt-1 mb-4 font-medium leading-relaxed">
            The original slow instrumental best playlists tailored for deep focus and chill moments.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectPlaylist(mockPlaylists[0])}
              className="px-5 py-2.5 rounded-full bg-[#2E1065] hover:bg-[#1E0B4B] text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Play size={14} fill="currentColor" className="ml-0.5" />
              <span>Listen Now</span>
            </button>
            <button
              onClick={() => onSelectPlaylist(mockPlaylists[0])}
              className="p-2.5 rounded-full bg-white/40 hover:bg-white/70 text-[#2E1065] transition-colors"
            >
              <Heart size={16} />
            </button>
          </div>
        </div>

        <div className="relative flex-shrink-0 self-center sm:self-auto">
          <img
            src={mockPlaylists[0]?.images[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300'}
            alt="Discover Weekly"
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-2xl border-2 border-white/60"
          />
        </div>
      </div>

      {/* Quick Launch Cards (Grid of 6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mockPlaylists.slice(0, 6).map((playlist) => (
          <QuickPlayCard
            key={playlist.id}
            playlist={playlist}
            onClick={() => onSelectPlaylist(playlist)}
          />
        ))}
      </div>

      {/* Made for You / Featured Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white hover:underline cursor-pointer">
            Made For You
          </h2>
          <span className="text-xs font-bold text-[#b3b3b3] hover:underline cursor-pointer uppercase">
            Show all
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mockPlaylists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              className={`group p-4 transition-all duration-200 cursor-pointer select-none relative ${
                isLiquidGlass ? 'glass-card rounded-2xl' : 'bg-[#181818] hover:bg-[#282828] rounded-lg'
              }`}
            >
              <div className="relative mb-3">
                <img
                  src={pl.images[0]?.url}
                  alt={pl.name}
                  loading="lazy"
                  decoding="async"
                  width={200}
                  height={200}
                  className="w-full aspect-square object-cover rounded shadow-lg bg-[#282828]"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlaylist(pl);
                  }}
                  className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1db954] hover:scale-105 hover:bg-[#1ed760] flex items-center justify-center text-black shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200"
                >
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                </button>
              </div>
              <h3 className="text-base font-bold text-white truncate mb-1">{pl.name}</h3>
              <p className="text-xs text-[#b3b3b3] line-clamp-2">{pl.description}</p>
            </div>
          ))}
        </div>
      </div>

      <ServerSettingsModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
};

const QuickPlayCard: React.FC<{ playlist: Playlist; onClick: () => void }> = ({
  playlist,
  onClick,
}) => {
  const { isLiquidGlass } = useTheme();
  const firstTrack = playlist.tracks[0];
  const { isActive, isPlaying, togglePlay } = usePlayContextItem({
    uri: firstTrack?.uri || playlist.uri,
  });

  return (
    <div
      onClick={onClick}
      className={`group flex items-center overflow-hidden transition-all cursor-pointer select-none ${
        isLiquidGlass ? 'glass-card rounded-xl' : 'bg-[#ffffff14] hover:bg-[#ffffff33] rounded'
      }`}
    >
      <img
        src={playlist.images[0]?.url}
        alt={playlist.name}
        loading="lazy"
        decoding="async"
        width={64}
        height={64}
        className="w-16 h-16 object-cover flex-shrink-0 shadow-md bg-[#282828]"
      />
      <span className="font-bold text-sm text-white px-4 flex-1 truncate">
        {playlist.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        className="mr-3 w-10 h-10 rounded-full bg-[#1db954] hover:scale-105 hover:bg-[#1ed760] flex items-center justify-center text-black shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-150"
      >
        <Play size={18} fill="currentColor" className="ml-0.5" />
      </button>
    </div>
  );
};
