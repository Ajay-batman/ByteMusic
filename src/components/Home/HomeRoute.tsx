import React, { useState } from 'react';
import { mockPlaylists, mockTracks } from '../../data/mockSpotifyCatalog';
import { Playlist, Track } from '../../types/spotify';
import { Play, Pause, Palette, Heart, Sparkles, ArrowDownToLine, MoreHorizontal, Shuffle, Check, UserCheck, UserPlus, RefreshCw, Globe } from 'lucide-react';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { usePlayback } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { CHART_REGIONS } from '../../services/tasteProfile';
import { SettingsPopMenu } from '../Common/SettingsPopMenu';
import { CosmicUltravioletShowcase } from '../Cosmic/CosmicUltravioletShowcase';
import { GlacialGlassShowcase } from '../Glacial/GlacialGlassShowcase';

interface HomeRouteProps {
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenAbout?: () => void;
  onOpenDownloader?: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const COSMIC_ARTISTS = [
  {
    id: 'taylor-swift',
    name: 'Taylor Swift',
    followers: '27M Followers',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
  },
  {
    id: 'billie-eilish',
    name: 'Billie Eilish',
    followers: '15M Followers',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop',
  },
  {
    id: 'ariana-grande',
    name: 'Ariana Grande',
    followers: '22M Followers',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop',
  },
  {
    id: 'post-malone',
    name: 'Post Malone',
    followers: '19M Followers',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
  },
  {
    id: 'kanye-west',
    name: 'Kanye West',
    followers: '21M Followers',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop',
  },
  {
    id: 'daft-punk',
    name: 'Daft Punk',
    followers: '18M Followers',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/300x300bb.jpg',
  },
];

export const HomeRoute: React.FC<HomeRouteProps> = ({ onSelectPlaylist, onOpenAbout, onOpenDownloader }) => {
  const {
    isLiquidGlass,
    isVelvetLime,
    isUltraviolet,
    isGlacialGlass,
    isVelvetStyle,
    isAurora,
    isSunset,
    isFrost,
    openThemeModal,
    currentThemeDef,
  } = useTheme();
  const {
    allPlaylists,
    chartRegion,
    setChartRegion,
    topHitsTracks,
    isLoadingTopHits,
    discoverWeeklyTracks,
    discoverWeekKey,
    isLoadingDiscover,
    refreshDiscoverWeekly,
    recommendedTracks,
    tasteProfile,
    isLoadingRecommendations,
    refreshRecommendations,
  } = useLibrary();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayback();
  const [activeCategory, setActiveCategory] = useState<'all' | 'new' | 'trending' | 'daily'>('all');
  const [activeCosmicFilter, setActiveCosmicFilter] = useState<string>('Suggested');
  const [followedArtists, setFollowedArtists] = useState<Record<string, boolean>>({
    'taylor-swift': true,
    'billie-eilish': false,
    'ariana-grande': false,
    'post-malone': true,
    'kanye-west': false,
    'daft-punk': true,
  });
  const [isHeroLiked, setIsHeroLiked] = useState(true);

  const toggleFollow = (artistId: string) => {
    setFollowedArtists((prev) => ({
      ...prev,
      [artistId]: !prev[artistId],
    }));
  };

  // Glacial Liquid Glass Aesthetic Experience (Matches Uploaded Screenshot Pages 2 & 3)
  if (isGlacialGlass) {
    return <GlacialGlassShowcase onSelectPlaylist={onSelectPlaylist} />;
  }

  // If NOT Velvet & Spatial and NOT Cosmic Ultraviolet and NOT Glacial Glass, preserve authentic Spotify layout for other themes
  if (!isVelvetStyle && !isUltraviolet) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 sm:space-y-8">
        {/* Greeting Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#b3b3b3]">Good afternoon</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Hi, Listener</h1>
          </div>

          <div className="flex items-center gap-2">
            <SettingsPopMenu
              onOpenDownloader={() => onOpenDownloader?.()}
              onOpenAbout={() => onOpenAbout?.()}
              buttonClassName={`p-2 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                isLiquidGlass ? 'glass-pill text-white shadow-sm' : 'bg-[#282828] text-[#b3b3b3] hover:text-white'
              }`}
            />
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

        {/* Quick Launch Cards (Grid of 6) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allPlaylists.slice(0, 6).map((playlist) => (
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
            <div>
              <h2 className="text-2xl font-bold text-white hover:underline cursor-pointer">
                Made For You
              </h2>
              <p className="text-xs text-[#b3b3b3] mt-0.5">{tasteProfile.summaryText}</p>
            </div>
            <button
              onClick={() => refreshRecommendations()}
              disabled={isLoadingRecommendations}
              className="flex items-center gap-1.5 text-xs font-bold text-[#b3b3b3] hover:text-white cursor-pointer uppercase"
            >
              <RefreshCw size={12} className={isLoadingRecommendations ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allPlaylists.map((pl) => (
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
      </div>
    );
  }

  // Cosmic Ultraviolet Aesthetic Experience (Desktop Home Page)
  if (isUltraviolet) {
    const cosmicFilters = ['Suggested', 'Folders', 'Downloads', 'Albums', 'Artists'];

    return (
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 sm:space-y-7 scrollbar-none">
        {/* Header Bar */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#d946ef] shadow-[0_0_8px_#d946ef] animate-pulse" />
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#e879f9]/90">
                Cosmic Experience
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hi, Listener
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <SettingsPopMenu
              onOpenDownloader={() => onOpenDownloader?.()}
              onOpenAbout={() => onOpenAbout?.()}
              buttonClassName="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white cursor-pointer"
            />
            <button
              onClick={openThemeModal}
              title="Choose Theme Style"
              className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white cursor-pointer"
            >
              <Palette size={17} style={{ color: currentThemeDef.accentColor }} />
            </button>
          </div>
        </div>

        {/* Horizontal Category Filter Chips */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {cosmicFilters.map((filter) => {
            const isActive = activeCosmicFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveCosmicFilter(filter)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white shadow-[0_0_20px_rgba(217,70,239,0.45)] scale-105'
                    : 'bg-[#15112c]/80 text-[#a5a6c2] hover:text-white border border-white/10 hover:border-white/20 backdrop-blur-md'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Curated Hero Showcase */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#170e30]/90 via-[#221345]/80 to-[#100b24]/90 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl flex flex-col md:flex-row items-center gap-6 sm:gap-8">
          <div className="absolute -left-12 -top-12 w-64 h-64 bg-[#d946ef]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#a855f7]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Circular Vinyl / Disc Artwork */}
          <div
            className="relative flex-shrink-0 group cursor-pointer"
            onClick={() => playTrack(mockTracks[0])}
          >
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-[#d946ef]/60 shadow-[0_0_35px_rgba(217,70,239,0.35)] relative">
              <img
                src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=450&h=450&fit=crop"
                alt="Midnight Vibes"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#080716]/80 border border-white/30 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d946ef]" />
                </div>
              </div>
            </div>

            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-r from-[#d946ef] to-[#a855f7] flex items-center justify-center text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] group-hover:scale-110 transition-transform">
              <Play size={18} fill="currentColor" className="ml-0.5" />
            </div>
          </div>

          {/* Right Details */}
          <div className="flex-1 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d946ef]/15 border border-[#d946ef]/30 text-[#f0abfc] text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles size={12} />
              <span>Featured Playlist • Cosmic Mix</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Midnight Vibes
            </h2>
            <p className="text-xs sm:text-sm text-[#a5a6c2] mt-1 mb-4 font-medium">
              Curated High-Definition Spatial Audio • 170 Songs
            </p>

            {/* Dual Pill Action Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              {/* Shuffle Button (Gradient Pill) */}
              <button
                onClick={() => {
                  const shuffled = [...mockTracks].sort(() => Math.random() - 0.5);
                  playTrack(shuffled[0]);
                }}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#d946ef] to-[#a855f7] hover:brightness-110 text-white font-bold text-sm flex items-center gap-2 shadow-[0_0_24px_rgba(217,70,239,0.45)] active:scale-95 transition-all cursor-pointer"
              >
                <Shuffle size={16} />
                <span>Shuffle</span>
              </button>

              {/* Play Button (Frosted Pill with Purple Play Badge) */}
              <button
                onClick={() => playTrack(mockTracks[0])}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-[#d946ef] flex items-center justify-center text-white shadow-sm">
                  <Play size={10} fill="currentColor" className="ml-0.5" />
                </div>
                <span>Play</span>
              </button>

              {/* Favorite Heart Disc */}
              <button
                onClick={() => setIsHeroLiked((prev) => !prev)}
                className={`frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isHeroLiked ? 'text-[#d946ef]' : 'text-white/70 hover:text-white'
                }`}
                title="Add to Favourites"
              >
                <Heart size={18} fill={isHeroLiked ? 'currentColor' : 'none'} />
              </button>

              {/* More Options Disc */}
              <button
                onClick={() => onSelectPlaylist(allPlaylists[0] || mockPlaylists[0])}
                className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
                title="View Full Playlist"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Recently Played Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Recently Played
            </h2>
            <span className="text-xs font-semibold text-[#a5a6c2] hover:text-[#d946ef] cursor-pointer transition-colors">
              See all
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockTracks.slice(0, 6).map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-[#141029]/70 hover:bg-[#1d163c]/90 border border-white/10 hover:border-[#d946ef]/40 transition-all cursor-pointer select-none shadow-md hover:shadow-[0_0_20px_rgba(217,70,239,0.2)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.album.images[0]?.url}
                      alt={track.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-md bg-[#1d163c]"
                    />
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-[#d946ef] transition-colors">
                        {track.name}
                      </h3>
                      <p className="text-xs text-[#a5a6c2] truncate font-medium">
                        {track.artists.map((a) => a.name).join(', ')} • {formatDuration(track.duration.milliseconds)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track);
                    }}
                    className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-[#d946ef] hover:scale-105 border border-white/15 flex items-center justify-center text-white transition-all shadow-md active:scale-90 flex-shrink-0 ml-3"
                  >
                    {isThisPlaying ? (
                      <Pause size={14} fill="currentColor" />
                    ) : (
                      <Play size={14} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Artists Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Artist
            </h2>
            <span className="text-xs font-semibold text-[#a5a6c2] hover:text-[#d946ef] cursor-pointer transition-colors">
              See all
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {COSMIC_ARTISTS.map((artist) => {
              const isFollowing = !!followedArtists[artist.id];
              return (
                <div
                  key={artist.id}
                  className="group flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#141029]/70 hover:bg-[#1d163c]/90 border border-white/10 hover:border-[#d946ef]/40 transition-all select-none shadow-md"
                >
                  <div className="relative mb-3">
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white/15 group-hover:border-[#d946ef] transition-all shadow-lg"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#d946ef] border-2 border-[#141029]" />
                  </div>

                  <h3 className="text-sm font-bold text-white truncate max-w-full">
                    {artist.name}
                  </h3>
                  <p className="text-[11px] text-[#a5a6c2] font-medium mb-3">
                    {artist.followers}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFollow(artist.id);
                    }}
                    className={`w-full py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isFollowing
                        ? 'bg-[#d946ef]/20 border border-[#d946ef] text-[#f0abfc]'
                        : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <Check size={12} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={12} />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Featured Collections Shelf */}
        <div className="space-y-3.5 pb-8">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Featured Collections
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {allPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => onSelectPlaylist(pl)}
                className="group p-3 rounded-2xl bg-[#141029]/70 hover:bg-[#1d163c]/90 border border-white/10 hover:border-[#d946ef]/40 transition-all cursor-pointer select-none shadow-md"
              >
                <div className="relative mb-2.5">
                  <img
                    src={pl.images[0]?.url}
                    alt={pl.name}
                    className="w-full aspect-square object-cover rounded-xl shadow-md bg-[#1d163c]"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlaylist(pl);
                    }}
                    className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white hover:scale-105 flex items-center justify-center shadow-[0_0_16px_rgba(217,70,239,0.5)] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
                  >
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-white truncate">{pl.name}</h3>
                <p className="text-xs text-[#a5a6c2] line-clamp-1 font-medium">{pl.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Velvet & Spatial Dribbble Aesthetic Experience (Desktop & Mobile Optimized)
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'daily', label: 'Top Charts' },
    { id: 'trending', label: 'Made For You' },
    { id: 'new', label: 'Discover Weekly' },
  ] as const;

  // Dynamic Catalog Playlists (Discover Weekly, Today's Top Hits, Made For You)
  const discoverPlaylist =
    allPlaylists.find((p) => p.id === 'playlist-discover-weekly') ||
    allPlaylists[0] ||
    mockPlaylists[0];
  const topHitsPlaylist =
    allPlaylists.find((p) => p.id === 'playlist-today-top-hits') || discoverPlaylist;
  const madeForYouPlaylist =
    allPlaylists.find((p) => p.id === 'playlist-recommended-for-you') || discoverPlaylist;

  const bannerTrack = discoverPlaylist.tracks[0] || mockTracks[0];
  const activeRegionLabel =
    CHART_REGIONS.find((r) => r.id === chartRegion)?.shortLabel || 'Global';

  const showcaseConfig =
    activeCategory === 'daily'
      ? {
          title: `Today's Top Hits (${activeRegionLabel})`,
          tracks: topHitsTracks.slice(0, 6),
          queue: topHitsTracks,
          targetPlaylist: topHitsPlaylist,
          showRegionBar: true,
        }
      : activeCategory === 'trending'
      ? {
          title: 'Recommended For You',
          subtitle: tasteProfile.summaryText,
          tracks: recommendedTracks.slice(0, 6),
          queue: recommendedTracks,
          targetPlaylist: madeForYouPlaylist,
          showRecRefresh: true,
        }
      : activeCategory === 'new'
      ? {
          title: `Discover Weekly (${discoverWeekKey})`,
          subtitle: 'Locked all week until you tap Refresh Mix',
          tracks: discoverWeeklyTracks.slice(0, 6),
          queue: discoverWeeklyTracks,
          targetPlaylist: discoverPlaylist,
          showDiscoverRefresh: true,
        }
      : {
          title: `Today's Top Hits (${activeRegionLabel})`,
          tracks: topHitsTracks.slice(0, 6),
          queue: topHitsTracks,
          targetPlaylist: topHitsPlaylist,
          showRegionBar: true,
        };

  const renderGlassTrackCard = (track: Track, queue: Track[]) => {
    const isThisActive = currentTrack?.id === track.id;
    const isThisPlaying = isThisActive && isPlaying;
    return (
      <div
        key={track.id}
        onClick={() => {
          if (isThisActive) {
            togglePlay();
          } else {
            playTrack(track, queue);
          }
        }}
        style={{
          backdropFilter: 'blur(16px) saturate(185%)',
          WebkitBackdropFilter: 'blur(16px) saturate(185%)',
          boxShadow: isFrost
            ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), 0 12px 28px -6px rgba(15,23,42,0.08)'
            : 'inset 0 1.5px 1.5px rgba(255,255,255,0.55), inset 0 -1.5px 2px rgba(255,255,255,0.18), 0 18px 36px -12px rgba(0,0,0,0.52)',
        }}
        className={`group relative overflow-hidden flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
          isFrost
            ? 'border-slate-200/90 bg-white/75 hover:bg-white/95 hover:border-slate-300 active:scale-[0.99]'
            : 'border-white/30 bg-white/[0.05] hover:bg-white/[0.11] hover:border-white/50 active:scale-[0.99]'
        }`}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 opacity-50 transition-colors duration-300 ${
            isFrost
              ? 'bg-gradient-to-tr from-sky-400/10 via-transparent to-indigo-300/15 group-hover:from-sky-400/20 group-hover:to-indigo-300/25'
              : 'bg-gradient-to-tr from-cyan-400/15 via-transparent to-fuchsia-400/20 group-hover:from-emerald-300/20 group-hover:to-cyan-200/20'
          }`}
        />

        <div className="relative z-10 flex items-center gap-3 min-w-0">
          <img
            src={track.album.images[0]?.url}
            alt={track.name}
            className={`w-12 h-12 rounded-xl object-cover flex-shrink-0 border shadow-lg ${
              isFrost ? 'border-slate-200 bg-white' : 'border-white/25 bg-slate-950/60'
            }`}
          />
          <div className="truncate">
            <h3
              className={`text-sm font-bold truncate font-sans transition-colors ${
                isFrost
                  ? 'text-slate-900 group-hover:text-sky-700'
                  : isVelvetLime
                  ? 'text-white group-hover:text-[#D2F843]'
                  : 'text-white group-hover:text-cyan-200'
              }`}
            >
              {track.name}
            </h3>
            <p className={`text-xs truncate font-medium ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>
              {track.artists.map((a) => a.name).join(', ')} • {formatDuration(track.duration.milliseconds)}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isThisActive) {
              togglePlay();
            } else {
              playTrack(track, queue);
            }
          }}
          style={{
            boxShadow: isFrost
              ? 'inset 0 1.5px 1px rgba(255,255,255,0.95), 0 4px 12px rgba(15,23,42,0.1)'
              : 'inset 0 1.5px 1px rgba(255,255,255,0.65), 0 8px 20px rgba(0,0,0,0.35)',
          }}
          className={`relative z-10 w-9 h-9 rounded-full border backdrop-blur-md flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ml-3 cursor-pointer ${
            isFrost
              ? 'bg-slate-900/10 hover:bg-slate-900/20 border-slate-300/80 text-slate-900'
              : 'bg-white/15 hover:bg-white/30 border-white/40 text-white'
          }`}
        >
          {isThisPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 sm:space-y-7 scrollbar-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pt-1">
        {/* Left: Greeting with "Hi, Listener" (No profile picture) */}
        <div>
          <span className={`text-[11px] uppercase tracking-wider font-semibold block -mb-0.5 ${isFrost ? 'text-slate-600' : 'text-[#8E8E9F]'}`}>
            Welcome back
          </span>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight font-sans ${isFrost ? 'text-slate-900' : 'text-white'}`}>
            Hi, Listener
          </h1>
        </div>

        {/* Right: Frosted Circular Disc Action Buttons */}
        <div className="flex items-center gap-2.5">
          <SettingsPopMenu
            onOpenDownloader={() => onOpenDownloader?.()}
            onOpenAbout={() => onOpenAbout?.()}
          />
          <button
            onClick={openThemeModal}
            title="Choose Theme Style"
            className={`frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
              isFrost ? 'text-slate-900 bg-white/80 border-slate-300 shadow-sm' : 'text-white'
            }`}
          >
            <Palette size={17} style={{ color: currentThemeDef.accentColor }} />
          </button>
        </div>
      </div>

      {/* Horizontal Category Filter Chips (iOS Liquid Glass Specular Track) */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div
          style={{
            backdropFilter: 'blur(16px) saturate(185%)',
            WebkitBackdropFilter: 'blur(16px) saturate(185%)',
            boxShadow: isFrost
              ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), inset 0 -1px 1px rgba(15,23,42,0.06), 0 10px 24px -6px rgba(15,23,42,0.08)'
              : 'inset 0 1.5px 1.5px rgba(255,255,255,0.5), inset 0 -1px 1.5px rgba(255,255,255,0.15), 0 14px 32px -8px rgba(0,0,0,0.45)',
          }}
          className={`inline-flex items-center gap-1.5 p-1.5 rounded-full border ${
            isFrost
              ? 'border-slate-200/90 bg-white/80'
              : 'border-white/25 bg-white/[0.06]'
          }`}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
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
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Curated & Trending Hero Banner: Week-Locked Discover Weekly + Manual Refresh */}
      <div
        style={{
          backdropFilter: 'blur(24px) saturate(190%)',
          WebkitBackdropFilter: 'blur(24px) saturate(190%)',
          boxShadow: isFrost
            ? 'inset 0 1.5px 2px rgba(255,255,255,0.95), inset 0 -1.5px 2px rgba(15,23,42,0.05), 0 20px 48px -12px rgba(15,23,42,0.12)'
            : isAurora
            ? 'inset 0 1.5px 2px rgba(52,211,153,0.35), 0 24px 54px -12px rgba(2,12,20,0.7)'
            : isSunset
            ? 'inset 0 1.5px 2px rgba(244,63,94,0.35), 0 24px 54px -12px rgba(21,7,22,0.7)'
            : 'inset 0 1.5px 2px rgba(255,255,255,0.7), 0 24px 54px -12px rgba(0,0,0,0.5)',
        }}
        className={`relative overflow-hidden rounded-[28px] p-5 sm:p-7 border flex items-center justify-between gap-4 transition-all duration-300 ${
          isFrost
            ? 'bg-white/75 border-white/90 text-slate-900'
            : isAurora
            ? 'bg-gradient-to-r from-[#0d2232]/85 via-[#112d3d]/85 to-[#0b2b3a]/90 border-emerald-400/30 text-white'
            : isSunset
            ? 'bg-gradient-to-r from-[#2a0e28]/85 via-[#371333]/85 to-[#240c26]/90 border-rose-400/30 text-white'
            : 'bg-gradient-to-r from-[#D8B4FE]/90 via-[#E9D5FF]/85 to-[#C4B5FD]/90 border-white/60 text-[#2E1065]'
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 bg-gradient-to-tr from-cyan-400/20 via-transparent to-fuchsia-400/20"
        />

        <div className="flex-1 z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full w-max ${
                isFrost
                  ? 'bg-sky-500/15 text-sky-900'
                  : isAurora
                  ? 'bg-emerald-400/20 text-emerald-300'
                  : isSunset
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-[#2E1065]/10 text-[#4C1D95]'
              }`}
            >
              <Sparkles size={11} />
              <span>Trendy • {discoverWeekKey}</span>
            </div>
          </div>
          <h2
            onClick={() => onSelectPlaylist(discoverPlaylist)}
            className={`text-xl sm:text-3xl font-black tracking-tight font-sans cursor-pointer hover:underline ${
              isFrost
                ? 'text-slate-900'
                : isAurora || isSunset
                ? 'text-white'
                : 'text-[#2E1065]'
            }`}
          >
            {discoverPlaylist.name}
          </h2>
          <p
            className={`text-xs sm:text-sm max-w-sm mt-1 mb-4 font-medium leading-relaxed ${
              isFrost
                ? 'text-slate-600'
                : isAurora
                ? 'text-emerald-100/80'
                : isSunset
                ? 'text-rose-100/80'
                : 'text-[#4C1D95]/85'
            }`}
          >
            {discoverPlaylist.description}
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (currentTrack?.id === bannerTrack.id) {
                  togglePlay();
                } else {
                  playTrack(bannerTrack, discoverPlaylist.tracks);
                }
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer ${
                isFrost
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : isAurora
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold'
                  : isSunset
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-[#3B0764] hover:bg-[#2E1065] text-white'
              }`}
            >
              {currentTrack?.id === bannerTrack.id && isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              onClick={() => refreshDiscoverWeekly()}
              disabled={isLoadingDiscover}
              title="Refresh Discover Weekly Mix"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                isFrost
                  ? 'bg-white/85 text-slate-900 hover:bg-white border border-slate-200 shadow-sm'
                  : isAurora || isSunset
                  ? 'bg-white/15 hover:bg-white/25 text-white'
                  : 'bg-[#2E1065]/15 hover:bg-[#2E1065]/25 text-[#2E1065]'
              }`}
            >
              <RefreshCw size={14} className={isLoadingDiscover ? 'animate-spin' : ''} />
              <span>{isLoadingDiscover ? 'Refreshing...' : 'Refresh Mix'}</span>
            </button>
            <button
              onClick={() => onSelectPlaylist(discoverPlaylist)}
              title="Open Discover Weekly"
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                isFrost
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/50'
                  : isAurora
                  ? 'text-emerald-200/90 hover:text-white hover:bg-white/10'
                  : isSunset
                  ? 'text-rose-200/90 hover:text-white hover:bg-white/10'
                  : 'text-[#4C1D95] hover:bg-white/30'
              }`}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="relative flex-shrink-0 z-10">
          <img
            src={discoverPlaylist.images[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300'}
            alt={discoverPlaylist.name}
            className={`w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-2xl border-2 ${
              isFrost ? 'border-white/90 shadow-slate-300/50' : 'border-white/60'
            }`}
          />
        </div>
      </div>

      {/* Primary Track Showcase (Dynamic Top Hits with Region Picker / Filtered Category) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className={`text-lg sm:text-xl font-black tracking-tight font-sans flex items-center gap-2 ${isFrost ? 'text-slate-900' : 'text-white'}`}>
              <span>{showcaseConfig.title}</span>
              {(isLoadingTopHits && activeCategory !== 'trending' && activeCategory !== 'new') && (
                <RefreshCw size={14} className="animate-spin opacity-60" />
              )}
            </h2>
            {showcaseConfig.subtitle && (
              <p className={`text-xs mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/60'}`}>
                {showcaseConfig.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showcaseConfig.showDiscoverRefresh && (
              <button
                onClick={() => refreshDiscoverWeekly()}
                disabled={isLoadingDiscover}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                  isFrost ? 'bg-white/80 border-slate-300 text-slate-800' : 'bg-white/10 border-white/20 text-white'
                }`}
              >
                <RefreshCw size={12} className={isLoadingDiscover ? 'animate-spin' : ''} />
                <span>Refresh Mix</span>
              </button>
            )}
            {showcaseConfig.showRecRefresh && (
              <button
                onClick={() => refreshRecommendations()}
                disabled={isLoadingRecommendations}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                  isFrost ? 'bg-white/80 border-slate-300 text-slate-800' : 'bg-white/10 border-white/20 text-white'
                }`}
              >
                <RefreshCw size={12} className={isLoadingRecommendations ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            )}
            <button
              onClick={() => onSelectPlaylist(showcaseConfig.targetPlaylist)}
              className={`text-xs font-semibold cursor-pointer transition-colors ${
                isFrost ? 'text-slate-500 hover:text-slate-900' : 'text-[#8E8E9F] hover:text-white'
              }`}
            >
              See all
            </button>
          </div>
        </div>

        {/* Regional Chart Selector Pills (when showing Today's Top Hits) */}
        {showcaseConfig.showRegionBar && (
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <div
              className={`inline-flex items-center gap-1 p-1 rounded-full border ${
                isFrost
                  ? 'border-slate-200/90 bg-white/70'
                  : 'border-white/15 bg-white/[0.04]'
              }`}
            >
              <span className={`pl-2 pr-1 flex items-center ${isFrost ? 'text-slate-500' : 'text-white/50'}`}>
                <Globe size={13} />
              </span>
              {CHART_REGIONS.map((reg) => {
                const isSel = chartRegion === reg.id;
                return (
                  <button
                    key={reg.id}
                    onClick={() => setChartRegion(reg.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSel
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
                        ? 'text-slate-600 hover:text-slate-950'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {reg.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {showcaseConfig.tracks.map((track) => renderGlassTrackCard(track, showcaseConfig.queue))}
        </div>
      </div>

      {/* Personalized "Made For You" Shelf (Shown on 'all' view) */}
      {activeCategory === 'all' && recommendedTracks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight font-sans ${isFrost ? 'text-slate-900' : 'text-white'}`}>
                Recommended For You
              </h2>
              <p className={`text-xs mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/60'}`}>
                {tasteProfile.summaryText}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => refreshRecommendations()}
                disabled={isLoadingRecommendations}
                title="Generate fresh recommendations"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  isFrost
                    ? 'bg-white/80 border-slate-300 text-slate-800 hover:bg-white'
                    : 'bg-white/[0.08] border-white/20 text-white/85 hover:bg-white/15'
                }`}
              >
                <RefreshCw size={12} className={isLoadingRecommendations ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => onSelectPlaylist(madeForYouPlaylist)}
                className={`text-xs font-semibold cursor-pointer transition-colors ${
                  isFrost ? 'text-slate-500 hover:text-slate-900' : 'text-[#8E8E9F] hover:text-white'
                }`}
              >
                Open mix
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendedTracks.slice(0, 6).map((track) => renderGlassTrackCard(track, recommendedTracks))}
          </div>
        </div>
      )}

      {/* Featured Playlists Shelf (iOS Liquid Glass Cards) */}
      <div className="space-y-3 pb-8">
        <h2 className={`text-lg sm:text-xl font-black tracking-tight font-sans ${isFrost ? 'text-slate-900' : 'text-white'}`}>
          Featured Collections
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {allPlaylists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              style={{
                backdropFilter: 'blur(16px) saturate(185%)',
                WebkitBackdropFilter: 'blur(16px) saturate(185%)',
                boxShadow: isFrost
                  ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), 0 14px 30px -8px rgba(15,23,42,0.09)'
                  : 'inset 0 1.5px 1.5px rgba(255,255,255,0.55), inset 0 -1.5px 2px rgba(255,255,255,0.18), 0 20px 42px -12px rgba(0,0,0,0.52)',
              }}
              className={`group relative overflow-hidden p-3 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                isFrost
                  ? 'border-slate-200/90 bg-white/75 hover:bg-white/95 hover:border-slate-300'
                  : 'border-white/30 bg-white/[0.05] hover:bg-white/[0.11] hover:border-white/50'
              }`}
            >
              {/* Subtle Internal Liquid Caustic Sheen */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 opacity-50 transition-colors duration-300 ${
                  isFrost
                    ? 'bg-gradient-to-tr from-sky-400/10 via-transparent to-indigo-300/15 group-hover:from-sky-400/20 group-hover:to-indigo-300/25'
                    : 'bg-gradient-to-tr from-cyan-400/15 via-transparent to-fuchsia-400/20 group-hover:from-emerald-300/20 group-hover:to-cyan-200/20'
                }`}
              />

              <div className="relative z-10 mb-2.5">
                <img
                  src={pl.images[0]?.url}
                  alt={pl.name}
                  className={`w-full aspect-square object-cover rounded-xl border shadow-md ${
                    isFrost ? 'border-slate-200 bg-white' : 'border-white/20 bg-slate-950/60'
                  }`}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlaylist(pl);
                  }}
                  style={{
                    boxShadow: isFrost
                      ? 'inset 0 1.5px 1px rgba(255,255,255,0.95), 0 8px 20px rgba(15,23,42,0.15)'
                      : 'inset 0 1.5px 1px rgba(255,255,255,0.85), 0 10px 24px rgba(0,0,0,0.45)',
                  }}
                  className={`absolute bottom-2 right-2 w-10 h-10 rounded-full border backdrop-blur-xl hover:scale-105 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 cursor-pointer ${
                    isFrost
                      ? 'bg-slate-900 text-white border-slate-800'
                      : 'bg-white/25 hover:bg-white/40 border-white/70 text-white'
                  }`}
                >
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                </button>
              </div>
              <h3 className={`relative z-10 text-sm font-bold truncate font-sans ${isFrost ? 'text-slate-900' : 'text-white'}`}>{pl.name}</h3>
              <p className={`relative z-10 text-xs line-clamp-1 font-medium ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>{pl.description}</p>
            </div>
          ))}
        </div>
      </div>
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
        {isActive && isPlaying ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" className="ml-0.5" />
        )}
      </button>
    </div>
  );
};
