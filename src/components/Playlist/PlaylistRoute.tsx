import React from 'react';
import { Playlist } from '../../types/spotify';
import { PlaylistTrackTable } from './PlaylistTrackTable';
import { Play, Pause, Heart, Trash2, Clock, Music, ArrowLeft, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { useLibrary } from '../../context/LibraryContext';
import { useDownload } from '../../context/DownloadContext';

interface PlaylistRouteProps {
  playlist: Playlist;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onBack?: () => void;
}

export const PlaylistRoute: React.FC<PlaylistRouteProps> = ({ playlist, onSelectPlaylist, onBack }) => {
  const { removeTrackFromPlaylist, deletePlaylist, clearRecentlyPlayed, allPlaylists } = useLibrary();
  const { downloadPlaylist, isDownloaded } = useDownload();
  const isAllDownloaded = playlist.tracks.length > 0 && playlist.tracks.every((t) => isDownloaded(t.id));
  const firstTrack = playlist.tracks[0];
  const { isActive, isPlaying, togglePlay } = usePlayContextItem({
    uri: firstTrack?.uri || playlist.uri,
    queue: playlist.tracks,
  });

  const isFavorites = playlist.id === 'playlist-favorites';
  const isRecentlyPlayed = playlist.id === 'playlist-recently-played';
  const isCustom = playlist.id.startsWith('custom-playlist-');

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
    <div className="flex-1 overflow-y-auto">
      {/* Mobile Back Header */}
      {onBack && (
        <div className="md:hidden flex items-center p-3 pb-0 select-none">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full"
          >
            <ArrowLeft size={16} />
            <span>Library</span>
          </button>
        </div>
      )}

      {/* Playlist Hero Header */}
      <div
        className={`p-4 sm:p-6 pb-4 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 select-none bg-gradient-to-b ${
          isFavorites
            ? 'from-[#450af5] via-[#20058a] to-[#121212]'
            : isRecentlyPlayed
            ? 'from-[#059669] via-[#024a34] to-[#121212]'
            : isCustom
            ? 'from-[#6b21a8] via-[#3b0764] to-[#121212]'
            : 'from-[#535353] to-[#121212]'
        }`}
      >
        {isFavorites ? (
          <div className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center flex-shrink-0 shadow-2xl">
            <Heart size={64} className="text-white fill-white" />
          </div>
        ) : isRecentlyPlayed ? (
          <div className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded bg-gradient-to-br from-[#059669] to-[#10b981] flex items-center justify-center flex-shrink-0 shadow-2xl">
            <Clock size={64} className="text-white" />
          </div>
        ) : playlist.images[0] ? (
          <img
            src={playlist.images[0].url}
            alt={playlist.name}
            decoding="async"
            width={224}
            height={224}
            className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded shadow-2xl object-cover flex-shrink-0 bg-[#282828]"
          />
        ) : (
          <div className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded bg-[#282828] flex items-center justify-center flex-shrink-0 shadow-2xl">
            <Music size={64} className="text-[#757575]" />
          </div>
        )}

        <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0 items-center sm:items-start text-center sm:text-left">
          <span className="text-xs uppercase font-bold text-white tracking-wider">
            {isFavorites
              ? 'Saved Collection'
              : isRecentlyPlayed
              ? 'Playback Tracker'
              : isCustom
              ? 'Personal Playlist'
              : 'Public Playlist'}
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight truncate max-w-full">
            {playlist.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#b3b3b3] line-clamp-2 mt-1">
            {playlist.description}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-white mt-1">
            <span className="font-bold hover:underline cursor-pointer">
              {playlist.owner.displayName}
            </span>
            <span>•</span>
            <span>{playlist.tracks.length} songs,</span>
            <span className="text-[#b3b3b3]">about {totalMinutes} min</span>
          </div>
        </div>
      </div>

      {/* Playlist Action Bar */}
      <div className="p-6 pt-4 flex items-center gap-6">
        <button
          onClick={() => togglePlay()}
          disabled={playlist.tracks.length === 0}
          className="w-14 h-14 rounded-full bg-[#1db954] hover:scale-105 hover:bg-[#1ed760] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center text-black shadow-lg"
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
            className={`transition-all hover:scale-105 p-1 flex items-center gap-1.5 ${
              isAllDownloaded ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            {isAllDownloaded ? <CheckCircle2 size={28} className="fill-[#1db954]/20" /> : <ArrowDownCircle size={28} />}
          </button>
        )}

        {isFavorites && (
          <button className="text-[#1db954] hover:scale-105 transition-transform">
            <Heart size={32} className="fill-[#1db954]" />
          </button>
        )}

        {isRecentlyPlayed && playlist.tracks.length > 0 && (
          <button
            onClick={() => clearRecentlyPlayed()}
            title="Clear listening history"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3e3e3e] text-xs font-medium text-[#b3b3b3] hover:text-white hover:border-white transition-colors"
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        )}

        {isCustom && (
          <button
            onClick={handleDeletePlaylist}
            title="Delete this playlist"
            className="text-[#b3b3b3] hover:text-red-400 hover:scale-110 transition-all p-1"
          >
            <Trash2 size={24} />
          </button>
        )}
      </div>

      {/* Tracks Table */}
      <div className="px-6 pb-12">
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
