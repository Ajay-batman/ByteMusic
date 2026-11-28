import React, { useState } from 'react';
import { Track, ColumnType } from '../../types/spotify';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { isFrost, isVelvetStyle, isLiquidGlass } = useTheme();
  const isSpatialGlass = isVelvetStyle || isLiquidGlass;

  return (
    <div className={`w-full text-sm select-none ${isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'}`}>
      {/* Table Header */}
      <div
        className={`grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_minmax(140px,1fr)] gap-3 md:gap-4 px-2 sm:px-4 py-2 border-b text-xs uppercase font-medium tracking-wider ${
          isFrost
            ? 'border-slate-200 text-slate-500'
            : isSpatialGlass
            ? 'border-white/15 text-white/60'
            : 'border-[#282828] text-[#b3b3b3]'
        }`}
      >
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
  const { isFrost, isAurora, isSunset, isUltraviolet, isVelvetLime, isVelvetStyle, isLiquidGlass } = useTheme();
  const isSpatialGlass = isVelvetStyle || isLiquidGlass;
  const [showMenu, setShowMenu] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const liked = isLiked(track.id);
  const accentTextClass = isFrost
    ? 'text-sky-600 font-bold'
    : isAurora
    ? 'text-emerald-400 font-bold'
    : isSunset
    ? 'text-rose-400 font-bold'
    : isUltraviolet
    ? 'text-[#d946ef]'
    : isVelvetLime
    ? 'text-[#D2F843]'
    : 'text-[#1db954]';

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
      style={
        isSpatialGlass
          ? {
              boxShadow: isFrost
                ? 'inset 0 1px 1px rgba(255,255,255,0.9), 0 4px 12px -4px rgba(15,23,42,0.06)'
                : 'inset 0 1px 1px rgba(255,255,255,0.22), 0 6px 16px -6px rgba(0,0,0,0.3)',
            }
          : undefined
      }
      className={`group grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_minmax(140px,1fr)] gap-3 md:gap-4 px-2.5 sm:px-4 py-2.5 items-center transition-all duration-150 cursor-pointer relative ${
        isSpatialGlass
          ? `mb-1.5 rounded-2xl border ${
              isFrost
                ? 'border-slate-200/80 bg-white/65 hover:bg-white/95 hover:border-slate-300'
                : isAurora
                ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-emerald-400/35'
                : isSunset
                ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-rose-400/35'
                : isVelvetLime
                ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-[#D2F843]/40'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-white/30'
            }`
          : `rounded-xl ${isFrost ? 'hover:bg-slate-900/5' : 'hover:bg-[#ffffff1a]'}`
      } ${
        isActive ? accentTextClass : isFrost ? 'text-slate-900' : 'text-[#ffffff]'
      }`}
    >
      {/* Col 0: Index / Play Button */}
      <div className={`text-right font-normal flex items-center justify-end ${isFrost ? 'text-slate-400' : 'text-[#b3b3b3]'}`}>
        <span className="group-hover:hidden">
          {isLoading ? (
            <Loader2 size={14} className={`animate-spin ${accentTextClass}`} />
          ) : isActive && isPlaying ? (
            <Music size={14} className={`${accentTextClass} animate-pulse`} />
          ) : (
            index + 1
          )}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className={`hidden group-hover:flex items-center justify-center hover:scale-110 transition-transform ${
            isFrost ? 'text-slate-900' : 'text-white'
          }`}
        >
          {isLoading ? (
            <Loader2 size={14} className={`animate-spin ${accentTextClass}`} />
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
            loading="lazy"
            decoding="async"
            width={40}
            height={40}
            className={`w-10 h-10 rounded-lg object-cover shadow-sm flex-shrink-0 ${
              isFrost ? 'bg-slate-200 border border-slate-200' : 'bg-[#282828]'
            }`}
          />
        )}
        <div className="flex flex-col truncate">
          <span className={`font-semibold truncate ${isActive ? accentTextClass : isFrost ? 'text-slate-900' : 'text-white'}`}>
            {track.name}
          </span>
          <div className={`flex items-center gap-1.5 text-xs truncate ${isFrost ? 'text-slate-500' : 'text-[#b3b3b3]'}`}>
            {track.isExplicit && (
              <span className={`px-1 py-0.5 rounded-[2px] text-[10px] font-bold leading-none ${
                isFrost ? 'bg-slate-200 text-slate-800' : 'bg-[#b3b3b3] text-[#121212]'
              }`}>
                E
              </span>
            )}
            <span className={`truncate hover:underline ${isFrost ? 'hover:text-slate-900' : 'hover:text-white'}`}>
              {track.artists.map((a) => a.name).join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* Col 2: Album (Hidden on mobile) */}
      <div className={`hidden md:block text-xs truncate hover:underline ${isFrost ? 'text-slate-500 hover:text-slate-900' : 'text-[#b3b3b3] hover:text-white'}`}>
        {track.album.name}
      </div>

      {/* Col 3: Added At (Hidden on mobile) */}
      <div className={`hidden md:block text-xs truncate ${isFrost ? 'text-slate-400' : 'text-[#b3b3b3]'}`}>
        {track.addedAt || '3 days ago'}
      </div>

      {/* Col 4: Duration & Actions */}
      <div className={`flex items-center justify-end gap-2.5 sm:gap-3 text-right text-xs pr-2 md:pr-4 relative ${isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'}`}>
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
            style={{
              backdropFilter: 'blur(24px) saturate(190%)',
              WebkitBackdropFilter: 'blur(24px) saturate(190%)',
            }}
            className={`absolute right-0 top-9 w-60 rounded-2xl border shadow-2xl p-2 text-xs text-left z-50 select-none ${
              isFrost
                ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60'
                : 'bg-[#181824]/95 border-white/20 text-white'
            }`}
          >
            <div
              className={`px-2 py-1 font-bold border-b mb-1.5 flex items-center justify-between ${
                isFrost ? 'border-slate-200 text-slate-600' : 'border-[#3e3e3e] text-[#b3b3b3]'
              }`}
            >
              <span>Add to playlist</span>
              {toastMsg && (
                <span className={`font-semibold ${isFrost ? 'text-sky-600' : 'text-[#1db954]'}`}>
                  {toastMsg}
                </span>
              )}
            </div>

            {/* Toggle Liked Songs */}
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
                <Heart size={14} className={liked ? 'text-rose-500 fill-current' : 'text-current'} />
                <span>Liked Songs</span>
              </div>
              {liked && <Check size={14} className="text-rose-500" />}
            </button>

            {/* Custom Playlists list */}
            {customPlaylists.length > 0 && (
              <div className={`my-1 border-t pt-1 max-h-36 overflow-y-auto ${isFrost ? 'border-slate-200' : 'border-white/10'}`}>
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
                        <Check size={14} className={isFrost ? 'text-sky-600' : 'text-[#1db954]'} />
                      ) : (
                        <Plus size={14} className={isFrost ? 'text-slate-400' : 'text-[#b3b3b3]'} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Create New Playlist option */}
            <div className={`border-t pt-1 mt-1 ${isFrost ? 'border-slate-200' : 'border-white/10'}`}>
              <button
                onClick={handleCreateAndAdd}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  isFrost ? 'hover:bg-slate-100 text-sky-600' : 'hover:bg-white/10 text-[#1db954]'
                }`}
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
