import React, { useState } from 'react';
import { Home, Search, Library, Plus, Heart, Clock, Music, X, Moon, Sparkles } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { Playlist } from '../../types/spotify';

interface SidebarNavProps {
  currentView: 'home' | 'search' | 'library' | 'playlist';
  setCurrentView: (view: 'home' | 'search' | 'library' | 'playlist') => void;
  selectedPlaylist: Playlist | null;
  setSelectedPlaylist: (playlist: Playlist) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentView,
  setCurrentView,
  selectedPlaylist,
  setSelectedPlaylist,
}) => {
  const { allPlaylists, createPlaylist } = useLibrary();
  const { theme, setTheme, isLiquidGlass } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createPlaylist(newPlaylistName);
    setNewPlaylistName('');
    setIsModalOpen(false);
    setSelectedPlaylist(created);
    setCurrentView('playlist');
  };

  return (
    <aside className="w-64 bg-transparent p-0 flex flex-col gap-2.5 select-none h-full relative z-20">
      {/* Top Navigation Box */}
      <div
        className={`flex flex-col gap-3 transition-all duration-300 ${
          isLiquidGlass ? 'glass-panel rounded-2xl p-3.5' : 'bg-[#121212] rounded-lg p-4'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-1 py-1 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1db954] to-[#10b981] flex items-center justify-center shadow-lg shadow-[#1db954]/20 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-black">
              <path
                d="M4 6C4 4.89543 4.89543 4 6 4H14C16.2091 4 18 5.79086 18 8C18 9.38241 17.3007 10.6015 16.2361 11.3246C17.8878 12.0152 19 13.6288 19 15.5C19 18.5376 16.5376 21 13.5 21H6C4.89543 21 4 20.1046 4 19V6Z"
                fill="currentColor"
              />
              <circle cx="10" cy="8.5" r="1.5" fill="#1db954" />
              <circle cx="10" cy="15.5" r="1.5" fill="#1db954" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-white leading-none">
              Byte<span className="text-[#1db954]">Music</span>
            </span>
            <span className="text-[10px] text-[#b3b3b3] font-medium tracking-wider uppercase mt-0.5">
              High-Fidelity Audio
            </span>
          </div>
        </div>

        <button
          onClick={() => setCurrentView('home')}
          className={`flex items-center gap-4 text-sm font-bold transition-colors ${
            currentView === 'home' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <Home size={22} />
          <span>Home</span>
        </button>
        <button
          onClick={() => setCurrentView('search')}
          className={`flex items-center gap-4 text-sm font-bold transition-colors ${
            currentView === 'search' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <Search size={22} />
          <span>Search</span>
        </button>

        {/* Theme Switcher Pill */}
        <div
          className={`mt-1 p-1 rounded-xl flex items-center transition-all ${
            isLiquidGlass ? 'glass-pill' : 'bg-[#1a1a1a] border border-[#2a2a2a]'
          }`}
        >
          <button
            onClick={() => setTheme('dark')}
            title="Switch to Spotify Classic Dark theme"
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-[#282828] text-white shadow-sm font-bold'
                : 'text-[#909090] hover:text-white'
            }`}
          >
            <Moon size={13} />
            <span>Dark</span>
          </button>
          <button
            onClick={() => setTheme('liquid-glass')}
            title="Switch to Liquid Glass iPhone style theme"
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              theme === 'liquid-glass'
                ? 'bg-gradient-to-r from-indigo-500/80 via-purple-500/80 to-pink-500/80 text-white shadow-md font-bold'
                : 'text-[#909090] hover:text-white'
            }`}
          >
            <Sparkles size={13} className={theme === 'liquid-glass' ? 'text-cyan-200 animate-pulse' : ''} />
            <span>Liquid Glass</span>
          </button>
        </div>
      </div>

      {/* Your Library Box */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          isLiquidGlass ? 'glass-panel rounded-2xl p-3' : 'bg-[#121212] rounded-lg p-3'
        }`}
      >
        {/* Library Header */}
        <div className="flex items-center justify-between px-2 py-1 mb-2 text-[#b3b3b3]">
          <div className="flex items-center gap-3 hover:text-white cursor-pointer transition-colors">
            <Library size={24} />
            <span className="font-bold text-sm">Your Library</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            title="Create Playlist"
            className="p-1 rounded-full hover:bg-[#282828] hover:text-white transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {allPlaylists.map((pl) => {
            const isSelected = selectedPlaylist?.id === pl.id && currentView === 'playlist';
            const isFavorites = pl.id === 'playlist-favorites';
            const isRecentlyPlayed = pl.id === 'playlist-recently-played';

            return (
              <div
                key={pl.id}
                onClick={() => {
                  setSelectedPlaylist(pl);
                  setCurrentView('playlist');
                }}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#282828] text-white' : 'hover:bg-[#1a1a1a] text-[#b3b3b3] hover:text-white'
                }`}
              >
                {/* Custom Styled Covers for Special Playlists */}
                {isFavorites ? (
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center flex-shrink-0 shadow">
                    <Heart size={20} className="text-white fill-white" />
                  </div>
                ) : isRecentlyPlayed ? (
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-[#059669] to-[#10b981] flex items-center justify-center flex-shrink-0 shadow">
                    <Clock size={20} className="text-white" />
                  </div>
                ) : pl.images[0] ? (
                  <img
                    src={pl.images[0].url}
                    alt={pl.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#282828] flex items-center justify-center flex-shrink-0">
                    <Music size={20} className="text-[#b3b3b3]" />
                  </div>
                )}

                <div className="flex flex-col truncate">
                  <span className={`text-sm font-medium truncate ${isSelected ? 'text-[#1db954]' : 'text-white'}`}>
                    {pl.name}
                  </span>
                  <span className="text-xs text-[#b3b3b3] truncate">
                    {isFavorites
                      ? `Playlist • ${pl.tracks.length} songs`
                      : isRecentlyPlayed
                      ? `Tracker • ${pl.tracks.length} songs`
                      : `Playlist • ${pl.owner.displayName}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Playlist Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#282828] border border-[#383838] rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Create New Playlist</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#b3b3b3] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#b3b3b3] mb-1.5 uppercase tracking-wider">
                  Playlist Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Chill Vibes, Workout 2026..."
                  className="w-full bg-[#3e3e3e] focus:bg-[#484848] text-white placeholder-[#757575] text-sm rounded-md px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1db954] transition-all"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white hover:scale-105 transition-transform"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1db954] text-black text-sm font-bold hover:scale-105 hover:bg-[#1ed760] transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
