import React, { useState, useMemo } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { usePlayback } from '../../context/PlaybackContext';
import { Playlist } from '../../types/spotify';
import { captureTransitionOrigin } from '../../utils/motion';
import {
  Plus,
  Heart,
  Clock,
  Music,
  X,
  Search as SearchIcon,
  LayoutGrid,
  List,
  Play,
  Pause,
  FolderPlus,
  Sparkles,
  Palette,
} from 'lucide-react';

interface LibraryRouteProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const LibraryRoute: React.FC<LibraryRouteProps> = ({ onSelectPlaylist }) => {
  const { allPlaylists, createPlaylist } = useLibrary();
  const {
    isLiquidGlass,
    isVelvetLime,
    isUltraviolet,
    isVelvetStyle,
    isAurora,
    isSunset,
    isFrost,
    currentThemeDef,
    openThemeModal,
  } = useTheme();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayback();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'forYou' | 'playlists' | 'favorites' | 'recent' | 'custom'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const libraryTabs = [
    { id: 'all', label: 'All' },
    { id: 'forYou', label: 'Made For You' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'favorites', label: 'Liked Songs' },
    { id: 'recent', label: 'Recently Played' },
    { id: 'custom', label: 'Created by You' },
  ] as const;

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const created = createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsModalOpen(false);
    onSelectPlaylist(created);
  };

  // Instant Real-Time Library Search & Filtering
  const filteredPlaylists = useMemo(() => {
    let list = allPlaylists;

    if (activeTab === 'favorites') {
      list = list.filter((p) => p.id === 'playlist-favorites');
    } else if (activeTab === 'recent') {
      list = list.filter((p) => p.id === 'playlist-recently-played');
    } else if (activeTab === 'forYou') {
      list = list.filter(
        (p) => p.id === 'playlist-recommended-for-you' || p.id === 'playlist-discover-weekly'
      );
    } else if (activeTab === 'custom') {
      list = list.filter((p) => p.id.startsWith('custom-playlist-'));
    } else if (activeTab === 'playlists') {
      list = list.filter(
        (p) => p.id !== 'playlist-favorites' && p.id !== 'playlist-recently-played'
      );
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.owner.displayName.toLowerCase().includes(q) ||
          p.tracks.some(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.artists.some((a) => a.name.toLowerCase().includes(q))
          )
      );
    }

    return list;
  }, [allPlaylists, activeTab, searchTerm]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-8 select-none scrollbar-none space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <span
            className={`text-[11px] uppercase tracking-wider font-semibold block -mb-0.5 ${
              isFrost ? 'text-slate-600' : 'text-[#8E8E9F]'
            }`}
          >
            Your Personal Audio Hub
          </span>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight font-sans ${
              isFrost ? 'text-slate-900' : 'text-white'
            }`}
          >
            Your Library
          </h1>
        </div>

        {/* Action Controls: Theme Switcher + View Mode Toggle + New Playlist */}
        <div className="flex items-center gap-2.5">
          {/* Frosted Theme Switcher Button */}
          <button
            onClick={openThemeModal}
            title={`Theme: ${currentThemeDef.name} (Click to switch)`}
            className={`frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isFrost
                ? 'text-slate-900 bg-white/80 border-slate-300 shadow-sm hover:bg-white'
                : 'text-white'
            }`}
          >
            <Palette size={17} style={{ color: currentThemeDef.accentColor }} />
          </button>

          {/* View Mode Toggle Button */}
          <div
            style={{
              backdropFilter: 'blur(10px) saturate(140%)',
              WebkitBackdropFilter: 'blur(10px) saturate(140%)',
              boxShadow: isFrost
                ? 'inset 0 1px 1.5px rgba(255,255,255,0.9), 0 4px 12px rgba(15,23,42,0.06)'
                : 'inset 0 1px 1.5px rgba(255,255,255,0.35), 0 4px 14px rgba(0,0,0,0.35)',
            }}
            className={`inline-flex items-center p-1 rounded-full border ${
              isFrost ? 'border-slate-300/80 bg-white/80' : 'border-white/20 bg-white/[0.08]'
            }`}
          >
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? isFrost
                    ? 'bg-slate-900 text-white shadow-sm'
                    : isAurora
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : isSunset
                    ? 'bg-rose-500 text-white shadow-sm'
                    : isVelvetLime
                    ? 'bg-[#D2F843] text-black shadow-sm'
                    : 'bg-white text-slate-950 shadow-sm'
                  : isFrost
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'list'
                  ? isFrost
                    ? 'bg-slate-900 text-white shadow-sm'
                    : isAurora
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : isSunset
                    ? 'bg-rose-500 text-white shadow-sm'
                    : isVelvetLime
                    ? 'bg-[#D2F843] text-black shadow-sm'
                    : 'bg-white text-slate-950 shadow-sm'
                  : isFrost
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <List size={15} />
            </button>
          </div>

          {/* New Playlist Specular Pill Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              backdropFilter: 'blur(16px) saturate(185%)',
              WebkitBackdropFilter: 'blur(16px) saturate(185%)',
              boxShadow: isFrost
                ? 'inset 0 1.5px 1px rgba(255,255,255,0.95), 0 6px 16px rgba(15,23,42,0.1)'
                : 'inset 0 1.5px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.35)',
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
              isFrost
                ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900 shadow-sm'
                : isAurora
                ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 border-emerald-300'
                : isSunset
                ? 'bg-rose-500 text-white hover:bg-rose-400 border-rose-400'
                : isVelvetLime
                ? 'bg-[#D2F843] text-black hover:bg-[#c3e834] border-[#D2F843]'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/30'
            }`}
          >
            <Plus size={16} />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Integrated Library Search Bar (iOS Liquid Glass Bar) */}
      <div className="relative flex items-center w-full">
        <SearchIcon
          className={`absolute left-4 pointer-events-none ${
            isFrost ? 'text-slate-500' : 'text-white/60'
          }`}
          size={18}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search playlists, tracks, or artists in your library..."
          style={{
            backdropFilter: 'blur(16px) saturate(185%)',
            WebkitBackdropFilter: 'blur(16px) saturate(185%)',
            boxShadow: isFrost
              ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), 0 8px 24px -4px rgba(15,23,42,0.06)'
              : 'inset 0 1.5px 1.5px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(255,255,255,0.1), 0 12px 28px -6px rgba(0,0,0,0.45)',
          }}
          className={`w-full text-sm font-medium rounded-full py-3 pl-11 pr-11 outline-none border transition-all ${
            isFrost
              ? 'bg-white/80 border-slate-300/80 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white'
              : isAurora
              ? 'bg-white/[0.06] border-white/25 text-white placeholder-white/45 focus:border-emerald-400/60 focus:bg-white/[0.12]'
              : isSunset
              ? 'bg-white/[0.06] border-white/25 text-white placeholder-white/45 focus:border-rose-400/60 focus:bg-white/[0.12]'
              : isVelvetLime
              ? 'bg-white/[0.06] border-white/25 text-white placeholder-white/45 focus:border-[#D2F843]/60 focus:bg-white/[0.12]'
              : 'bg-white/[0.06] border-white/25 text-white placeholder-white/45 focus:border-white/55 focus:bg-white/[0.12]'
          }`}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
            className={`absolute right-3.5 p-1 rounded-full transition-colors cursor-pointer ${
              isFrost ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* iOS Segmented Category Filter Chips */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div
          style={{
            backdropFilter: 'blur(16px) saturate(185%)',
            WebkitBackdropFilter: 'blur(16px) saturate(185%)',
            boxShadow: isFrost
              ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), 0 8px 24px -4px rgba(15,23,42,0.06)'
              : 'inset 0 1.5px 1.5px rgba(255,255,255,0.45), inset 0 -1px 1.5px rgba(255,255,255,0.12), 0 12px 28px -6px rgba(0,0,0,0.45)',
          }}
          className={`inline-flex items-center gap-1.5 p-1.5 rounded-full border ${
            isFrost ? 'border-slate-200/90 bg-white/75' : 'border-white/25 bg-white/[0.06]'
          }`}
        >
          {libraryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? isFrost
                      ? 'bg-slate-900 text-white shadow-sm'
                      : isAurora
                      ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                      : isSunset
                      ? 'bg-rose-500 text-white font-bold shadow-sm'
                      : isVelvetLime
                      ? 'bg-[#D2F843] text-black font-bold shadow-sm'
                      : 'bg-white text-slate-950 shadow-sm'
                    : isFrost
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Grid vs List View */}
      {filteredPlaylists.length === 0 ? (
        <div
          style={{
            backdropFilter: 'blur(16px) saturate(185%)',
            WebkitBackdropFilter: 'blur(16px) saturate(185%)',
          }}
          className={`py-16 text-center rounded-[24px] border p-6 flex flex-col items-center justify-center ${
            isFrost
              ? 'border-slate-200/90 bg-white/60 text-slate-700'
              : 'border-white/20 bg-white/[0.04] text-white/70'
          }`}
        >
          <FolderPlus size={36} className={isFrost ? 'text-slate-400 mb-3' : 'text-white/40 mb-3'} />
          <h3 className={`text-base font-bold mb-1 ${isFrost ? 'text-slate-900' : 'text-white'}`}>
            No collections match "{searchTerm}"
          </h3>
          <p className="text-xs max-w-sm mb-4">
            Try searching for another keyword or create a brand new playlist to get started.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setActiveTab('all');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border ${
              isFrost
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-white/20 hover:bg-white/30 text-white border-white/30'
            }`}
          >
            Clear Search Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* iOS Liquid Glass Card Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredPlaylists.map((pl, idx) => {
            const isFavorites = pl.id === 'playlist-favorites';
            const isRecentlyPlayed = pl.id === 'playlist-recently-played';
            const isCurrentPlaylistPlaying =
              isPlaying && pl.tracks.some((t) => t.id === currentTrack?.id);

            return (
              <div
                key={pl.id}
                onClick={(e) => {
                  captureTransitionOrigin(e.currentTarget, pl.images[0]?.url);
                  onSelectPlaylist(pl);
                }}
                style={{
                  '--stagger-i': Math.min(idx, 10),
                  contain: 'layout paint',
                  boxShadow: isFrost
                    ? 'inset 0 1px 1px rgba(255,255,255,0.95), 0 10px 22px -8px rgba(15,23,42,0.08)'
                    : 'inset 0 1px 1px rgba(255,255,255,0.28), 0 12px 26px -10px rgba(0,0,0,0.45)',
                } as React.CSSProperties}
                className={`group relative overflow-hidden rounded-[22px] p-3 border transition-colors duration-200 cursor-pointer select-none active:scale-[0.99] anim-stagger-item ${
                  isFrost
                    ? 'border-slate-200/90 bg-white/80 hover:bg-white/95 hover:border-slate-300'
                    : isAurora
                    ? 'border-emerald-400/25 bg-white/[0.08] hover:bg-white/[0.13] hover:border-emerald-400/50'
                    : isSunset
                    ? 'border-rose-400/25 bg-white/[0.08] hover:bg-white/[0.13] hover:border-rose-400/50'
                    : isVelvetLime
                    ? 'border-white/20 bg-white/[0.08] hover:bg-white/[0.13] hover:border-[#D2F843]/40'
                    : 'border-white/25 bg-white/[0.08] hover:bg-white/[0.13] hover:border-white/45'
                }`}
              >
                {/* Subtle Internal Liquid Caustic Sheen */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 opacity-45 transition-colors duration-300 ${
                    isFrost
                      ? 'bg-gradient-to-tr from-sky-400/10 via-transparent to-indigo-300/15 group-hover:from-sky-400/20 group-hover:to-indigo-300/25'
                      : isAurora
                      ? 'bg-gradient-to-tr from-emerald-400/15 via-transparent to-cyan-300/20 group-hover:from-emerald-400/25 group-hover:to-cyan-300/30'
                      : isSunset
                      ? 'bg-gradient-to-tr from-rose-500/15 via-transparent to-amber-300/15 group-hover:from-rose-500/25 group-hover:to-amber-300/25'
                      : isVelvetLime
                      ? 'bg-gradient-to-tr from-[#D2F843]/10 via-transparent to-fuchsia-400/20 group-hover:from-[#D2F843]/20 group-hover:to-purple-400/25'
                      : 'bg-gradient-to-tr from-cyan-400/15 via-transparent to-fuchsia-400/20 group-hover:from-emerald-300/20 group-hover:to-cyan-200/20'
                  }`}
                />

                {/* Artwork Area */}
                <div className="relative z-10 mb-2.5">
                  {isFavorites ? (
                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg border border-white/20">
                      <Heart size={34} className="text-white fill-white drop-shadow-md" />
                    </div>
                  ) : isRecentlyPlayed ? (
                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg border border-white/20">
                      <Clock size={34} className="text-white drop-shadow-md" />
                    </div>
                  ) : pl.id === 'playlist-recommended-for-you' ? (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg border border-white/20 bg-gradient-to-br from-fuchsia-600 via-violet-600 to-cyan-500 flex items-center justify-center">
                      {pl.images[0] && (
                        <img
                          src={pl.images[0].url}
                          alt={pl.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-overlay"
                        />
                      )}
                      <Sparkles size={34} className="text-white drop-shadow-md relative z-10" />
                    </div>
                  ) : pl.images[0] ? (
                    <img
                      src={pl.images[0].url}
                      alt={pl.name}
                      loading="lazy"
                      decoding="async"
                      className={`w-full aspect-square object-cover rounded-xl border shadow-md ${
                        isFrost ? 'border-slate-200 bg-white' : 'border-white/20 bg-slate-950/60'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-full aspect-square rounded-xl flex items-center justify-center border shadow-md ${
                        isFrost ? 'border-slate-200 bg-slate-100' : 'border-white/20 bg-white/10'
                      }`}
                    >
                      <Music size={32} className={isFrost ? 'text-slate-400' : 'text-white/40'} />
                    </div>
                  )}

                  {/* Specular Floating Play Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const first = pl.tracks[0];
                      if (!first) return;
                      if (isCurrentPlaylistPlaying) {
                        togglePlay();
                      } else {
                        playTrack(first, pl.tracks);
                      }
                    }}
                    style={{
                      boxShadow: isFrost
                        ? 'inset 0 1.5px 1px rgba(255,255,255,0.95), 0 8px 20px rgba(15,23,42,0.15)'
                        : 'inset 0 1.5px 1px rgba(255,255,255,0.85), 0 10px 24px rgba(0,0,0,0.45)',
                    }}
                    className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full border backdrop-blur-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isCurrentPlaylistPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 hover:scale-105'
                    } ${
                      isFrost
                        ? 'bg-slate-900 text-white border-slate-800'
                        : isAurora
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                        : isSunset
                        ? 'bg-rose-500 text-white border-rose-400 font-bold'
                        : isVelvetLime
                        ? 'bg-[#D2F843] text-black border-[#D2F843]'
                        : 'bg-white text-slate-950 border-white'
                    }`}
                  >
                    {isCurrentPlaylistPlaying ? (
                      <Pause size={18} fill="currentColor" />
                    ) : (
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Metadata */}
                <h3
                  className={`relative z-10 text-sm font-bold truncate font-sans ${
                    isFrost ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {pl.name}
                </h3>
                <p
                  className={`relative z-10 text-xs truncate font-medium mt-0.5 ${
                    isFrost ? 'text-slate-600' : 'text-white/65'
                  }`}
                >
                  {isFavorites
                    ? `${pl.tracks.length} liked songs`
                    : isRecentlyPlayed
                    ? `${pl.tracks.length} recently played`
                    : `${pl.tracks.length} songs • ${pl.owner.displayName}`}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* iOS Liquid Glass List View */
        <div className="space-y-2">
          {filteredPlaylists.map((pl, idx) => {
            const isFavorites = pl.id === 'playlist-favorites';
            const isRecentlyPlayed = pl.id === 'playlist-recently-played';
            const isCurrentPlaylistPlaying =
              isPlaying && pl.tracks.some((t) => t.id === currentTrack?.id);

            return (
              <div
                key={pl.id}
                onClick={(e) => {
                  captureTransitionOrigin(e.currentTarget, pl.images[0]?.url);
                  onSelectPlaylist(pl);
                }}
                style={{
                  '--stagger-i': Math.min(idx, 10),
                  contain: 'layout paint',
                  boxShadow: isFrost
                    ? 'inset 0 1px 1px rgba(255,255,255,0.9), 0 8px 18px -6px rgba(15,23,42,0.06)'
                    : 'inset 0 1px 1px rgba(255,255,255,0.24), 0 8px 20px -6px rgba(0,0,0,0.35)',
                } as React.CSSProperties}
                className={`group flex items-center justify-between p-3 rounded-2xl border transition-colors duration-200 cursor-pointer select-none active:scale-[0.99] anim-stagger-item ${
                  isFrost
                    ? 'border-slate-200/90 bg-white/80 hover:bg-white/95 hover:border-slate-300'
                    : isAurora
                    ? 'border-emerald-400/20 bg-white/[0.08] hover:bg-white/[0.13] hover:border-emerald-400/45'
                    : isSunset
                    ? 'border-rose-400/20 bg-white/[0.08] hover:bg-white/[0.13] hover:border-rose-400/45'
                    : isVelvetLime
                    ? 'border-white/20 bg-white/[0.08] hover:bg-white/[0.13] hover:border-[#D2F843]/40'
                    : 'border-white/20 bg-white/[0.08] hover:bg-white/[0.13] hover:border-white/40'
                }`}
              >
                {/* Left: Artwork + Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {isFavorites ? (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0 shadow border border-white/20">
                      <Heart size={20} className="text-white fill-white" />
                    </div>
                  ) : isRecentlyPlayed ? (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center flex-shrink-0 shadow border border-white/20">
                      <Clock size={20} className="text-white" />
                    </div>
                  ) : pl.id === 'playlist-recommended-for-you' ? (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow border border-white/20">
                      <Sparkles size={20} className="text-white" />
                    </div>
                  ) : pl.images[0] ? (
                    <img
                      src={pl.images[0].url}
                      alt={pl.name}
                      className={`w-12 h-12 rounded-xl object-cover flex-shrink-0 border shadow ${
                        isFrost ? 'border-slate-200 bg-white' : 'border-white/20 bg-slate-950/60'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                        isFrost ? 'border-slate-200 bg-slate-100' : 'border-white/20 bg-white/10'
                      }`}
                    >
                      <Music size={20} className={isFrost ? 'text-slate-400' : 'text-white/40'} />
                    </div>
                  )}

                  <div className="truncate">
                    <h3
                      className={`text-sm font-bold truncate font-sans ${
                        isFrost
                          ? 'text-slate-900 group-hover:text-sky-700'
                          : isAurora
                          ? 'text-white group-hover:text-emerald-300'
                          : isSunset
                          ? 'text-white group-hover:text-rose-300'
                          : isVelvetLime
                          ? 'text-white group-hover:text-[#D2F843]'
                          : 'text-white group-hover:text-cyan-200'
                      }`}
                    >
                      {pl.name}
                    </h3>
                    <p
                      className={`text-xs truncate font-medium mt-0.5 ${
                        isFrost ? 'text-slate-600' : 'text-white/65'
                      }`}
                    >
                      {isFavorites
                        ? `Special Collection • ${pl.tracks.length} tracks`
                        : isRecentlyPlayed
                        ? `Live History • ${pl.tracks.length} tracks`
                        : `Playlist • ${pl.tracks.length} songs • ${pl.owner.displayName}`}
                    </p>
                  </div>
                </div>

                {/* Right: Quick Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const first = pl.tracks[0];
                    if (!first) return;
                    if (isCurrentPlaylistPlaying) {
                      togglePlay();
                    } else {
                      playTrack(first, pl.tracks);
                    }
                  }}
                  className={`w-9 h-9 rounded-full border backdrop-blur-md flex items-center justify-center transition-all cursor-pointer mr-1 ${
                    isFrost
                      ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 border-slate-300'
                      : isVelvetLime
                      ? 'bg-white/10 hover:bg-[#D2F843] text-white hover:text-black border-white/25 hover:border-[#D2F843]'
                      : 'bg-white/15 hover:bg-white/30 text-white border-white/35'
                  }`}
                >
                  {isCurrentPlaylistPlaying ? (
                    <Pause size={15} fill="currentColor" />
                  ) : (
                    <Play size={15} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* iOS Liquid Glass "Create Playlist" Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            style={{
              backdropFilter: 'blur(14px) saturate(150%)',
              WebkitBackdropFilter: 'blur(14px) saturate(150%)',
              boxShadow: isFrost
                ? 'inset 0 1.5px 2px rgba(255,255,255,0.95), 0 24px 60px -12px rgba(15,23,42,0.25)'
                : 'inset 0 1.5px 2px rgba(255,255,255,0.6), 0 28px 60px -12px rgba(0,0,0,0.7)',
            }}
            className={`w-full max-w-sm rounded-[28px] border p-6 select-none transition-all ${
              isFrost ? 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl' : 'bg-[#181824]/90 border-white/20 text-white shadow-2xl'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className={isFrost ? 'text-sky-600' : 'text-[#D2F843]'} />
                <h3 className={`text-lg font-bold font-sans ${isFrost ? 'text-slate-900' : 'text-white'}`}>
                  Create New Playlist
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isFrost ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist}>
              <div className="mb-5">
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                    isFrost ? 'text-slate-600' : 'text-white/70'
                  }`}
                >
                  Playlist Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Midnight Beats, Road Trip..."
                  className={`w-full text-sm font-medium rounded-xl px-3.5 py-2.5 outline-none border transition-all ${
                    isFrost
                      ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white'
                      : 'bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white/50 focus:bg-white/15'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    isFrost ? 'text-slate-600 hover:text-slate-950' : 'text-white/75 hover:text-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-40 ${
                    isFrost
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : isAurora
                      ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                      : isSunset
                      ? 'bg-rose-500 text-white hover:bg-rose-400'
                      : isVelvetLime
                      ? 'bg-[#D2F843] text-black hover:bg-[#c2e833]'
                      : 'bg-white text-slate-950 hover:bg-white/90'
                  }`}
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
