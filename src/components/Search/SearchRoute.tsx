import React, { useState, useEffect, useMemo } from 'react';
import { SearchCategory, Track } from '../../types/spotify';
import { mockTracks } from '../../data/mockSpotifyCatalog';
import { PlaylistTrackTable } from '../Playlist/PlaylistTrackTable';
import { Search as SearchIcon, X, Play, Pause, Loader2, Globe, Heart, ListPlus, Check, Plus } from 'lucide-react';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';

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

export const SearchRoute: React.FC = () => {
  const { isLiquidGlass } = useTheme();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedTerm, setDebouncedTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [globalTracks, setGlobalTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Spotify 200ms debounce implementation (recovered from xpui-routes-search.js ew.YQ)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Live Global Catalog Fetching
  useEffect(() => {
    if (!debouncedTerm.trim()) {
      setGlobalTracks([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(debouncedTerm)}&entity=song&limit=30`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.results && Array.isArray(data.results)) {
          const mapped: Track[] = data.results.map((item: any) => ({
            id: `global-${item.trackId}`,
            uri: `spotify:track:global-${item.trackId}`,
            name: item.trackName,
            duration: { milliseconds: item.trackTimeMillis || 180000 },
            artists: [
              {
                id: `artist-${item.artistId}`,
                name: item.artistName,
                uri: `spotify:artist:${item.artistId}`,
              },
            ],
            album: {
              id: `album-${item.collectionId}`,
              name: item.collectionName || item.trackName,
              uri: `spotify:album:${item.collectionId}`,
              images: [
                {
                  url:
                    item.artworkUrl100?.replace('100x100bb', '600x600bb') ||
                    item.artworkUrl100 ||
                    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300',
                  width: 600,
                  height: 600,
                },
              ],
            },
            isPlayable: true,
            isExplicit: item.trackExplicitness === 'explicit',
            audioUrl: item.previewUrl,
            addedAt: 'Global Search',
          }));
          setGlobalTracks(mapped);
        } else {
          setGlobalTracks([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Global search error:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedTerm]);

  // Combine Local Catalog + Global Results
  const searchResults: Track[] = useMemo(() => {
    if (!debouncedTerm.trim()) return [];
    const term = debouncedTerm.toLowerCase();
    const localMatches = mockTracks.filter(
      (track) =>
        track.name.toLowerCase().includes(term) ||
        track.artists.some((a) => a.name.toLowerCase().includes(term)) ||
        track.album.name.toLowerCase().includes(term)
    );

    const localNames = new Set(localMatches.map((t) => t.name.toLowerCase()));
    const filteredGlobal = globalTracks.filter(
      (gt) => !localNames.has(gt.name.toLowerCase())
    );

    return [...localMatches, ...filteredGlobal];
  }, [debouncedTerm, globalTracks]);

  const topResult = searchResults[0] || null;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Search Input Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex items-center w-full max-w-md">
          <SearchIcon className="absolute left-3.5 text-[#b3b3b3]" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search any song, artist, or album in the world..."
            className={`w-full text-white placeholder-[#757575] text-sm rounded-full py-3 pl-10 pr-10 outline-none transition-all ${
              isLiquidGlass
                ? 'glass-pill border border-white/20 focus:ring-2 focus:ring-white/50 focus:bg-white/15'
                : 'bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] focus:ring-2 focus:ring-white'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 text-[#b3b3b3] hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Global Catalog Badge */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isLiquidGlass
              ? 'glass-pill text-[#1ed760] border border-emerald-400/30'
              : 'bg-[#1db954]/10 text-[#1db954]'
          }`}
        >
          <Globe size={14} />
          <span>Live Global Search</span>
        </div>
      </div>

      {/* Category Filter Chips */}
      {debouncedTerm && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-white text-black shadow-md font-semibold'
                  : isLiquidGlass
                  ? 'glass-pill text-white/90 hover:text-white hover:bg-white/20'
                  : 'bg-[#242424] hover:bg-[#2a2a2a] text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#b3b3b3] px-3">
              <Loader2 size={14} className="animate-spin text-[#1db954]" />
              <span>Fetching global catalog...</span>
            </div>
          )}
        </div>
      )}

      {/* Results or Browse Categories */}
      {!debouncedTerm ? (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Browse all</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {GENRE_CARDS.map((genre) => (
              <div
                key={genre.id}
                style={{ backgroundColor: genre.color }}
                onClick={() => setSearchTerm(genre.title)}
                className="relative h-44 rounded-lg p-4 overflow-hidden cursor-pointer shadow hover:scale-[1.02] transition-transform select-none"
              >
                <h3 className="text-xl font-bold text-white max-w-[120px] leading-tight">
                  {genre.title}
                </h3>
                <img
                  src={genre.image}
                  alt={genre.title}
                  className="absolute -right-4 -bottom-2 w-24 h-24 rotate-[25deg] shadow-lg rounded object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-8">
          {/* Top Result Card & Songs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_2fr] gap-6">
            {topResult && <TopResultCard track={topResult} queue={searchResults} />}
            <div>
              <h2 className="text-xl font-bold text-white mb-3">Songs</h2>
              <PlaylistTrackTable tracks={searchResults.slice(0, 4)} />
            </div>
          </div>

          {/* Full Results Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">All Results ({searchResults.length})</h2>
              <span className="text-xs text-[#b3b3b3]">Streaming via YouTube Audio Engine</span>
            </div>
            <PlaylistTrackTable tracks={searchResults} />
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#b3b3b3]">
          <Loader2 size={32} className="animate-spin text-[#1db954] mb-3" />
          <p className="text-sm">Searching millions of songs worldwide...</p>
        </div>
      ) : (
        <div className="text-center py-20 text-[#b3b3b3]">
          <h3 className="text-xl font-bold text-white mb-2">
            No results found for "{debouncedTerm}"
          </h3>
          <p className="text-sm">
            Please make sure your words are spelled correctly, or use fewer or different keywords.
          </p>
        </div>
      )}
    </div>
  );
};

const TopResultCard: React.FC<{ track: Track; queue?: Track[] }> = ({ track, queue }) => {
  const { isActive, isPlaying, isLoading, togglePlay } = usePlayContextItem({ uri: track.uri, track, queue });
  const { isLiked, toggleLike, customPlaylists, addTrackToPlaylist, createPlaylist } = useLibrary();
  const { isLiquidGlass } = useTheme();
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
      className={`group relative p-5 transition-all cursor-pointer select-none ${
        isLiquidGlass ? 'glass-card rounded-2xl' : 'bg-[#181818] hover:bg-[#282828] rounded-lg'
      }`}
    >
      <h2 className="text-xl font-bold text-white mb-4">Top result</h2>
      {track.album.images[0] && (
        <img
          src={track.album.images[0].url}
          alt={track.name}
          className="w-24 h-24 rounded object-cover shadow-lg mb-4"
        />
      )}
      <h3 className="text-2xl font-bold text-white mb-1 hover:underline truncate">
        {track.name}
      </h3>
      <div className="flex items-center gap-2 text-sm text-[#b3b3b3]">
        <span className="font-semibold text-white hover:underline">
          {track.artists.map((a) => a.name).join(', ')}
        </span>
        <span>•</span>
        <span className="bg-[#121212] px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-white">
          Song
        </span>
      </div>

      {/* Action Buttons in Bottom Right */}
      <div className="absolute bottom-5 right-5 flex items-center gap-3">
        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track);
          }}
          title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          className={`p-2 rounded-full transition-all hover:scale-110 ${
            liked
              ? 'text-[#1db954]'
              : 'opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white bg-[#121212]/80'
          }`}
        >
          {liked ? <Heart size={20} className="fill-[#1db954]" /> : <Heart size={20} />}
        </button>

        {/* Add to Playlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((prev) => !prev);
          }}
          title="Add to playlist"
          className="p-2 rounded-full text-[#b3b3b3] hover:text-white bg-[#121212]/80 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"
        >
          <ListPlus size={20} />
        </button>

        {/* Green Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="w-12 h-12 bg-[#1db954] hover:scale-105 hover:bg-[#1ed760] rounded-full flex items-center justify-center text-black shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin text-black" />
          ) : isActive && isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Add to Playlist Popover */}
      {showMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-5 bottom-20 w-60 bg-[#282828] border border-[#3e3e3e] rounded-lg shadow-2xl p-2 text-xs text-left z-50 text-white select-none"
        >
          <div className="px-2 py-1 font-bold text-[#b3b3b3] border-b border-[#3e3e3e] mb-1.5 flex items-center justify-between">
            <span>Add to playlist</span>
            {toastMsg && <span className="text-[#1db954] font-semibold">{toastMsg}</span>}
          </div>

          {/* Toggle Liked Songs */}
          <button
            onClick={() => {
              toggleLike(track);
              setToastMsg(liked ? 'Removed from Liked' : 'Saved to Liked Songs');
              setTimeout(() => setToastMsg(null), 1200);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded hover:bg-[#383838] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Heart size={14} className={liked ? 'text-[#1db954] fill-[#1db954]' : 'text-white'} />
              <span>Liked Songs</span>
            </div>
            {liked && <Check size={14} className="text-[#1db954]" />}
          </button>

          {/* Custom Playlists list */}
          {customPlaylists.length > 0 && (
            <div className="my-1 border-t border-[#383838] pt-1 max-h-36 overflow-y-auto">
              {customPlaylists.map((pl) => {
                const alreadyIn = pl.tracks.some((t) => t.id === track.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#383838] transition-colors"
                  >
                    <span className="truncate max-w-[170px]">{pl.name}</span>
                    {alreadyIn ? (
                      <Check size={14} className="text-[#1db954]" />
                    ) : (
                      <Plus size={14} className="text-[#b3b3b3]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Create New Playlist option */}
          <div className="border-t border-[#383838] pt-1 mt-1">
            <button
              onClick={handleCreateAndAdd}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#383838] text-[#1db954] font-medium transition-colors"
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
