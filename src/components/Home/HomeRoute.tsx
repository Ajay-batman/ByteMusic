import React, { useState } from 'react';
import { mockPlaylists, mockTracks } from '../../data/mockSpotifyCatalog';
import { Playlist, Track } from '../../types/spotify';
import { Play, Moon, Sparkles, Server } from 'lucide-react';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { useTheme } from '../../context/ThemeContext';
import { ServerSettingsModal } from '../Common/ServerSettingsModal';

interface HomeRouteProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const HomeRoute: React.FC<HomeRouteProps> = ({ onSelectPlaylist }) => {
  const { isLiquidGlass, toggleTheme } = useTheme();
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 sm:space-y-8">
      {/* Greeting Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Good afternoon</h1>
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
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isLiquidGlass ? 'glass-pill text-white shadow-sm' : 'bg-[#282828] text-white'
            }`}
          >
            {isLiquidGlass ? (
              <>
                <Sparkles size={13} className="text-cyan-300" />
                <span>Liquid Glass</span>
              </>
            ) : (
              <>
                <Moon size={13} />
                <span>Dark</span>
              </>
            )}
          </button>
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
