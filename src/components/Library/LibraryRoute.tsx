import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { Playlist } from '../../types/spotify';
import { Plus, Heart, Clock, Music, X } from 'lucide-react';

interface LibraryRouteProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const LibraryRoute: React.FC<LibraryRouteProps> = ({ onSelectPlaylist }) => {
  const { allPlaylists, createPlaylist } = useLibrary();
  const { isLiquidGlass } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const created = createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsModalOpen(false);
    onSelectPlaylist(created);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 md:pb-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Your Library
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-transform active:scale-95 ${
            isLiquidGlass
              ? 'glass-pill text-white'
              : 'bg-[#282828] text-white hover:bg-[#383838]'
          }`}
        >
          <Plus size={16} />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Playlist Grid / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {allPlaylists.map((pl) => {
          const isFavorites = pl.id === 'playlist-favorites';
          const isRecentlyPlayed = pl.id === 'playlist-recently-played';

          return (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              className={`flex items-center gap-3.5 p-3 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                isLiquidGlass
                  ? 'glass-card hover:border-white/40'
                  : 'bg-[#181818] hover:bg-[#282828]'
              }`}
            >
              {/* Cover Art */}
              {isFavorites ? (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center flex-shrink-0 shadow-md">
                  <Heart size={26} className="text-white fill-white" />
                </div>
              ) : isRecentlyPlayed ? (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#059669] to-[#10b981] flex items-center justify-center flex-shrink-0 shadow-md">
                  <Clock size={26} className="text-white" />
                </div>
              ) : pl.images[0] ? (
                <img
                  src={pl.images[0].url}
                  alt={pl.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[#282828] flex items-center justify-center flex-shrink-0 shadow-md">
                  <Music size={26} className="text-[#b3b3b3]" />
                </div>
              )}

              {/* Info */}
              <div className="flex flex-col truncate min-w-0 flex-1">
                <span className="text-sm font-bold text-white truncate mb-0.5">
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

      {/* Create Playlist Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#282828] border border-[#383838] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Create New Playlist</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#b3b3b3] hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist}>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-[#b3b3b3] mb-1.5 uppercase tracking-wider">
                  Playlist Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Road Trip, Gym Hits..."
                  className="w-full bg-[#3e3e3e] focus:bg-[#484848] text-white placeholder-[#757575] text-sm rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1db954] transition-all"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-5 py-2 rounded-full bg-[#1db954] text-black text-sm font-bold disabled:opacity-50 hover:bg-[#1ed760] transition-all shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
