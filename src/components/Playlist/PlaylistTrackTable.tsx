import React, { useState } from 'react';
import { Track, ColumnType } from '../../types/spotify';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { useLibrary } from '../../context/LibraryContext';
import { DownloadButton } from '../Common/DownloadButton';
import { Play, Pause, Clock, Music, Loader2, Heart, ListPlus, Check, Plus, Trash2 } from 'lucide-react';

interface PlaylistTrackTableProps {
  tracks: Track[];
  columns?: ColumnType[];
  onRemoveTrack?: (trackId: string) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const PlaylistTrackTable: React.FC<PlaylistTrackTableProps> = ({
  tracks,
  columns = [
    ColumnType.INDEX,
    ColumnType.TITLE_AND_ARTIST,
    ColumnType.ALBUM,
    ColumnType.ADDED_AT,
    ColumnType.DURATION,
  ],
  onRemoveTrack,
}) => {
  return (
    <div className="w-full text-sm text-[#b3b3b3] select-none">
      {/* Table Header */}
      <div className="grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_minmax(140px,1fr)] gap-3 md:gap-4 px-2 sm:px-4 py-2 border-b border-[#282828] text-xs uppercase font-medium tracking-wider">
        <div className="text-right">#</div>
        <div>Title</div>
        <div className="hidden md:block">Album</div>
        <div className="hidden md:block">Date Added</div>
        <div className="text-right flex justify-end items-center pr-2 md:pr-4">
          <Clock size={16} />
        </div>
      </div>

      {/* Table Body */}
      <div className="pt-2">
        {tracks.length === 0 ? (
          <div className="text-center py-12 text-[#757575] text-sm">
            No tracks in this playlist yet. Add songs from search!
          </div>
        ) : (
          tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              tracks={tracks}
              onRemoveTrack={onRemoveTrack}
            />
          ))
        )}
      </div>
    </div>
  );
};

const TrackRow: React.FC<{
  track: Track;
  index: number;
  tracks?: Track[];
  onRemoveTrack?: (trackId: string) => void;
}> = ({ track, index, tracks, onRemoveTrack }) => {
  const { isActive, isPlaying, isLoading, togglePlay } = usePlayContextItem({ uri: track.uri, track, queue: tracks });
  const { isLiked, toggleLike, customPlaylists, addTrackToPlaylist, createPlaylist } = useLibrary();
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
      onDoubleClick={() => togglePlay()}
      className={`group grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_minmax(140px,1fr)] gap-3 md:gap-4 px-2 sm:px-4 py-2 sm:py-2.5 rounded-md items-center transition-colors duration-150 hover:bg-[#ffffff1a] cursor-pointer relative ${
        isActive ? 'text-[#1db954]' : 'text-[#ffffff]'
      }`}
    >
      {/* Col 0: Index / Play Button */}
      <div className="text-right text-[#b3b3b3] font-normal flex items-center justify-end">
        <span className="group-hover:hidden">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-[#1db954]" />
          ) : isActive && isPlaying ? (
            <Music size={14} className="text-[#1db954] animate-pulse" />
          ) : (
            index + 1
          )}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="hidden group-hover:flex items-center justify-center text-white hover:scale-110 transition-transform"
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-[#1db954]" />
          ) : isActive && isPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
        </button>
      </div>

      {/* Col 1: Title and Artist */}
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
        {track.album.images[0] && (
          <img
            src={track.album.images[0].url}
            alt={track.name}
            className="w-10 h-10 rounded object-cover shadow-sm flex-shrink-0"
          />
        )}
        <div className="flex flex-col truncate">
          <span className={`font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
            {track.name}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-[#b3b3b3] truncate">
            {track.isExplicit && (
              <span className="bg-[#b3b3b3] text-[#121212] px-1 py-0.5 rounded-[2px] text-[10px] font-bold leading-none">
                E
              </span>
            )}
            <span className="truncate hover:underline hover:text-white">
              {track.artists.map((a) => a.name).join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* Col 2: Album (Hidden on mobile) */}
      <div className="hidden md:block text-xs text-[#b3b3b3] truncate hover:underline hover:text-white">
        {track.album.name}
      </div>

      {/* Col 3: Added At (Hidden on mobile) */}
      <div className="hidden md:block text-xs text-[#b3b3b3] truncate">
        {track.addedAt || '3 days ago'}
      </div>

      {/* Col 4: Duration & Actions */}
      <div className="flex items-center justify-end gap-2.5 sm:gap-3 text-right text-xs text-[#b3b3b3] pr-2 md:pr-4 relative">
        {/* Download Button */}
        <div className="transition-opacity">
          <DownloadButton track={track} size={16} />
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track);
          }}
          title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          className={`transition-all hover:scale-110 p-1 ${
            liked ? 'text-[#1db954]' : 'text-[#b3b3b3] md:opacity-0 md:group-hover:opacity-100 hover:text-white'
          }`}
        >
          {liked ? <Heart size={16} className="fill-[#1db954]" /> : <Heart size={16} />}
        </button>

        {/* Add to Custom Playlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((prev) => !prev);
          }}
          title="Add to playlist"
          className="text-[#b3b3b3] md:opacity-0 md:group-hover:opacity-100 hover:text-white hover:scale-110 transition-all p-1"
        >
          <ListPlus size={16} />
        </button>

        {/* Optional Remove from playlist action (if inside custom playlist) */}
        {onRemoveTrack && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveTrack(track.id);
            }}
            title="Remove from this playlist"
            className="text-[#b3b3b3] md:opacity-0 md:group-hover:opacity-100 hover:text-red-400 hover:scale-110 transition-all p-1"
          >
            <Trash2 size={15} />
          </button>
        )}

        {/* Duration */}
        <span className="w-9 sm:w-10 text-right font-mono text-[11px] sm:text-xs">{formatDuration(track.duration.milliseconds)}</span>

        {/* Add to Playlist Popover */}
        {showMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-9 w-60 bg-[#282828] border border-[#3e3e3e] rounded-lg shadow-2xl p-2 text-xs text-left z-50 text-white select-none"
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
    </div>
  );
};
