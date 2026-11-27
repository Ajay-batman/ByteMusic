import React, { useState } from 'react';
import { Home, Search, Library, Plus, Heart, Clock, Music, X, Palette } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { AppView, Playlist } from '../../types/spotify';

interface SidebarNavProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
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
  const {
    isLiquidGlass,
    isVelvetLime,
    isUltraviolet,
    isGlacialGlass,
    isFrost,
    isAurora,
    isSunset,
    isVelvetStyle,
    openThemeModal,
    currentThemeDef,
  } = useTheme();
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
          isFrost
            ? 'bg-white/75 backdrop-blur-xl rounded-2xl p-4 text-slate-800 border border-white/90 shadow-xl'
            : isGlacialGlass
            ? 'glacial-sculpted-dock rounded-2xl p-4 text-slate-800 border border-white/80'
            : isVelvetStyle
            ? 'frosted-3d-dock rounded-2xl p-4'
            : isUltraviolet
            ? 'glass-panel rounded-2xl p-4'
            : isLiquidGlass
            ? 'glass-panel rounded-2xl p-3.5'
            : 'bg-[#121212] rounded-lg p-4'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center px-1 py-1 mb-1">
          <img
            src="/bytemusic-logo.svg"
            alt="ByteMusic"
            className="h-8 w-auto object-contain"
          />
        </div>

        <button
          onClick={() => setCurrentView('home')}
          className={`flex items-center gap-3.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
            currentView === 'home'
              ? isFrost
                ? 'bg-slate-900 text-white shadow-sm'
                : isGlacialGlass
                ? 'bg-white/80 text-slate-900 shadow-sm border border-white/90'
                : isAurora
                ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-400/25'
                : isSunset
                ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/25'
                : isUltraviolet
                ? 'bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white shadow-[0_0_16px_rgba(217,70,239,0.45)]'
                : isVelvetLime
                ? 'bg-[#D2F843] text-black shadow-lg shadow-[#D2F843]/20'
                : 'text-white'
              : isFrost
              ? 'text-slate-600 hover:text-slate-950 hover:bg-black/5'
              : isGlacialGlass
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <Home size={21} strokeWidth={currentView === 'home' && (isVelvetStyle || isUltraviolet || isGlacialGlass) ? 2.5 : 2} />
          <span>Home</span>
        </button>
        <button
          onClick={() => setCurrentView('search')}
          className={`flex items-center gap-3.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
            currentView === 'search'
              ? isFrost
                ? 'bg-slate-900 text-white shadow-sm'
                : isGlacialGlass
                ? 'bg-white/80 text-slate-900 shadow-sm border border-white/90'
                : isAurora
                ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-400/25'
                : isSunset
                ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/25'
                : isUltraviolet
                ? 'bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white shadow-[0_0_16px_rgba(217,70,239,0.45)]'
                : isVelvetLime
                ? 'bg-[#D2F843] text-black shadow-lg shadow-[#D2F843]/20'
                : 'text-white'
              : isFrost
              ? 'text-slate-600 hover:text-slate-950 hover:bg-black/5'
              : isGlacialGlass
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <Search size={21} strokeWidth={currentView === 'search' && (isVelvetStyle || isUltraviolet || isGlacialGlass) ? 2.5 : 2} />
          <span>Search</span>
        </button>

        {/* Theme Styles Button */}
        <button
          onClick={openThemeModal}
          title="Browse & switch theme styles"
          className={`mt-1 p-2 rounded-xl flex items-center justify-between w-full transition-all text-xs font-semibold ${
            isFrost
              ? 'bg-white/80 border border-slate-900/10 text-slate-900 shadow-sm hover:bg-white'
              : isGlacialGlass
              ? 'bg-white/60 border border-white/80 text-slate-900 shadow-sm'
              : isUltraviolet || isVelvetStyle
              ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-white'
              : isLiquidGlass
              ? 'glass-pill'
              : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#252525]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Palette size={14} style={{ color: currentThemeDef.accentColor }} />
            <span className={`${isGlacialGlass || isFrost ? 'text-slate-900' : 'text-white'} font-medium`}>{currentThemeDef.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] ${isGlacialGlass || isFrost ? 'text-slate-500' : 'text-[#b3b3b3]'} uppercase tracking-wider font-bold`}>Themes</span>
            <div className="flex items-center -space-x-1">
              {currentThemeDef.previewColors.map((c, i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full border border-black/50"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </button>
      </div>

      {/* Your Library Box */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          isFrost
            ? 'bg-white/75 backdrop-blur-xl rounded-2xl p-3.5 border border-white/90 shadow-xl text-slate-800'
            : isGlacialGlass
            ? 'glacial-sculpted-dock rounded-2xl p-3.5 border border-white/80 text-slate-800'
            : isVelvetStyle
            ? 'frosted-3d-dock rounded-2xl p-3.5'
            : isUltraviolet
            ? 'glass-panel rounded-2xl p-3.5'
            : isLiquidGlass
            ? 'glass-panel rounded-2xl p-3'
            : 'bg-[#121212] rounded-lg p-3'
        }`}
      >
        {/* Library Header */}
        <div className={`flex items-center justify-between px-2 py-1 mb-2 ${
          isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'
        }`}>
          <div className={`flex items-center gap-3 cursor-pointer transition-colors ${
            isFrost ? 'hover:text-slate-950 text-slate-800' : 'hover:text-white'
          }`}>
            <Library size={24} />
            <span className="font-bold text-sm">Your Library</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            title="Create Playlist"
            className={`p-1 rounded-full transition-colors ${
              isFrost ? 'hover:bg-black/5 text-slate-700 hover:text-slate-950' : 'hover:bg-[#282828] hover:text-white'
            }`}
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
                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? isFrost
                      ? 'bg-slate-900/10 text-slate-950 font-bold border border-slate-900/15'
                      : isUltraviolet
                      ? 'bg-white/10 text-[#d946ef] border border-[#d946ef]/30 shadow-[0_0_10px_rgba(217,70,239,0.2)]'
                      : isAurora
                      ? 'bg-emerald-400/15 text-emerald-300 font-bold border border-emerald-400/30'
                      : isSunset
                      ? 'bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30'
                      : isVelvetLime
                      ? 'bg-white/10 text-[#D2F843] border border-white/10'
                      : 'bg-[#282828] text-white'
                    : isFrost
                    ? 'hover:bg-slate-900/5 text-slate-700 hover:text-slate-950'
                    : isUltraviolet
                    ? 'hover:bg-white/5 text-[#a5a6c2] hover:text-white'
                    : isVelvetStyle
                    ? 'hover:bg-white/5 text-[#9E9EA8] hover:text-white'
                    : 'hover:bg-[#1a1a1a] text-[#b3b3b3] hover:text-white'
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
                    loading="lazy"
                    decoding="async"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded object-cover flex-shrink-0 bg-[#282828]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#282828] flex items-center justify-center flex-shrink-0">
                    <Music size={20} className="text-[#b3b3b3]" />
                  </div>
                )}

                <div className="flex flex-col truncate">
                  <span
                    className={`text-sm font-medium truncate ${
                      isSelected
                        ? isFrost
                          ? 'text-sky-600 font-bold'
                          : isAurora
                          ? 'text-emerald-300 font-bold'
                          : isSunset
                          ? 'text-rose-300 font-bold'
                          : isVelvetLime
                          ? 'text-[#D2F843]'
                          : 'text-[#1db954]'
                        : isFrost
                        ? 'text-slate-900'
                        : 'text-white'
                    }`}
                  >
                    {pl.name}
                  </span>
                  <span className={`text-xs truncate ${isFrost ? 'text-slate-500' : 'text-[#b3b3b3]'}`}>
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
          <div
            className={`border rounded-2xl p-6 w-full max-w-sm shadow-2xl ${
              isFrost
                ? 'bg-white/95 border-slate-200 text-slate-900'
                : 'bg-[#282828] border-[#383838] text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isFrost ? 'text-slate-900' : 'text-white'}`}>
                Create New Playlist
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={isFrost ? 'text-slate-500 hover:text-slate-900' : 'text-[#b3b3b3] hover:text-white'}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist}>
              <div className="mb-4">
                <label
                  className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${
                    isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'
                  }`}
                >
                  Playlist Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Chill Vibes, Workout 2026..."
                  className={`w-full text-sm rounded-lg px-3.5 py-2.5 outline-none transition-all border ${
                    isFrost
                      ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white'
                      : 'bg-[#3e3e3e] focus:bg-[#484848] border-transparent text-white placeholder-[#757575] focus:ring-2 focus:ring-[#1db954]'
                  }`}
                />
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold hover:scale-105 transition-transform ${
                    isFrost ? 'text-slate-600 hover:text-slate-900' : 'text-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-full text-sm font-bold hover:scale-105 transition-all ${
                    isFrost
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-[#1db954] text-black hover:bg-[#1ed760]'
                  }`}
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
