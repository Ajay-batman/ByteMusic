import React, { useState, useEffect, useMemo } from 'react';
import {
  Playlist,
  SearchCatalogAlbum,
  SearchCatalogArtist,
  SearchCatalogPodcast,
  SearchCatalogResponse,
  SearchCategory,
  Track,
} from '../../types/spotify';
import { mockTracks } from '../../data/mockSpotifyCatalog';
import { PlaylistTrackTable } from '../Playlist/PlaylistTrackTable';
import {
  Search as SearchIcon,
  X,
  Play,
  Pause,
  Loader2,
  Globe,
  Heart,
  ListPlus,
  Check,
  Plus,
  Disc3,
  Mic,
  User,
  ListMusic,
  Sparkles,
} from 'lucide-react';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { apiUrl } from '../../config/api';
import {
  fetchCollectionTracksDirect,
  searchFullCatalogDirect,
  shouldPreferServerBackend,
} from '../../services/catalogClient';

interface SearchRouteProps {
  onSelectPlaylist?: (playlist: Playlist) => void;
}

const CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tracks', label: 'Songs' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'podcasts', label: 'Podcasts & Shows' },
];

const GENRE_CARDS = [
  { id: 'pop', title: 'Pop', color: '#8d67ab', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
  { id: 'hiphop', title: 'Hip-Hop', color: '#ba5d07', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300' },
  { id: 'rock', title: 'Rock', color: '#e61e32', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300' },
  { id: 'electronic', title: 'Dance / Electronic', color: '#d84000', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
  { id: 'indie', title: 'Indie', color: '#608108', image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300' },
  { id: 'mood', title: 'Mood & Chill', color: '#e1118c', image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300' },
];

const SESSION_TERM_KEY = 'bytemusic_search_term';
const SESSION_CAT_KEY = 'bytemusic_search_category';

export const SearchRoute: React.FC<SearchRouteProps> = ({ onSelectPlaylist }) => {
  const {
    isVelvetLime,
    isAurora,
    isSunset,
    isFrost,
  } = useTheme();
  const { allPlaylists, chartRegion } = useLibrary();

  const [searchTerm, setSearchTerm] = useState<string>(() => {
    try {
      return sessionStorage.getItem(SESSION_TERM_KEY) || '';
    } catch {
      return '';
    }
  });
  const [debouncedTerm, setDebouncedTerm] = useState<string>(searchTerm);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_CAT_KEY) as SearchCategory | null;
      if (saved && CATEGORIES.some((c) => c.id === saved)) {
        return saved;
      }
    } catch {}
    return 'all';
  });
  const [catalogResult, setCatalogResult] = useState<SearchCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingCollectionId, setLoadingCollectionId] = useState<string | null>(null);

  // Persist current query and category across Search <-> Playlist navigation
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_TERM_KEY, searchTerm);
    } catch {}
  }, [searchTerm]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_CAT_KEY, activeCategory);
    } catch {}
  }, [activeCategory]);

  // Spotify 200ms debounce implementation (recovered from xpui-routes-search.js ew.YQ)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Live Multi-Entity Global Catalog Fetching (Songs, Artists + "This Is Artist" Mixes, Albums, Podcasts)
  useEffect(() => {
    const trimmed = debouncedTerm.trim();
    if (!trimmed) {
      setCatalogResult(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      try {
        let data: SearchCatalogResponse | null = null;
        if (shouldPreferServerBackend()) {
          try {
            const res = await fetch(apiUrl(`/api/search/catalog?q=${encodeURIComponent(trimmed)}&region=${chartRegion}`));
            if (res.ok) data = await res.json();
          } catch {}
        }
        if (!data) {
          data = await searchFullCatalogDirect({ q: trimmed, region: chartRegion });
        }
        if (isMounted) {
          setCatalogResult(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Global catalog search error:', err);
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [debouncedTerm, chartRegion]);

  // Combine Local Catalog + Global Song Results
  const searchResults: Track[] = useMemo(() => {
    if (!debouncedTerm.trim()) return [];
    const term = debouncedTerm.toLowerCase();
    const localMatches = mockTracks.filter(
      (track) =>
        track.name.toLowerCase().includes(term) ||
        track.artists.some((a) => a.name.toLowerCase().includes(term)) ||
        track.album.name.toLowerCase().includes(term)
    );

    const globalTracks = catalogResult?.tracks || [];
    const localNames = new Set(localMatches.map((t) => t.name.toLowerCase()));
    const filteredGlobal = globalTracks.filter(
      (gt) => !localNames.has(gt.name.toLowerCase())
    );

    return [...localMatches, ...filteredGlobal];
  }, [debouncedTerm, catalogResult]);

  // Combine Matching Library/Curated Playlists + Dynamic "This Is {Artist}" Playlists
  const matchedPlaylists: Playlist[] = useMemo(() => {
    if (!debouncedTerm.trim()) return [];
    const term = debouncedTerm.toLowerCase().trim();

    const libraryMatches = allPlaylists.filter((pl) => {
      if (pl.tracks.length === 0 && pl.id === 'playlist-recently-played') return false;
      const metaMatch =
        pl.name.toLowerCase().includes(term) ||
        pl.description.toLowerCase().includes(term) ||
        pl.owner.displayName.toLowerCase().includes(term);
      const trackMatch = pl.tracks.some(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.artists.some((a) => a.name.toLowerCase().includes(term))
      );
      return metaMatch || trackMatch;
    });

    const artistMixes = catalogResult?.artistPlaylists || [];
    const seenIds = new Set(artistMixes.map((p) => p.id));
    return [...artistMixes, ...libraryMatches.filter((p) => !seenIds.has(p.id))];
  }, [debouncedTerm, allPlaylists, catalogResult]);

  const matchedArtists: SearchCatalogArtist[] = catalogResult?.artists || [];
  const matchedAlbums: SearchCatalogAlbum[] = catalogResult?.albums || [];
  const matchedPodcasts: SearchCatalogPodcast[] = catalogResult?.podcasts || [];

  // Open an artist, album, or podcast as a full playable PlaylistRoute
  const openCollectionAsPlaylist = async ({
    collectionId,
    type,
    name,
    description,
    ownerName,
    image,
    preloadedTracks,
  }: {
    collectionId: string;
    type: 'artist' | 'album' | 'podcast';
    name: string;
    description: string;
    ownerName: string;
    image: string;
    preloadedTracks?: Track[];
  }) => {
    if (!onSelectPlaylist) return;

    const prefix =
      type === 'artist' ? 'artist-mix-' : type === 'album' ? 'search-album-' : 'search-podcast-';
    const playlistId = `${prefix}${collectionId}`;

    if (preloadedTracks && preloadedTracks.length > 0) {
      onSelectPlaylist({
        id: playlistId,
        uri: `spotify:playlist:${playlistId}`,
        name,
        description,
        owner: { id: `bytemusic-${type}`, displayName: ownerName },
        images: [{ url: image, width: 500, height: 500 }],
        tracks: preloadedTracks,
      });
      return;
    }

    setLoadingCollectionId(collectionId);
    try {
      let data: { tracks?: Track[] } | null = null;
      if (shouldPreferServerBackend()) {
        try {
          const res = await fetch(
            apiUrl(`/api/search/collection?id=${encodeURIComponent(collectionId)}&type=${type}&region=${chartRegion}`)
          );
          if (res.ok) data = await res.json();
        } catch {}
      }
      if (!data) {
        data = await fetchCollectionTracksDirect({ id: collectionId, type, region: chartRegion });
      }
      const tracks: Track[] = Array.isArray(data?.tracks) ? data.tracks : [];
      onSelectPlaylist({
        id: playlistId,
        uri: `spotify:playlist:${playlistId}`,
        name,
        description,
        owner: { id: `bytemusic-${type}`, displayName: ownerName },
        images: [{ url: image, width: 500, height: 500 }],
        tracks,
      });
    } catch (err) {
      console.error('Failed to open collection:', err);
    } finally {
      setLoadingCollectionId(null);
    }
  };

  const handleOpenArtist = (artist: SearchCatalogArtist) => {
    const existingMix = matchedPlaylists.find((p) => p.id === `artist-mix-${artist.id}`);
    if (existingMix && existingMix.tracks.length > 0 && onSelectPlaylist) {
      onSelectPlaylist(existingMix);
      return;
    }
    openCollectionAsPlaylist({
      collectionId: artist.id,
      type: 'artist',
      name: `This Is ${artist.name}`,
      description: `The essential tracks and most popular songs by ${artist.name}.`,
      ownerName: 'Spotify Essentials',
      image: artist.image,
      preloadedTracks: artist.tracks,
    });
  };

  const handleOpenAlbum = (album: SearchCatalogAlbum) => {
    openCollectionAsPlaylist({
      collectionId: album.id,
      type: 'album',
      name: album.name,
      description: `${album.releaseYear ? `${album.releaseYear} • ` : ''}${album.genre} album by ${album.artistName}.`,
      ownerName: album.artistName,
      image: album.image,
    });
  };

  const handleOpenPodcast = (podcast: SearchCatalogPodcast) => {
    openCollectionAsPlaylist({
      collectionId: podcast.id,
      type: 'podcast',
      name: podcast.name,
      description: `Podcast show hosted by ${podcast.artistName} • ${podcast.genre}.`,
      ownerName: podcast.artistName,
      image: podcast.image,
    });
  };

  const topArtistMix = matchedPlaylists.find((p) => p.id.startsWith('artist-mix-')) || null;
  const primaryArtistMatch = matchedArtists[0] || null;
  const promoteArtistTopResult = Boolean(
    topArtistMix &&
      topArtistMix.tracks.length > 0 &&
      primaryArtistMatch &&
      primaryArtistMatch.matchScore >= 75
  );
  const topSongResult = searchResults[0] || null;

  const hasAnyResults =
    searchResults.length > 0 ||
    matchedPlaylists.length > 0 ||
    matchedArtists.length > 0 ||
    matchedAlbums.length > 0 ||
    matchedPodcasts.length > 0;

  const activeCategoryHasResults =
    activeCategory === 'all'
      ? hasAnyResults
      : activeCategory === 'tracks'
      ? searchResults.length > 0
      : activeCategory === 'playlists'
      ? matchedPlaylists.length > 0
      : activeCategory === 'artists'
      ? matchedArtists.length > 0
      : activeCategory === 'albums'
      ? matchedAlbums.length > 0
      : activeCategory === 'podcasts'
      ? matchedPodcasts.length > 0
      : hasAnyResults;

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto pb-32 md:pb-8 select-none scrollbar-none space-y-6">
      {/* Top Search Bar & Global Search Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* iOS Liquid Glass Search Input */}
        <div className="relative flex items-center w-full max-w-lg">
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
            placeholder="Search songs, artists, albums, playlists, or podcasts..."
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
                : 'bg-white/[0.08] border-white/25 text-white placeholder-white/45 focus:border-white/55 focus:bg-white/[0.12]'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className={`absolute right-3.5 p-1 rounded-full transition-colors cursor-pointer ${
                isFrost
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Global Catalog Badge */}
        <div
          style={{
            backdropFilter: 'blur(16px) saturate(185%)',
            WebkitBackdropFilter: 'blur(16px) saturate(185%)',
            boxShadow: isFrost
              ? 'inset 0 1px 1px rgba(255,255,255,0.9), 0 4px 12px rgba(15,23,42,0.06)'
              : 'inset 0 1px 1px rgba(255,255,255,0.35), 0 4px 14px rgba(0,0,0,0.35)',
          }}
          className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border ${
            isFrost
              ? 'bg-sky-500/15 border-sky-400/30 text-sky-900'
              : isAurora
              ? 'bg-emerald-400/20 border-emerald-400/35 text-emerald-300'
              : isSunset
              ? 'bg-rose-500/20 border-rose-400/35 text-rose-300'
              : isVelvetLime
              ? 'bg-[#D2F843]/15 border-[#D2F843]/30 text-[#D2F843]'
              : 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300'
          }`}
        >
          <Globe size={14} />
          <span>Live Global Search</span>
        </div>
      </div>

      {/* iOS Segmented Category Filter Chips */}
      {debouncedTerm && (
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
            {CATEGORIES.map((cat) => {
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
            {isLoading && (
              <div
                className={`flex items-center gap-1.5 text-xs font-medium px-3 ${
                  isFrost ? 'text-slate-600' : 'text-white/70'
                }`}
              >
                <Loader2
                  size={13}
                  className={`animate-spin ${isFrost ? 'text-sky-600' : 'text-emerald-400'}`}
                />
                <span>Fetching catalog...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Browse Genre Cards (when query is empty) */}
      {!debouncedTerm ? (
        <div>
          <h2
            className={`text-xl sm:text-2xl font-black mb-4 font-sans tracking-tight ${
              isFrost ? 'text-slate-900' : 'text-white'
            }`}
          >
            Browse all
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {GENRE_CARDS.map((genre) => (
              <div
                key={genre.id}
                style={{
                  backgroundColor: genre.color,
                  boxShadow:
                    'inset 0 1.5px 1.5px rgba(255,255,255,0.45), 0 14px 28px -8px rgba(0,0,0,0.45)',
                }}
                onClick={() => setSearchTerm(genre.title)}
                className="group relative h-40 rounded-[20px] p-4 overflow-hidden cursor-pointer border border-white/25 hover:scale-[1.03] transition-all duration-200 select-none"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/25 opacity-80"
                />
                <h3 className="relative z-10 text-lg font-black text-white max-w-[120px] leading-tight font-sans drop-shadow-sm">
                  {genre.title}
                </h3>
                <img
                  src={genre.image}
                  alt={genre.title}
                  loading="lazy"
                  decoding="async"
                  width={96}
                  height={96}
                  className="absolute -right-3 -bottom-2 w-24 h-24 rotate-[22deg] shadow-2xl rounded-xl object-cover border border-white/30 group-hover:rotate-[28deg] group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      ) : isLoading && !hasAnyResults ? (
        <div
          className={`flex flex-col items-center justify-center py-20 ${
            isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'
          }`}
        >
          <Loader2
            size={32}
            className={`animate-spin mb-3 ${isFrost ? 'text-sky-600' : 'text-[#1db954]'}`}
          />
          <p className="text-sm font-medium">Searching songs, artists, playlists & podcasts...</p>
        </div>
      ) : activeCategoryHasResults ? (
        <div className="space-y-8">
          {/* ALL VIEW */}
          {activeCategory === 'all' && (
            <>
              {/* Top Result Card + Top 4 Songs */}
              {(promoteArtistTopResult || topSongResult) && (
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_2fr] gap-6">
                  {promoteArtistTopResult && topArtistMix ? (
                    <TopArtistPlaylistCard
                      playlist={topArtistMix}
                      subtitle={primaryArtistMatch?.genre || 'Artist Essentials'}
                      onOpen={() => onSelectPlaylist?.(topArtistMix)}
                    />
                  ) : (
                    topSongResult && <TopResultCard track={topSongResult} queue={searchResults} />
                  )}

                  {searchResults.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2
                          className={`text-xl font-black font-sans tracking-tight ${
                            isFrost ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          Songs
                        </h2>
                        {searchResults.length > 4 && (
                          <button
                            onClick={() => setActiveCategory('tracks')}
                            className={`text-xs font-bold cursor-pointer hover:underline ${
                              isFrost ? 'text-sky-700' : 'text-white/70 hover:text-white'
                            }`}
                          >
                            Show all
                          </button>
                        )}
                      </div>
                      <PlaylistTrackTable tracks={searchResults.slice(0, 4)} />
                    </div>
                  )}
                </div>
              )}

              {/* Playlists & Artist Mixes Shelf */}
              {matchedPlaylists.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className={`text-xl font-black font-sans tracking-tight ${
                        isFrost ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      Playlists & Artist Mixes
                    </h2>
                    {matchedPlaylists.length > 5 && (
                      <button
                        onClick={() => setActiveCategory('playlists')}
                        className={`text-xs font-bold cursor-pointer hover:underline ${
                          isFrost ? 'text-sky-700' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Show all
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {matchedPlaylists.slice(0, 5).map((pl) => (
                      <PlaylistSearchCard
                        key={pl.id}
                        playlist={pl}
                        onOpen={() => onSelectPlaylist?.(pl)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Artists Shelf */}
              {matchedArtists.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className={`text-xl font-black font-sans tracking-tight ${
                        isFrost ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      Artists
                    </h2>
                    {matchedArtists.length > 4 && (
                      <button
                        onClick={() => setActiveCategory('artists')}
                        className={`text-xs font-bold cursor-pointer hover:underline ${
                          isFrost ? 'text-sky-700' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Show all
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {matchedArtists.slice(0, 5).map((artist) => (
                      <ArtistSearchCard
                        key={artist.id}
                        artist={artist}
                        isLoading={loadingCollectionId === artist.id}
                        onOpen={() => handleOpenArtist(artist)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Albums Shelf */}
              {matchedAlbums.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className={`text-xl font-black font-sans tracking-tight ${
                        isFrost ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      Albums
                    </h2>
                    {matchedAlbums.length > 5 && (
                      <button
                        onClick={() => setActiveCategory('albums')}
                        className={`text-xs font-bold cursor-pointer hover:underline ${
                          isFrost ? 'text-sky-700' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Show all
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {matchedAlbums.slice(0, 5).map((album) => (
                      <CollectionSearchCard
                        key={album.id}
                        title={album.name}
                        subtitle={`${album.releaseYear ? `${album.releaseYear} • ` : ''}${album.artistName}`}
                        badge={album.trackCount ? `${album.trackCount} tracks` : 'Album'}
                        image={album.image}
                        isLoading={loadingCollectionId === album.id}
                        onOpen={() => handleOpenAlbum(album)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Podcasts Shelf (only when podcast results match query cleanly) */}
              {matchedPodcasts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className={`text-xl font-black font-sans tracking-tight ${
                        isFrost ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      Podcasts & Shows
                    </h2>
                    {matchedPodcasts.length > 4 && (
                      <button
                        onClick={() => setActiveCategory('podcasts')}
                        className={`text-xs font-bold cursor-pointer hover:underline ${
                          isFrost ? 'text-sky-700' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Show all
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {matchedPodcasts.slice(0, 5).map((pod) => (
                      <CollectionSearchCard
                        key={pod.id}
                        title={pod.name}
                        subtitle={pod.artistName}
                        badge={pod.genre}
                        image={pod.image}
                        isLoading={loadingCollectionId === pod.id}
                        onOpen={() => handleOpenPodcast(pod)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Full Song Results Table */}
              {searchResults.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className={`text-xl font-black font-sans tracking-tight ${
                        isFrost ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      All Songs ({searchResults.length})
                    </h2>
                    <span className={`text-xs ${isFrost ? 'text-slate-500' : 'text-[#b3b3b3]'}`}>
                      Streaming via Live YouTube Audio Engine
                    </span>
                  </div>
                  <PlaylistTrackTable tracks={searchResults} />
                </div>
              )}
            </>
          )}

          {/* SONGS TAB */}
          {activeCategory === 'tracks' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2
                  className={`text-xl font-black font-sans tracking-tight ${
                    isFrost ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Songs ({searchResults.length})
                </h2>
                <span className={`text-xs ${isFrost ? 'text-slate-500' : 'text-[#b3b3b3]'}`}>
                  Streaming via Live YouTube Audio Engine
                </span>
              </div>
              <PlaylistTrackTable tracks={searchResults} />
            </div>
          )}

          {/* PLAYLISTS TAB */}
          {activeCategory === 'playlists' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className={`text-xl font-black font-sans tracking-tight ${
                      isFrost ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    Playlists & Artist Essentials ({matchedPlaylists.length})
                  </h2>
                  <p className={`text-xs mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/60'}`}>
                    Includes auto-curated “This Is Artist” mixes and your matching playlists
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {matchedPlaylists.map((pl) => (
                  <PlaylistSearchCard
                    key={pl.id}
                    playlist={pl}
                    onOpen={() => onSelectPlaylist?.(pl)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ARTISTS TAB */}
          {activeCategory === 'artists' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className={`text-xl font-black font-sans tracking-tight ${
                      isFrost ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    Artists ({matchedArtists.length})
                  </h2>
                  <p className={`text-xs mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/60'}`}>
                    Open any artist to view and play their most popular studio tracks
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {matchedArtists.map((artist) => (
                  <ArtistSearchCard
                    key={artist.id}
                    artist={artist}
                    isLoading={loadingCollectionId === artist.id}
                    onOpen={() => handleOpenArtist(artist)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ALBUMS TAB */}
          {activeCategory === 'albums' && (
            <div>
              <h2
                className={`text-xl font-black mb-4 font-sans tracking-tight ${
                  isFrost ? 'text-slate-900' : 'text-white'
                }`}
              >
                Albums ({matchedAlbums.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {matchedAlbums.map((album) => (
                  <CollectionSearchCard
                    key={album.id}
                    title={album.name}
                    subtitle={`${album.releaseYear ? `${album.releaseYear} • ` : ''}${album.artistName}`}
                    badge={album.trackCount ? `${album.trackCount} tracks` : 'Album'}
                    image={album.image}
                    isLoading={loadingCollectionId === album.id}
                    onOpen={() => handleOpenAlbum(album)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* PODCASTS TAB */}
          {activeCategory === 'podcasts' && (
            <div>
              <h2
                className={`text-xl font-black mb-4 font-sans tracking-tight ${
                  isFrost ? 'text-slate-900' : 'text-white'
                }`}
              >
                Podcasts & Shows ({matchedPodcasts.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {matchedPodcasts.map((pod) => (
                  <CollectionSearchCard
                    key={pod.id}
                    title={pod.name}
                    subtitle={pod.artistName}
                    badge={pod.genre}
                    image={pod.image}
                    isLoading={loadingCollectionId === pod.id}
                    onOpen={() => handleOpenPodcast(pod)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`text-center py-20 ${
            isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'
          }`}
        >
          <h3
            className={`text-xl font-bold mb-2 ${
              isFrost ? 'text-slate-900' : 'text-white'
            }`}
          >
            No {activeCategory === 'all' ? 'results' : activeCategory} found for "{debouncedTerm}"
          </h3>
          <p className="text-sm">
            Try switching filter tabs or checking your spelling.
          </p>
        </div>
      )}
    </div>
  );
};

/* ---------- Top Result: Artist Essentials Card ---------- */
const TopArtistPlaylistCard: React.FC<{
  playlist: Playlist;
  subtitle: string;
  onOpen: () => void;
}> = ({ playlist, subtitle, onOpen }) => {
  const firstTrack = playlist.tracks[0];
  const { isActive, isPlaying, isLoading, togglePlay } = usePlayContextItem({
    uri: firstTrack?.uri || playlist.uri,
    track: firstTrack,
    queue: playlist.tracks,
  });
  const { isAurora, isSunset, isFrost, isVelvetLime } = useTheme();

  return (
    <div
      onClick={onOpen}
      style={{
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        boxShadow: isFrost
          ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), 0 14px 30px -8px rgba(15,23,42,0.09)'
          : 'inset 0 1.5px 1.5px rgba(255,255,255,0.45), 0 16px 34px -12px rgba(0,0,0,0.48)',
      }}
      className={`group relative p-5 rounded-[24px] border transition-all duration-300 cursor-pointer select-none overflow-hidden ${
        isFrost
          ? 'border-slate-200/90 bg-white/75 hover:bg-white/95 text-slate-900 shadow-sm'
          : isAurora
          ? 'border-emerald-400/25 bg-white/[0.05] hover:bg-white/[0.12] text-white'
          : isSunset
          ? 'border-rose-400/25 bg-white/[0.05] hover:bg-white/[0.12] text-white'
          : isVelvetLime
          ? 'border-white/20 bg-white/[0.05] hover:bg-white/[0.11] text-white'
          : 'border-white/30 bg-white/[0.05] hover:bg-white/[0.11] text-white'
      }`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-40 ${
          isFrost
            ? 'bg-gradient-to-tr from-sky-400/10 via-transparent to-indigo-300/15'
            : isAurora
            ? 'bg-gradient-to-tr from-emerald-400/15 via-transparent to-cyan-300/20'
            : isSunset
            ? 'bg-gradient-to-tr from-rose-500/15 via-transparent to-amber-300/15'
            : 'bg-gradient-to-tr from-cyan-400/15 via-transparent to-fuchsia-400/20'
        }`}
      />

      <div className="relative z-10 flex items-center justify-between mb-4">
        <h2 className={`text-lg font-black font-sans tracking-tight ${isFrost ? 'text-slate-900' : 'text-white'}`}>
          Top result
        </h2>
        <span
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            isFrost
              ? 'bg-sky-500/15 border-sky-400/30 text-sky-900'
              : 'bg-white/15 border-white/25 text-white'
          }`}
        >
          <Sparkles size={11} />
          Artist Mix
        </span>
      </div>

      {playlist.images[0] && (
        <img
          src={playlist.images[0].url}
          alt={playlist.name}
          loading="lazy"
          decoding="async"
          width={96}
          height={96}
          className={`relative z-10 w-24 h-24 rounded-full object-cover shadow-lg mb-4 border-2 ${
            isFrost ? 'border-white bg-white' : 'border-white/30 bg-slate-950/60'
          }`}
        />
      )}

      <h3
        className={`relative z-10 text-2xl font-black mb-1 truncate font-sans ${
          isFrost ? 'text-slate-900' : 'text-white'
        }`}
      >
        {playlist.name}
      </h3>

      <div
        className={`relative z-10 flex items-center gap-2 text-sm font-medium pr-14 ${
          isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'
        }`}
      >
        <span className={isFrost ? 'font-semibold text-slate-900' : 'font-semibold text-white'}>
          {subtitle}
        </span>
        <span>•</span>
        <span>{playlist.tracks.length} popular tracks</span>
      </div>

      <div className="absolute bottom-5 right-5 flex items-center gap-2.5 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          title={isActive && isPlaying ? 'Pause' : `Play ${playlist.name}`}
          style={{
            boxShadow: isFrost
              ? 'inset 0 1.5px 1px rgba(255,255,255,0.95), 0 8px 20px rgba(15,23,42,0.15)'
              : 'inset 0 1.5px 1px rgba(255,255,255,0.85), 0 10px 24px rgba(0,0,0,0.45)',
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer ${
            isFrost
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : isAurora
              ? 'bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300'
              : isSunset
              ? 'bg-rose-500 text-white font-bold hover:bg-rose-400'
              : isVelvetLime
              ? 'bg-[#D2F843] text-black font-bold hover:bg-[#c2e833]'
              : 'bg-white text-slate-950 hover:bg-white/90'
          }`}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-current" />
          ) : isActive && isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};

/* ---------- Playlist Card in Search (Click Opens Playlist, Play Plays Inline) ---------- */
const PlaylistSearchCard: React.FC<{ playlist: Playlist; onOpen: () => void }> = ({ playlist, onOpen }) => {
  const firstTrack = playlist.tracks[0];
  const { isActive, isPlaying, isLoading, togglePlay } = usePlayContextItem({
    uri: firstTrack?.uri || playlist.uri,
    track: firstTrack,
    queue: playlist.tracks,
  });
  const { isFrost, isAurora, isSunset, isVelvetLime } = useTheme();
  const isArtistMix = playlist.id.startsWith('artist-mix-');

  return (
    <div
      onClick={onOpen}
      style={{
        contain: 'layout paint',
        boxShadow: isFrost
          ? 'inset 0 1px 1px rgba(255,255,255,0.95), 0 8px 20px -6px rgba(15,23,42,0.08)'
          : 'inset 0 1px 1px rgba(255,255,255,0.28), 0 10px 24px -10px rgba(0,0,0,0.45)',
      }}
      className={`group relative rounded-[20px] p-3.5 border transition-colors duration-200 cursor-pointer flex flex-col gap-3 ${
        isFrost
          ? 'bg-white/80 hover:bg-white border-slate-200/90 text-slate-900'
          : 'bg-white/[0.08] hover:bg-white/[0.13] border-white/20 text-white'
      }`}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md bg-slate-900/40">
        {playlist.images[0]?.url ? (
          <img
            src={playlist.images[0].url}
            alt={playlist.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600">
            <ListMusic size={34} className="text-white" />
          </div>
        )}

        {isArtistMix && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/65 text-white backdrop-blur-md border border-white/20">
            Artist Mix
          </span>
        )}

        {playlist.tracks.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            aria-label={`Play ${playlist.name}`}
            className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
              isActive && isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
            } ${
              isFrost
                ? 'bg-slate-900 text-white'
                : isAurora
                ? 'bg-emerald-400 text-slate-950'
                : isSunset
                ? 'bg-rose-500 text-white'
                : isVelvetLime
                ? 'bg-[#D2F843] text-black'
                : 'bg-[#1db954] text-black'
            }`}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isActive && isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-bold text-sm truncate">{playlist.name}</p>
        <p className={`text-xs truncate mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>
          {playlist.owner.displayName} • {playlist.tracks.length} songs
        </p>
      </div>
    </div>
  );
};

/* ---------- Artist Card in Search (Opens "This Is Artist" Playlist or Plays Directly) ---------- */
const ArtistSearchCard: React.FC<{
  artist: SearchCatalogArtist;
  isLoading: boolean;
  onOpen: () => void;
}> = ({ artist, isLoading: isOpening, onOpen }) => {
  const firstTrack = artist.tracks[0];
  const { isActive, isPlaying, togglePlay } = usePlayContextItem({
    uri: firstTrack?.uri || `spotify:artist:${artist.id}`,
    track: firstTrack,
    queue: artist.tracks,
  });
  const { isFrost, isAurora, isSunset, isVelvetLime } = useTheme();

  return (
    <div
      onClick={onOpen}
      style={{
        contain: 'layout paint',
        boxShadow: isFrost
          ? 'inset 0 1px 1px rgba(255,255,255,0.95), 0 8px 20px -6px rgba(15,23,42,0.08)'
          : 'inset 0 1px 1px rgba(255,255,255,0.28), 0 10px 24px -10px rgba(0,0,0,0.45)',
      }}
      className={`group relative rounded-[20px] p-4 border transition-colors duration-200 cursor-pointer flex flex-col items-center text-center gap-3 ${
        isFrost
          ? 'bg-white/80 hover:bg-white border-slate-200/90 text-slate-900'
          : 'bg-white/[0.08] hover:bg-white/[0.13] border-white/20 text-white'
      }`}
    >
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-xl border-2 border-white/25 bg-slate-900/40">
        {artist.image ? (
          <img
            src={artist.image}
            alt={artist.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User size={36} className="text-white/60" />
          </div>
        )}

        {artist.tracks.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            aria-label={`Play top tracks by ${artist.name}`}
            className={`absolute bottom-1.5 right-1.5 w-9 h-9 rounded-full flex items-center justify-center shadow-xl transition-all cursor-pointer ${
              isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } ${
              isFrost
                ? 'bg-slate-900 text-white'
                : isAurora
                ? 'bg-emerald-400 text-slate-950'
                : isSunset
                ? 'bg-rose-500 text-white'
                : isVelvetLime
                ? 'bg-[#D2F843] text-black'
                : 'bg-[#1db954] text-black'
            }`}
          >
            {isActive && isPlaying ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        )}
      </div>

      <div className="min-w-0 w-full">
        <p className="font-bold text-sm truncate flex items-center justify-center gap-1.5">
          {isOpening && <Loader2 size={13} className="animate-spin flex-shrink-0" />}
          <span className="truncate">{artist.name}</span>
        </p>
        <p className={`text-xs truncate mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>
          Artist • {artist.genre}
        </p>
      </div>
    </div>
  );
};

/* ---------- Album / Podcast Collection Card ---------- */
const CollectionSearchCard: React.FC<{
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  isLoading: boolean;
  onOpen: () => void;
}> = ({ title, subtitle, badge, image, isLoading, onOpen }) => {
  const { isFrost } = useTheme();
  const isPodcast = badge.toLowerCase().includes('podcast') || badge.toLowerCase().includes('comedy');

  return (
    <div
      onClick={onOpen}
      style={{
        contain: 'layout paint',
        boxShadow: isFrost
          ? 'inset 0 1px 1px rgba(255,255,255,0.95), 0 8px 20px -6px rgba(15,23,42,0.08)'
          : 'inset 0 1px 1px rgba(255,255,255,0.28), 0 10px 24px -10px rgba(0,0,0,0.45)',
      }}
      className={`group relative rounded-[20px] p-3.5 border transition-colors duration-200 cursor-pointer flex flex-col gap-3 ${
        isFrost
          ? 'bg-white/80 hover:bg-white border-slate-200/90 text-slate-900'
          : 'bg-white/[0.08] hover:bg-white/[0.13] border-white/20 text-white'
      }`}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md bg-slate-900/40">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isPodcast ? <Mic size={32} /> : <Disc3 size={32} />}
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-bold text-sm truncate">{title}</p>
        <p className={`text-xs truncate mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>
          {subtitle}
        </p>
        <span
          className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isFrost
              ? 'bg-slate-200/70 border-slate-300 text-slate-700'
              : 'bg-white/10 border-white/15 text-white/75'
          }`}
        >
          {badge}
        </span>
      </div>
    </div>
  );
};

/* ---------- Top Result: Song Card ---------- */
const TopResultCard: React.FC<{ track: Track; queue?: Track[] }> = ({ track, queue }) => {
  const { isActive, isPlaying, isLoading, togglePlay } = usePlayContextItem({
    uri: track.uri,
    track,
    queue,
  });
  const { isLiked, toggleLike, customPlaylists, addTrackToPlaylist, createPlaylist } = useLibrary();
  const { isAurora, isSunset, isFrost, isVelvetLime } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const liked = isLiked(track.id);

  const handleAddToPlaylist = (playlistId: string, plName: string) => {
    const res = addTrackToPlaylist(playlistId, track);
    if (res.alreadyExists) {
      setToastMsg(`Already in ${plName}`);
    } else {
      setToastMsg(`Added to ${plName}!`);
    }
    setTimeout(() => {
      setToastMsg(null);
      setShowMenu(false);
    }, 1500);
  };

  const handleCreateAndAdd = () => {
    const newPl = createPlaylist(undefined, undefined, [track]);
    setToastMsg(`Created & added to ${newPl.name}!`);
    setTimeout(() => {
      setToastMsg(null);
      setShowMenu(false);
    }, 1500);
  };

  return (
    <div
      onClick={() => togglePlay()}
      style={{
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        boxShadow: isFrost
          ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), 0 14px 30px -8px rgba(15,23,42,0.09)'
          : 'inset 0 1.5px 1.5px rgba(255,255,255,0.45), 0 16px 34px -12px rgba(0,0,0,0.48)',
      }}
      className={`group relative p-5 rounded-[24px] border transition-all duration-300 cursor-pointer select-none overflow-hidden ${
        isFrost
          ? 'border-slate-200/90 bg-white/75 hover:bg-white/95 text-slate-900 shadow-sm'
          : isAurora
          ? 'border-emerald-400/25 bg-white/[0.05] hover:bg-white/[0.12] text-white'
          : isSunset
          ? 'border-rose-400/25 bg-white/[0.05] hover:bg-white/[0.12] text-white'
          : isVelvetLime
          ? 'border-white/20 bg-white/[0.05] hover:bg-white/[0.11] text-white'
          : 'border-white/30 bg-white/[0.05] hover:bg-white/[0.11] text-white'
      }`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-40 transition-colors duration-300 ${
          isFrost
            ? 'bg-gradient-to-tr from-sky-400/10 via-transparent to-indigo-300/15'
            : isAurora
            ? 'bg-gradient-to-tr from-emerald-400/15 via-transparent to-cyan-300/20'
            : isSunset
            ? 'bg-gradient-to-tr from-rose-500/15 via-transparent to-amber-300/15'
            : 'bg-gradient-to-tr from-cyan-400/15 via-transparent to-fuchsia-400/20'
        }`}
      />

      <h2
        className={`relative z-10 text-lg font-black mb-4 font-sans tracking-tight ${
          isFrost ? 'text-slate-900' : 'text-white'
        }`}
      >
        Top result
      </h2>

      {track.album.images[0] && (
        <img
          src={track.album.images[0].url}
          alt={track.name}
          loading="lazy"
          decoding="async"
          width={96}
          height={96}
          className={`relative z-10 w-24 h-24 rounded-2xl object-cover shadow-lg mb-4 border ${
            isFrost ? 'border-slate-200 bg-white' : 'border-white/25 bg-slate-950/60'
          }`}
        />
      )}

      <h3
        className={`relative z-10 text-2xl font-black mb-1 truncate font-sans ${
          isFrost ? 'text-slate-900' : 'text-white'
        }`}
      >
        {track.name}
      </h3>

      <div
        className={`relative z-10 flex items-center gap-2 text-sm font-medium ${
          isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'
        }`}
      >
        <span className={isFrost ? 'font-semibold text-slate-900' : 'font-semibold text-white'}>
          {track.artists.map((a) => a.name).join(', ')}
        </span>
        <span>•</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
            isFrost
              ? 'bg-slate-200/80 border-slate-300 text-slate-800'
              : 'bg-white/10 border-white/20 text-white'
          }`}
        >
          Song
        </span>
      </div>

      {/* Action Buttons in Bottom Right */}
      <div className="absolute bottom-5 right-5 flex items-center gap-2.5 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track);
          }}
          title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          className={`p-2.5 rounded-full transition-all hover:scale-110 cursor-pointer ${
            liked
              ? 'text-rose-500'
              : isFrost
              ? 'opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-950 bg-white/90 shadow'
              : 'opacity-0 group-hover:opacity-100 text-white/70 hover:text-white bg-black/60'
          }`}
        >
          <Heart size={18} className={liked ? 'fill-current' : ''} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((prev) => !prev);
          }}
          title="Add to playlist"
          className={`p-2.5 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110 transition-all cursor-pointer ${
            isFrost
              ? 'text-slate-600 hover:text-slate-950 bg-white/90 shadow'
              : 'text-white/70 hover:text-white bg-black/60'
          }`}
        >
          <ListPlus size={18} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          style={{
            boxShadow: isFrost
              ? 'inset 0 1.5px 1px rgba(255,255,255,0.95), 0 8px 20px rgba(15,23,42,0.15)'
              : 'inset 0 1.5px 1px rgba(255,255,255,0.85), 0 10px 24px rgba(0,0,0,0.45)',
          }}
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 cursor-pointer ${
            isFrost
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : isAurora
              ? 'bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300'
              : isSunset
              ? 'bg-rose-500 text-white font-bold hover:bg-rose-400'
              : isVelvetLime
              ? 'bg-[#D2F843] text-black font-bold hover:bg-[#c2e833]'
              : 'bg-white text-slate-950 hover:bg-white/90'
          }`}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-current" />
          ) : isActive && isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Add to Playlist Popover */}
      {showMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backdropFilter: 'blur(12px) saturate(145%)',
            WebkitBackdropFilter: 'blur(12px) saturate(145%)',
          }}
          className={`absolute right-5 bottom-20 w-64 rounded-2xl border shadow-2xl p-2 text-xs text-left z-50 select-none ${
            isFrost
              ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60'
              : 'bg-[#181824]/95 border-white/20 text-white'
          }`}
        >
          <div
            className={`px-2 py-1 font-bold border-b mb-1.5 flex items-center justify-between ${
              isFrost ? 'text-slate-600 border-slate-200' : 'text-[#b3b3b3] border-white/10'
            }`}
          >
            <span>Add to playlist</span>
            {toastMsg && (
              <span className={`font-semibold ${isFrost ? 'text-sky-600' : 'text-emerald-400'}`}>
                {toastMsg}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              toggleLike(track);
              setToastMsg(liked ? 'Removed from Liked' : 'Saved to Liked Songs');
              setTimeout(() => setToastMsg(null), 1200);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors cursor-pointer ${
              isFrost ? 'hover:bg-slate-100 text-slate-900' : 'hover:bg-white/10 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Heart
                size={14}
                className={liked ? 'text-rose-500 fill-current' : 'text-current'}
              />
              <span>Liked Songs</span>
            </div>
            {liked && <Check size={14} className="text-rose-500" />}
          </button>

          {customPlaylists.length > 0 && (
            <div
              className={`my-1 border-t pt-1 max-h-36 overflow-y-auto ${
                isFrost ? 'border-slate-200' : 'border-white/10'
              }`}
            >
              {customPlaylists.map((pl) => {
                const alreadyIn = pl.tracks.some((t) => t.id === track.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                      isFrost ? 'hover:bg-slate-100 text-slate-900' : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    <span className="truncate max-w-[170px]">{pl.name}</span>
                    {alreadyIn ? (
                      <Check
                        size={14}
                        className={isFrost ? 'text-sky-600' : 'text-emerald-400'}
                      />
                    ) : (
                      <Plus
                        size={14}
                        className={isFrost ? 'text-slate-400' : 'text-[#b3b3b3]'}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className={`border-t pt-1 mt-1 ${isFrost ? 'border-slate-200' : 'border-white/10'}`}>
            <button
              onClick={handleCreateAndAdd}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                isFrost
                  ? 'hover:bg-slate-100 text-sky-600'
                  : 'hover:bg-white/10 text-emerald-400'
              }`}
            >
              <Plus size={14} />
              <span>New playlist with this song</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
