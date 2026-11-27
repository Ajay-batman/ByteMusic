import React, { useState, useRef, useCallback } from 'react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { Playlist, Track } from '../../types/spotify';
import {
  ChevronLeft,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  MoreVertical,
  ChevronDown,
  Sparkles,
  Smartphone,
  Eye,
  Sliders,
  Check,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface CosmicUltravioletShowcaseProps {
  onSelectPlaylist?: (playlist: Playlist) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const WAVEFORM_HEIGHTS = [
  10, 14, 20, 14, 24, 34, 20, 14, 28, 40, 32, 18, 22, 32, 44, 28, 18, 14, 22, 36,
  42, 26, 18, 30, 38, 24, 16, 26, 40, 34, 18, 24, 34, 18, 14, 10, 18, 28, 20, 12
];

/**
 * Screen 1 Audio Waveform Visualizer Scrubber
 */
const PhoneWaveformScrubber: React.FC = React.memo(() => {
  const { progressMs, durationMs } = usePlaybackProgress();
  const { seek } = usePlayback();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  const currentPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;
  const activePercent = isDragging && dragPercent !== null ? dragPercent : currentPercent;

  const calculatePercent = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    return Math.min(Math.max(raw, 0), 100);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const pct = calculatePercent(e.clientX);
    setDragPercent(pct);
    seek((pct / 100) * (durationMs || 1));
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const pct = calculatePercent(e.clientX);
    setDragPercent(pct);
    seek((pct / 100) * (durationMs || 1));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragPercent(null);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const totalBars = WAVEFORM_HEIGHTS.length;

  return (
    <div className="w-full flex flex-col gap-1.5 select-none touch-none px-1">
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-12 flex items-center justify-between gap-[2.5px] cursor-pointer py-1 relative group"
        title="Click or drag to seek"
      >
        {WAVEFORM_HEIGHTS.map((height, i) => {
          const barPercent = (i / (totalBars - 1)) * 100;
          const isPlayed = barPercent <= activePercent;

          return (
            <div
              key={i}
              style={{ height: `${height}px` }}
              className={`flex-1 min-w-[2px] max-w-[5px] rounded-full transition-all duration-75 ${
                isPlayed
                  ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] scale-y-105'
                  : 'bg-white/25 group-hover:bg-white/40'
              }`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] font-semibold text-white/70 px-1 font-sans">
        <span>{formatDuration(progressMs)}</span>
        <span>{formatDuration(durationMs)}</span>
      </div>
    </div>
  );
});

export const CosmicUltravioletShowcase: React.FC<CosmicUltravioletShowcaseProps> = () => {
  const { currentTrack, isPlaying, isLoading, isShuffle, repeatMode, togglePlay, toggleShuffle, toggleRepeat, nextTrack, prevTrack, playTrack } = usePlayback();
  const { isLiked, toggleLike, allPlaylists } = useLibrary();
  const [activeFilter, setActiveFilter] = useState<'Suggested' | 'Folders' | 'Downloads' | 'New'>('Suggested');
  const [activeTab, setActiveTab] = useState<'all' | 'now-playing' | 'my-music' | 'favourites'>('all');

  const [followed, setFollowed] = useState<Record<string, boolean>>({
    'taylor-swift': true,
    'billie-eilish': false,
    'ariana-grande': false,
    'post-malone': true,
    'kanye-west': false,
  });

  const toggleFollow = (id: string) => {
    setFollowed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const liked = currentTrack ? isLiked(currentTrack.id) : false;

  // Exact mock items from the reference image
  const recentTracks = [
    {
      id: 'recent-1',
      title: 'Moonlight Echo',
      artist: 'Astra',
      duration: '4:27',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop',
    },
    {
      id: 'recent-2',
      title: 'Lost in Waves',
      artist: 'Velu',
      duration: '4:39',
      image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop',
    },
    {
      id: 'recent-3',
      title: 'Silent Dreams',
      artist: 'Novi',
      duration: '3:21',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    },
  ];

  const artists = [
    {
      id: 'taylor-swift',
      name: 'Taylor Swift',
      followers: '27M Followers',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    },
    {
      id: 'billie-eilish',
      name: 'Billie Eilish',
      followers: '15M Followers',
      image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
    },
    {
      id: 'ariana-grande',
      name: 'Ariana Grande',
      followers: '22M Followers',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    },
    {
      id: 'post-malone',
      name: 'Post Malone',
      followers: '19M Followers',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    },
    {
      id: 'kanye-west',
      name: 'Kanye West',
      followers: '21M Followers',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    },
  ];

  const favouriteTracks = [
    {
      id: 'fav-1',
      title: 'Silent Dreams',
      artist: 'Novi',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    },
    {
      id: 'fav-2',
      title: 'Golden Hour',
      artist: 'Luxe',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop',
    },
    {
      id: 'fav-3',
      title: 'Falling Skies',
      artist: 'Mira',
      image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&h=300&fit=crop',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none flex flex-col items-center">
      {/* Studio Header & View Switcher */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 select-none">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d946ef] shadow-[0_0_10px_#d946ef] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#f0abfc]">
              Cosmic Ultraviolet Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            1:1 Mobile Reference Showcase
          </h1>
        </div>

        {/* View Mode Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#16102e]/80 border border-white/10 backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]'
                : 'text-[#a5a6c2] hover:text-white'
            }`}
          >
            <Smartphone size={13} />
            <span>3-Device Showcase</span>
          </button>
          <button
            onClick={() => setActiveTab('now-playing')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'now-playing'
                ? 'bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]'
                : 'text-[#a5a6c2] hover:text-white'
            }`}
          >
            Now Playing
          </button>
          <button
            onClick={() => setActiveTab('my-music')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'my-music'
                ? 'bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]'
                : 'text-[#a5a6c2] hover:text-white'
            }`}
          >
            My Music
          </button>
          <button
            onClick={() => setActiveTab('favourites')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'favourites'
                ? 'bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]'
                : 'text-[#a5a6c2] hover:text-white'
            }`}
          >
            My Favourite Songs
          </button>
        </div>
      </div>

      {/* Main Container: 3 Phones Mockup */}
      <div className="w-full max-w-6xl flex items-center justify-center gap-6 lg:gap-8 flex-wrap py-2">
        {/* ========================================================= */}
        {/* PHONE 1: NOW PLAYING                                      */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'now-playing') && (
          <div className="w-[335px] sm:w-[350px] h-[720px] rounded-[48px] p-3.5 bg-black/60 border-[5px] border-[#221c3d] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(168,85,247,0.25)] flex flex-col relative select-none overflow-hidden transition-all hover:border-[#382b64]">
            {/* Inner Phone Screen */}
            <div className="w-full h-full rounded-[38px] p-5 flex flex-col justify-between relative overflow-hidden cosmic-now-playing-bg text-white">
              {/* Dynamic Island / Status Bar */}
              <div className="flex items-center justify-between text-xs text-white/90 pt-1 px-2 z-20">
                <span className="font-semibold text-[13px]">9:41</span>
                <div className="w-24 h-6 rounded-full bg-black flex items-center justify-center -mt-1 shadow-md">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a2e] ml-auto mr-3 border border-white/10" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>5G</span>
                  <div className="w-5 h-2.5 rounded-[4px] border border-white/80 p-0.5 flex items-center">
                    <div className="h-full w-full bg-white rounded-[2px]" />
                  </div>
                </div>
              </div>

              {/* Top Navigation */}
              <div className="flex items-center justify-between pt-3 relative z-10">
                <button
                  className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white"
                  title="Back"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-bold text-white tracking-tight font-sans">
                  Now Playing
                </span>
                <button
                  onClick={() => currentTrack && toggleLike(currentTrack)}
                  className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white"
                  title="Favourite"
                >
                  <Heart size={18} className={liked ? 'text-[#d946ef] fill-[#d946ef]' : 'text-white'} />
                </button>
              </div>

              {/* Center: Circular Vinyl Guitarist Disc */}
              <div className="flex items-center justify-center my-auto py-2 relative z-10">
                <div className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-[#d946ef]/35 via-[#a855f7]/40 to-[#6366f1]/25 blur-3xl pointer-events-none" />

                <div className="relative group">
                  <img
                    src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=450&h=450&fit=crop"
                    alt="Midnight Vibes - Fire in Motion"
                    className="w-56 h-56 rounded-full object-cover shadow-[0_0_40px_rgba(168,85,247,0.5),0_20px_50px_rgba(0,0,0,0.85)] border-2 border-white/25 ring-1 ring-white/10"
                  />
                </div>
              </div>

              {/* Track Title & Artist */}
              <div className="flex flex-col items-center text-center my-1 z-10">
                <h2 className="text-2xl font-black text-white tracking-tight font-sans drop-shadow-md">
                  {currentTrack?.name || 'Midnight Vibes'}
                </h2>
                <span className="text-xs font-semibold text-[#c4b5fd] mt-0.5 font-sans">
                  {currentTrack?.artists[0]?.name || 'Fire in Motion'}
                </span>
              </div>

              {/* Waveform Scrubber */}
              <div className="z-10">
                <PhoneWaveformScrubber />
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between px-2 pt-1 pb-2 z-10">
                <button
                  onClick={toggleShuffle}
                  className={`p-1.5 transition-all ${
                    isShuffle ? 'text-[#d946ef] drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]' : 'text-white/60 hover:text-white'
                  }`}
                  title="Shuffle"
                >
                  <Shuffle size={19} />
                </button>

                <button
                  onClick={prevTrack}
                  className="p-1.5 text-white hover:opacity-80 active:scale-95 transition-all"
                  title="Previous"
                >
                  <SkipBack size={24} fill="currentColor" />
                </button>

                {/* Master Play/Pause: Circular Light Frosted Glass Disc */}
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full flex items-center justify-center light-glass-disc text-white shadow-[0_0_24px_rgba(168,85,247,0.4)] active:scale-95 transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isLoading ? (
                    <Loader2 size={24} className="animate-spin text-white" />
                  ) : isPlaying ? (
                    <Pause size={24} fill="currentColor" />
                  ) : (
                    <Play size={24} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  className="p-1.5 text-white hover:opacity-80 active:scale-95 transition-all"
                  title="Next"
                >
                  <SkipForward size={24} fill="currentColor" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className={`p-1.5 transition-all ${
                    repeatMode !== 'off'
                      ? 'text-[#d946ef] drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Queue"
                >
                  <ListMusic size={19} />
                </button>
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-32 h-1 rounded-full bg-white/40 mx-auto -mb-1 z-20" />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHONE 2: MY MUSIC                                         */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'my-music') && (
          <div className="w-[335px] sm:w-[350px] h-[720px] rounded-[48px] p-3.5 bg-black/60 border-[5px] border-[#221c3d] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(168,85,247,0.25)] flex flex-col relative select-none overflow-hidden transition-all hover:border-[#382b64]">
            {/* Inner Phone Screen */}
            <div className="w-full h-full rounded-[38px] p-5 flex flex-col justify-between relative overflow-hidden bg-[#0a0718] text-white">
              {/* Dynamic Island / Status Bar */}
              <div className="flex items-center justify-between text-xs text-white/90 pt-1 px-2 z-20">
                <span className="font-semibold text-[13px]">9:41</span>
                <div className="w-24 h-6 rounded-full bg-black flex items-center justify-center -mt-1 shadow-md">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a2e] ml-auto mr-3 border border-white/10" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>5G</span>
                  <div className="w-5 h-2.5 rounded-[4px] border border-white/80 p-0.5 flex items-center">
                    <div className="h-full w-full bg-white rounded-[2px]" />
                  </div>
                </div>
              </div>

              {/* Top Navigation */}
              <div className="flex items-center justify-between pt-3 relative z-10">
                <button
                  className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white"
                  title="Back"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-bold text-white tracking-tight font-sans">
                  My Music
                </span>
                <button
                  className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white"
                  title="Favourites"
                >
                  <Heart size={18} />
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 pt-3 pb-1 overflow-x-auto scrollbar-none z-10">
                {(['Suggested', 'Folders', 'Downloads', 'New'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      activeFilter === cat
                        ? 'bg-gradient-to-r from-[#d946ef] to-[#a855f7] text-white shadow-[0_0_18px_rgba(217,70,239,0.5)] scale-105'
                        : 'bg-white/10 text-[#a5a6c2] hover:text-white border border-white/15'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Section 1: Recently Played */}
              <div className="flex flex-col gap-2 pt-2 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white tracking-tight font-sans">
                    Recently Played
                  </h3>
                  <span className="text-[11px] font-semibold text-[#a5a6c2] hover:text-white cursor-pointer">
                    See all
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {recentTracks.map((item) => (
                    <div
                      key={item.id}
                      onClick={togglePlay}
                      className="group flex items-center justify-between p-2 rounded-2xl bg-[#141029]/70 hover:bg-[#1d163d]/90 border border-white/10 hover:border-[#d946ef]/40 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-11 h-11 rounded-xl object-cover shadow-sm bg-[#18122c]"
                        />
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#d946ef] transition-colors">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-[#a5a6c2] truncate">
                            {item.artist}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-[#a5a6c2] font-mono">
                          {item.duration}
                        </span>
                        <button className="w-8 h-8 rounded-full light-glass-disc flex items-center justify-center text-white group-hover:bg-[#d946ef] transition-all">
                          <Play size={12} fill="currentColor" className="ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Artist */}
              <div className="flex flex-col gap-2 pt-1 z-10 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white tracking-tight font-sans">
                    Artist
                  </h3>
                  <span className="text-[11px] font-semibold text-[#a5a6c2] hover:text-white cursor-pointer">
                    See all
                  </span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto scrollbar-none pr-0.5">
                  {artists.slice(0, 4).map((artist) => {
                    const isF = !!followed[artist.id];
                    return (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={artist.image}
                            alt={artist.name}
                            className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-sm"
                          />
                          <div className="truncate">
                            <h4 className="text-xs font-bold text-white truncate">
                              {artist.name}
                            </h4>
                            <span className="text-[10px] text-[#a5a6c2]">
                              {artist.followers}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleFollow(artist.id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                            isF
                              ? 'bg-[#d946ef]/25 border border-[#d946ef] text-[#f0abfc]'
                              : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                          }`}
                        >
                          {isF ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-32 h-1 rounded-full bg-white/40 mx-auto -mb-1 z-20" />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHONE 3: MY FAVOURITE SONGS                               */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'favourites') && (
          <div className="w-[335px] sm:w-[350px] h-[720px] rounded-[48px] p-3.5 bg-black/60 border-[5px] border-[#221c3d] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(168,85,247,0.25)] flex flex-col relative select-none overflow-hidden transition-all hover:border-[#382b64]">
            {/* Inner Phone Screen */}
            <div className="w-full h-full rounded-[38px] p-5 flex flex-col justify-between relative overflow-hidden bg-[#0c081e] text-white">
              {/* Dynamic Island / Status Bar */}
              <div className="flex items-center justify-between text-xs text-white/90 pt-1 px-2 z-20">
                <span className="font-semibold text-[13px]">9:41</span>
                <div className="w-24 h-6 rounded-full bg-black flex items-center justify-center -mt-1 shadow-md">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a2e] ml-auto mr-3 border border-white/10" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>5G</span>
                  <div className="w-5 h-2.5 rounded-[4px] border border-white/80 p-0.5 flex items-center">
                    <div className="h-full w-full bg-white rounded-[2px]" />
                  </div>
                </div>
              </div>

              {/* Top Navigation */}
              <div className="flex items-center justify-between pt-3 relative z-10">
                <button
                  className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white"
                  title="Back"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white"
                  title="Favourites"
                >
                  <Heart size={18} className="text-[#d946ef] fill-[#d946ef]" />
                </button>
              </div>

              {/* Center Circular Artwork: Girl with Headphones & Soundwaves */}
              <div className="flex items-center justify-center my-2 relative z-10">
                <div className="absolute w-44 h-44 rounded-full bg-[#a855f7]/30 blur-3xl pointer-events-none" />
                <div className="relative group">
                  <img
                    src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop"
                    alt="My Favourite Songs"
                    className="w-44 h-44 rounded-full object-cover shadow-[0_0_35px_rgba(168,85,247,0.45)] border-2 border-white/25 ring-1 ring-white/10"
                  />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="flex flex-col items-center text-center z-10 mb-2">
                <h2 className="text-xl font-black text-white tracking-tight font-sans">
                  My Favourite Songs
                </h2>
                <span className="text-[11px] font-semibold text-[#a5a6c2] mt-0.5">
                  170 Songs / 10:21:56 mins
                </span>
              </div>

              {/* Dual Action Buttons: [ Shuffle ] & [ Play ] */}
              <div className="flex items-center justify-center gap-3 z-10 mb-3">
                <button
                  onClick={toggleShuffle}
                  className="flex-1 py-2 px-4 rounded-full bg-gradient-to-r from-[#d946ef] to-[#a855f7] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(217,70,239,0.5)] active:scale-95 transition-all"
                >
                  <Shuffle size={14} />
                  <span>Shuffle</span>
                </button>

                <button
                  onClick={togglePlay}
                  className="flex-1 py-2 px-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-[#d946ef] flex items-center justify-center text-white shadow-sm">
                    <Play size={10} fill="currentColor" className="ml-0.5" />
                  </div>
                  <span>Play</span>
                </button>
              </div>

              {/* List Header: 170 favourites & Date Added ▽ */}
              <div className="flex items-center justify-between text-xs font-semibold text-[#a5a6c2] border-t border-white/10 pt-2 pb-1 z-10">
                <span>170 favourites</span>
                <button className="flex items-center gap-1 hover:text-white transition-colors">
                  <span>Date Added</span>
                  <ChevronDown size={13} />
                </button>
              </div>

              {/* Track List */}
              <div className="flex flex-col gap-2 z-10 pb-2 flex-1 overflow-y-auto scrollbar-none">
                {favouriteTracks.map((item) => (
                  <div
                    key={item.id}
                    onClick={togglePlay}
                    className="group flex items-center justify-between p-2 rounded-2xl bg-[#141029]/70 hover:bg-[#1d163d]/90 border border-white/10 hover:border-[#d946ef]/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-10 h-10 rounded-xl object-cover shadow-sm bg-[#18122c]"
                      />
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-[#d946ef] transition-colors">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-[#a5a6c2] truncate">
                          {item.artist}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button className="w-8 h-8 rounded-full light-glass-disc flex items-center justify-center text-white group-hover:bg-[#d946ef] transition-all">
                        <Play size={12} fill="currentColor" className="ml-0.5" />
                      </button>
                      <button className="p-1 text-white/50 hover:text-white transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-32 h-1 rounded-full bg-white/40 mx-auto -mb-1 z-20" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
