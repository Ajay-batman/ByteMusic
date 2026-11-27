import React from 'react';
import { Playlist } from '../../types/spotify';
import { PlaylistTrackTable } from './PlaylistTrackTable';
import { Play, Pause, Heart, Trash2, Clock, Music, ArrowLeft, ArrowDownCircle, CheckCircle2, Shuffle, ChevronDown, RefreshCw, Globe, Sparkles, BookmarkPlus, Check } from 'lucide-react';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { useLibrary } from '../../context/LibraryContext';
import { useDownload } from '../../context/DownloadContext';
import { useTheme } from '../../context/ThemeContext';
import { CHART_REGIONS } from '../../services/tasteProfile';

interface PlaylistRouteProps {
  playlist: Playlist;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onBack?: () => void;
  backLabel?: string;
}

export const PlaylistRoute: React.FC<PlaylistRouteProps> = ({ playlist, onSelectPlaylist, onBack, backLabel = 'Library' }) => {
  const {
    removeTrackFromPlaylist,
    deletePlaylist,
    clearRecentlyPlayed,
    allPlaylists,
    customPlaylists,
    createPlaylist,
    chartRegion,
    setChartRegion,
    isLoadingTopHits,
    refreshTopHits,
    discoverWeekKey,
    isLoadingDiscover,
    refreshDiscoverWeekly,
    tasteProfile,
    isLoadingRecommendations,
    refreshRecommendations,
  } = useLibrary();
  const { downloadPlaylist, isDownloaded } = useDownload();
  const { isUltraviolet, isVelvetLime, isFrost, isAurora, isSunset, isVelvetStyle, isLiquidGlass } = useTheme();
  const isLightHeader = isFrost;
  const isSpatialGlass = isVelvetStyle || isLiquidGlass;
  const isAllDownloaded = playlist.tracks.length > 0 && playlist.tracks.every((t) => isDownloaded(t.id));
  const firstTrack = playlist.tracks[0];
  const { isActive, isPlaying, togglePlay } = usePlayContextItem({
    uri: firstTrack?.uri || playlist.uri,
    queue: playlist.tracks,
  });

  const isFavorites = playlist.id === 'playlist-favorites';
  const isRecentlyPlayed = playlist.id === 'playlist-recently-played';
  const isTopHits = playlist.id === 'playlist-today-top-hits';
  const isDiscoverWeekly = playlist.id === 'playlist-discover-weekly';
  const isRecommendedForYou = playlist.id === 'playlist-recommended-for-you';
  const isCustom = playlist.id.startsWith('custom-playlist-');
  const isArtistMix = playlist.id.startsWith('artist-mix-');
  const isAlbumView = playlist.id.startsWith('search-album-');
  const isPodcastView = playlist.id.startsWith('search-podcast-');
  const isSearchMix = isArtistMix || isAlbumView || isPodcastView;
  const isSavedSearchMix = isSearchMix && customPlaylists.some((p) => p.name.toLowerCase() === playlist.name.toLowerCase());

  const totalDurationMs = playlist.tracks.reduce(
    (acc, t) => acc + t.duration.milliseconds,
    0
  );
  const totalMinutes = Math.floor(totalDurationMs / 60000);

  const handleDeletePlaylist = () => {
    if (window.confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      deletePlaylist(playlist.id);
      if (onSelectPlaylist && allPlaylists[0]) {
        onSelectPlaylist(allPlaylists[0]);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none">
      {/* Back Header (always shown when returning to Search; mobile-only otherwise) */}
      {onBack && (
        <div className={`${backLabel === 'Search' ? 'flex' : 'md:hidden flex'} items-center px-4 sm:px-6 pt-3 pb-1 select-none`}>
          <button
            onClick={onBack}
            style={
              isSpatialGlass
                ? {
                    backdropFilter: 'blur(16px) saturate(185%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(185%)',
                    boxShadow: isFrost
                      ? 'inset 0 1px 1.5px rgba(255,255,255,0.95), 0 6px 16px rgba(15,23,42,0.08)'
                      : 'inset 0 1px 1.5px rgba(255,255,255,0.45), 0 8px 20px rgba(0,0,0,0.35)',
                  }
                : undefined
            }
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
              isLightHeader
                ? 'text-slate-900 bg-white/80 hover:bg-white border-slate-300/80 shadow-sm'
                : isSpatialGlass
                ? 'text-white bg-white/[0.08] hover:bg-white/[0.16] border-white/25'
                : 'text-white/80 hover:text-white bg-black/40 border-white/15'
            }`}
          >
            <ArrowLeft size={15} />
            <span>{backLabel}</span>
          </button>
        </div>
      )}

      {/* Playlist Hero Header */}
      <div
        style={
          isSpatialGlass
            ? {
                backdropFilter: 'blur(22px) saturate(185%)',
                WebkitBackdropFilter: 'blur(22px) saturate(185%)',
                boxShadow: isFrost
                  ? 'inset 0 1.5px 2px rgba(255,255,255,0.95), inset 0 -1.5px 2px rgba(15,23,42,0.05), 0 20px 48px -12px rgba(15,23,42,0.12)'
                  : isAurora
                  ? 'inset 0 1.5px 2px rgba(52,211,153,0.3), 0 24px 54px -12px rgba(2,12,20,0.68)'
                  : isSunset
                  ? 'inset 0 1.5px 2px rgba(244,63,94,0.3), 0 24px 54px -12px rgba(21,7,22,0.68)'
                  : 'inset 0 1.5px 2px rgba(255,255,255,0.45), inset 0 -1.5px 2px rgba(255,255,255,0.12), 0 24px 54px -12px rgba(0,0,0,0.55)',
              }
            : undefined
        }
        className={`relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 select-none ${
          isSpatialGlass
            ? `mx-4 sm:mx-6 mt-2 p-5 sm:p-7 rounded-[28px] border ${
                isFrost
                  ? 'bg-white/75 border-white/90 text-slate-900'
                  : isAurora
                  ? 'bg-gradient-to-br from-[#0d2232]/80 via-[#0f293a]/75 to-[#091522]/85 border-emerald-400/30 text-white'
                  : isSunset
                  ? 'bg-gradient-to-br from-[#2a0e28]/80 via-[#34112e]/75 to-[#1b081d]/85 border-rose-400/30 text-white'
                  : isVelvetLime
                  ? 'bg-gradient-to-br from-fuchsia-950/55 via-white/[0.06] to-violet-950/60 border-white/25 text-white'
                  : 'bg-white/[0.06] border-white/25 text-white'
              }`
            : `p-4 sm:p-6 pb-4 bg-gradient-to-b ${
                isUltraviolet
                  ? 'from-[#3a1563] via-[#1a0c3b] to-transparent'
                  : isFavorites
                  ? 'from-[#450af5] via-[#20058a] to-[#121212]'
                  : isRecentlyPlayed
                  ? 'from-[#059669] via-[#024a34] to-[#121212]'
                  : isCustom
                  ? 'from-[#6b21a8] via-[#3b0764] to-[#121212]'
                  : 'from-[#535353] to-[#121212]'
              }`
        }`}
      >
        {isSpatialGlass && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 opacity-45 ${
              isFrost
                ? 'bg-gradient-to-tr from-sky-400/15 via-transparent to-indigo-300/20'
                : isAurora
                ? 'bg-gradient-to-tr from-emerald-400/15 via-transparent to-cyan-300/20'
                : isSunset
                ? 'bg-gradient-to-tr from-rose-500/15 via-transparent to-amber-300/15'
                : isVelvetLime
                ? 'bg-gradient-to-tr from-[#D2F843]/10 via-transparent to-fuchsia-400/20'
                : 'bg-gradient-to-tr from-cyan-400/15 via-transparent to-fuchsia-400/20'
            }`}
          />
        )}

        {isFavorites ? (
          isUltraviolet ? (
            <div className="relative z-10 group flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop"
                alt="Liked Songs"
                className="w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-full border-2 border-[#d946ef]/60 shadow-[0_0_35px_rgba(217,70,239,0.4)] object-cover flex-shrink-0"
              />
            </div>
          ) : (
            <div className="relative z-10 w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-2xl bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center flex-shrink-0 shadow-2xl border border-white/25">
              <Heart size={64} className="text-white fill-white" />
            </div>
          )
        ) : isRecentlyPlayed ? (
          <div className={`relative z-10 w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 ${isUltraviolet ? 'rounded-full border-2 border-[#d946ef]/60 shadow-[0_0_35px_rgba(217,70,239,0.35)]' : 'rounded-2xl border border-white/25'} bg-gradient-to-br from-[#059669] to-[#10b981] flex items-center justify-center flex-shrink-0 shadow-2xl`}>
            <Clock size={64} className="text-white" />
          </div>
        ) : playlist.images[0] ? (
          <img
            src={playlist.images[0].url}
            alt={playlist.name}
            decoding="async"
            width={224}
            height={224}
            className={`relative z-10 w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 ${isUltraviolet ? 'rounded-full border-2 border-[#d946ef]/60 shadow-[0_0_35px_rgba(217,70,239,0.35)]' : 'rounded-2xl border border-white/30'} shadow-2xl object-cover flex-shrink-0 bg-[#282828]`}
          />
        ) : (
          <div className={`relative z-10 w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 ${isUltraviolet ? 'rounded-full border-2 border-[#d946ef]/60 shadow-[0_0_35px_rgba(217,70,239,0.35)]' : 'rounded-2xl border border-white/25'} bg-[#282828] flex items-center justify-center flex-shrink-0 shadow-2xl`}>
            <Music size={64} className="text-[#757575]" />
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2 min-w-0 items-center sm:items-start text-center sm:text-left">
          <span
            className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-full w-max ${
              isSpatialGlass
                ? isFrost
                  ? 'bg-sky-500/15 text-sky-900'
                  : isAurora
                  ? 'bg-emerald-400/20 text-emerald-300'
                  : isSunset
                  ? 'bg-rose-500/20 text-rose-300'
                  : isVelvetLime
                  ? 'bg-[#D2F843]/15 text-[#D2F843]'
                  : 'bg-white/15 text-white'
                : isLightHeader
                ? 'text-slate-700'
                : 'text-white'
            }`}
          >
            {isFavorites
              ? 'Saved Collection'
              : isRecentlyPlayed
              ? 'Playback Tracker'
              : isArtistMix
              ? 'Artist Essentials'
              : isAlbumView
              ? 'Album'
              : isPodcastView
              ? 'Podcast Show'
              : isCustom
              ? 'Personal Playlist'
              : 'Public Playlist'}
          </span>
          <h1 className={`text-2xl sm:text-4xl md:text-5xl font-black tracking-tight truncate max-w-full font-sans ${isLightHeader ? 'text-slate-900' : 'text-white'}`}>
            {playlist.name}
          </h1>
          <p className={`text-xs sm:text-sm line-clamp-2 mt-0.5 ${isLightHeader ? 'text-slate-600' : 'text-white/75'}`}>
            {playlist.description}
          </p>
          <div className={`flex items-center gap-1.5 text-xs font-medium mt-1 ${isLightHeader ? 'text-slate-800' : 'text-white'}`}>
            <span className="font-bold hover:underline cursor-pointer">
              {playlist.owner.displayName}
            </span>
            <span>•</span>
            <span>{playlist.tracks.length} songs,</span>
            <span className={isLightHeader ? 'text-slate-600' : 'text-white/65'}>about {totalMinutes} min</span>
          </div>
        </div>
      </div>

      {/* Playlist Action Bar */}
      <div className="p-6 pt-4 flex items-center gap-4 sm:gap-6 flex-wrap">
        {isUltraviolet ? (
          <>
            {/* Dual Action Buttons from Mockup Screen 3 */}
            <button
              onClick={() => {
                if (playlist.tracks.length > 0) {
                  togglePlay();
                }
              }}
              disabled={playlist.tracks.length === 0}
              className="py-2.5 px-6 rounded-full bg-gradient-to-r from-[#d946ef] to-[#a855f7] hover:brightness-110 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(217,70,239,0.5)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Shuffle size={16} />
              <span>Shuffle</span>
            </button>

            <button
              onClick={() => togglePlay()}
              disabled={playlist.tracks.length === 0}
              className="py-2.5 px-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="w-5 h-5 rounded-full bg-[#d946ef] flex items-center justify-center text-white shadow-sm">
                {isActive && isPlaying ? (
                  <Pause size={10} fill="currentColor" />
                ) : (
                  <Play size={10} fill="currentColor" className="ml-0.5" />
                )}
              </div>
              <span>{isActive && isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {playlist.tracks.length > 0 && (
              <button
                onClick={() => downloadPlaylist(playlist.tracks)}
                title={isAllDownloaded ? 'All songs downloaded' : 'Download playlist'}
                className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white"
              >
                {isAllDownloaded ? <CheckCircle2 size={20} className="text-[#d946ef]" /> : <ArrowDownCircle size={20} />}
              </button>
            )}

            {isFavorites && (
              <button className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-[#d946ef]">
                <Heart size={20} className="fill-[#d946ef]" />
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => togglePlay()}
              disabled={playlist.tracks.length === 0}
              className={`w-14 h-14 rounded-full disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center shadow-lg hover:scale-105 cursor-pointer ${
                isFrost
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : isAurora
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_18px_rgba(52,211,153,0.4)]'
                  : isSunset
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_18px_rgba(244,63,94,0.4)]'
                  : isVelvetLime
                  ? 'bg-[#D2F843] text-black shadow-[0_0_18px_rgba(210,248,67,0.4)]'
                  : 'bg-[#1db954] hover:bg-[#1ed760] text-black'
              }`}
            >
              {isActive && isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="ml-1" />
              )}
            </button>

            {playlist.tracks.length > 0 && (
              <button
                onClick={() => downloadPlaylist(playlist.tracks)}
                title={isAllDownloaded ? 'All songs downloaded' : 'Download playlist'}
                className={`transition-all hover:scale-105 flex items-center justify-center cursor-pointer ${
                  isSpatialGlass
                    ? `frosted-circle-btn w-11 h-11 rounded-full ${
                        isAllDownloaded
                          ? isFrost
                            ? 'text-sky-600'
                            : isAurora
                            ? 'text-emerald-400'
                            : isSunset
                            ? 'text-rose-400'
                            : isVelvetLime
                            ? 'text-[#D2F843]'
                            : 'text-[#1db954]'
                          : isLightHeader
                          ? 'text-slate-700'
                          : 'text-white/85 hover:text-white'
                      }`
                    : `p-1 flex items-center gap-1.5 ${
                        isAllDownloaded
                          ? isFrost
                            ? 'text-sky-600'
                            : isAurora
                            ? 'text-emerald-400'
                            : isSunset
                            ? 'text-rose-400'
                            : isVelvetLime
                            ? 'text-[#D2F843]'
                            : 'text-[#1db954]'
                          : isLightHeader
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-[#b3b3b3] hover:text-white'
                      }`
                }`}
              >
                {isAllDownloaded ? <CheckCircle2 size={22} className="fill-current/20" /> : <ArrowDownCircle size={22} />}
              </button>
            )}

            {isFavorites && (
              <button
                className={`hover:scale-105 transition-transform flex items-center justify-center ${
                  isSpatialGlass ? 'frosted-circle-btn w-11 h-11 rounded-full' : ''
                } ${
                  isFrost
                    ? 'text-rose-500'
                    : isAurora
                    ? 'text-emerald-400'
                    : isSunset
                    ? 'text-rose-400'
                    : isVelvetLime
                    ? 'text-[#D2F843]'
                    : 'text-[#1db954]'
                }`}
              >
                <Heart size={24} className="fill-current" />
              </button>
            )}
          </>
        )}

        {isRecentlyPlayed && playlist.tracks.length > 0 && (
          <button
            onClick={() => clearRecentlyPlayed()}
            title="Clear listening history"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
              isLightHeader
                ? 'border-slate-300 bg-white/80 text-slate-700 hover:text-slate-950 hover:border-slate-500'
                : isSpatialGlass
                ? 'border-white/25 bg-white/[0.08] text-white/80 hover:text-white hover:bg-white/[0.15]'
                : 'border-[#3e3e3e] text-[#b3b3b3] hover:text-white hover:border-white'
            }`}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        )}

        {isCustom && (
          <button
            onClick={handleDeletePlaylist}
            title="Delete this playlist"
            className={`hover:text-red-500 hover:scale-110 transition-all cursor-pointer flex items-center justify-center ${
              isSpatialGlass ? 'frosted-circle-btn w-11 h-11 rounded-full' : 'p-1'
            } ${isLightHeader ? 'text-slate-600' : 'text-white/75'}`}
          >
            <Trash2 size={20} />
          </button>
        )}

        {isSearchMix && playlist.tracks.length > 0 && (
          <button
            onClick={() => {
              if (!isSavedSearchMix) {
                createPlaylist(playlist.name, playlist.description, playlist.tracks);
              }
            }}
            disabled={isSavedSearchMix}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer disabled:cursor-default ${
              isSavedSearchMix
                ? isFrost
                  ? 'bg-sky-500/15 border-sky-400/40 text-sky-900'
                  : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : isFrost
                ? 'bg-white/85 border-slate-300 text-slate-900 hover:bg-white shadow-sm'
                : 'bg-white/10 border-white/25 text-white hover:bg-white/20'
            }`}
          >
            {isSavedSearchMix ? <Check size={14} /> : <BookmarkPlus size={14} />}
            <span>{isSavedSearchMix ? 'Saved to Library' : 'Save to Library'}</span>
          </button>
        )}

        {/* Dynamic Today's Top Hits: Region Selector + Live Refresh */}
        {isTopHits && (
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`inline-flex items-center gap-1 p-1 rounded-full border overflow-x-auto max-w-full scrollbar-none ${
                isFrost
                  ? 'bg-white/80 border-slate-300/80'
                  : 'bg-white/[0.06] border-white/20 backdrop-blur-md'
              }`}
            >
              <span className={`pl-2 pr-1 flex items-center gap-1 text-[11px] font-bold ${isFrost ? 'text-slate-500' : 'text-white/60'}`}>
                <Globe size={13} />
              </span>
              {CHART_REGIONS.map((reg) => {
                const active = chartRegion === reg.id;
                return (
                  <button
                    key={reg.id}
                    onClick={() => setChartRegion(reg.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? isFrost
                          ? 'bg-slate-900 text-white shadow-sm'
                          : isAurora
                          ? 'bg-emerald-400 text-slate-950 font-bold'
                          : isSunset
                          ? 'bg-rose-500 text-white font-bold'
                          : isVelvetLime
                          ? 'bg-[#D2F843] text-black font-bold'
                          : 'bg-white text-black font-bold'
                        : isFrost
                        ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
                        : 'text-white/75 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {reg.shortLabel}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => refreshTopHits(chartRegion)}
              disabled={isLoadingTopHits}
              title="Refresh Regional Chart"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
                isFrost
                  ? 'bg-white/80 border-slate-300 text-slate-800 hover:bg-white'
                  : 'bg-white/10 border-white/25 text-white hover:bg-white/20'
              }`}
            >
              <RefreshCw size={13} className={isLoadingTopHits ? 'animate-spin' : ''} />
              <span>{isLoadingTopHits ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        )}

        {/* Dynamic Discover Weekly: Locked Week Indicator + Manual Refresh Mix */}
        {isDiscoverWeekly && (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isFrost
                  ? 'bg-white/80 border-slate-300 text-slate-700'
                  : 'bg-white/[0.08] border-white/20 text-white/80'
              }`}
            >
              Locked for {discoverWeekKey}
            </span>
            <button
              onClick={() => refreshDiscoverWeekly()}
              disabled={isLoadingDiscover}
              title="Manually re-roll fresh trending songs for Discover Weekly"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                isFrost
                  ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                  : isAurora
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 hover:bg-emerald-300'
                  : isSunset
                  ? 'bg-rose-500 text-white border-rose-400 hover:bg-rose-400'
                  : isVelvetLime
                  ? 'bg-[#D2F843] text-black border-[#D2F843] hover:bg-[#c3e834]'
                  : 'bg-white/15 text-white border-white/30 hover:bg-white/25'
              }`}
            >
              <RefreshCw size={13} className={isLoadingDiscover ? 'animate-spin' : ''} />
              <span>{isLoadingDiscover ? 'Curating...' : 'Refresh Mix'}</span>
            </button>
          </div>
        )}

        {/* Dynamic User Taste Profile Recommendations: Taste Seeds + Refresh */}
        {isRecommendedForYou && (
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isFrost
                  ? 'bg-white/80 border-slate-300 text-slate-800'
                  : 'bg-white/[0.08] border-white/20 text-white/85'
              }`}
            >
              <Sparkles size={13} className={isFrost ? 'text-sky-600' : 'text-[#D2F843]'} />
              <span>Seeds: {tasteProfile.topArtists.slice(0, 3).join(', ')}</span>
            </div>
            <button
              onClick={() => refreshRecommendations()}
              disabled={isLoadingRecommendations}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                isFrost
                  ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                  : isAurora
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 hover:bg-emerald-300'
                  : isSunset
                  ? 'bg-rose-500 text-white border-rose-400 hover:bg-rose-400'
                  : isVelvetLime
                  ? 'bg-[#D2F843] text-black border-[#D2F843] hover:bg-[#c3e834]'
                  : 'bg-white/15 text-white border-white/30 hover:bg-white/25'
              }`}
            >
              <RefreshCw size={13} className={isLoadingRecommendations ? 'animate-spin' : ''} />
              <span>{isLoadingRecommendations ? 'Generating...' : 'Refresh For You'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Date Added and Favourites count header for Cosmic Ultraviolet */}
      {isUltraviolet && (
        <div className="flex items-center justify-between text-xs font-semibold text-[#a5a6c2] border-t border-white/10 pt-3 px-6 mb-2">
          <span>{playlist.tracks.length} favourites</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-white cursor-pointer">
            <span>Date Added</span>
            <ChevronDown size={12} />
          </div>
        </div>
      )}

      {/* Tracks Table */}
      <div className="px-4 sm:px-6 pb-32 md:pb-12">
        <PlaylistTrackTable
          tracks={playlist.tracks}
          onRemoveTrack={
            isCustom
              ? (trackId) => removeTrackFromPlaylist(playlist.id, trackId)
              : undefined
          }
        />
      </div>
    </div>
  );
};
