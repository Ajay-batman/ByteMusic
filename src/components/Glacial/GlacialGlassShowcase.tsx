import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { Playlist, Track } from '../../types/spotify';
import { mockPlaylists, mockTracks } from '../../data/mockSpotifyCatalog';
import {
  Search,
  Sparkles,
  Music,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Plus,
  Check,
  ChevronDown,
  Palette,
  Smartphone,
  Layers,
  Volume2,
} from 'lucide-react';

interface GlacialGlassShowcaseProps {
  onSelectPlaylist?: (playlist: Playlist) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Interactive Radial Arc Progress Scrubber.
 * Geometry: Sweeps over an upper circular arc (165° to 15°).
 * Features glowing pearl bead playhead and interactive drag/click scrubbing.
 */
export const GlacialRadialArcScrubber: React.FC = React.memo(() => {
  const { progressMs, durationMs } = usePlaybackProgress();
  const { seek, currentTrack } = usePlayback();
  const { isLiked, toggleLike } = useLibrary();
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  const cx = 160;
  const cy = 145;
  const radius = 105;
  const startAngleDeg = 165;
  const endAngleDeg = 15;
  const totalAngleSpan = startAngleDeg - endAngleDeg; // 150 deg

  const effectiveProgressMs = isDragging && dragProgress !== null ? dragProgress : progressMs;
  const totalDuration = durationMs > 0 ? durationMs : (currentTrack?.duration.milliseconds || 178000);
  const progressRatio = Math.min(Math.max(effectiveProgressMs / totalDuration, 0), 1);

  // Math helper: deg to Cartesian
  const getCoords = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    };
  };

  const startCoord = getCoords(startAngleDeg);
  const endCoord = getCoords(endAngleDeg);

  const currentAngleDeg = startAngleDeg - progressRatio * totalAngleSpan;
  const activeCoord = getCoords(currentAngleDeg);

  const calculateRatioFromEvent = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 320 / rect.width;
    const scaleY = 160 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const dx = px - cx;
    const dy = cy - py; // inverted Y

    let angleRad = Math.atan2(dy, dx);
    let angleDeg = (angleRad * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    // Map angle into [endAngleDeg, startAngleDeg]
    const clampedAngle = Math.min(Math.max(angleDeg, endAngleDeg), startAngleDeg);
    const ratio = (startAngleDeg - clampedAngle) / totalAngleSpan;
    return Math.min(Math.max(ratio, 0), 1);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const ratio = calculateRatioFromEvent(e);
    const targetMs = ratio * totalDuration;
    setDragProgress(targetMs);
    seek(targetMs);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const ratio = calculateRatioFromEvent(e);
    const targetMs = ratio * totalDuration;
    setDragProgress(targetMs);
    seek(targetMs);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragProgress(null);
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const isCurrentLiked = currentTrack ? isLiked(currentTrack.id) : false;

  return (
    <div className="relative w-full flex flex-col items-center select-none touch-none py-1">
      <svg
        ref={svgRef}
        viewBox="0 0 320 160"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full max-w-[340px] h-36 cursor-pointer overflow-visible"
      >
        {/* Defs for gradients & glowing pearl drop shadow */}
        <defs>
          <filter id="pearlGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="glacialArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="1" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Inactive background track arc */}
        <path
          d={`M ${startCoord.x} ${startCoord.y} A ${radius} ${radius} 0 0 1 ${endCoord.x} ${endCoord.y}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Active progress arc */}
        {progressRatio > 0.005 && (
          <path
            d={`M ${startCoord.x} ${startCoord.y} A ${radius} ${radius} 0 0 1 ${activeCoord.x} ${activeCoord.y}`}
            fill="none"
            stroke="url(#glacialArcGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))',
            }}
          />
        )}

        {/* Luminous Pearl Thumb */}
        <g
          transform={`translate(${activeCoord.x}, ${activeCoord.y})`}
          className="transition-transform duration-75"
        >
          {/* Pearl outer glow halo */}
          <circle r="9" fill="rgba(255, 255, 255, 0.3)" />
          {/* Pearl core bead */}
          <circle
            r="6"
            fill="#ffffff"
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth="1.5"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
            }}
          />
        </g>
      </svg>

      {/* Center Heart and Time Readout directly inside the Arc */}
      <div className="absolute top-[52px] flex flex-col items-center justify-center pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentTrack) toggleLike(currentTrack);
          }}
          className="text-white/80 hover:text-white transition-all transform hover:scale-110 mb-1"
          title={isCurrentLiked ? 'Liked' : 'Like this track'}
        >
          <Heart
            size={18}
            className={isCurrentLiked ? 'text-[#f43f5e] fill-[#f43f5e]' : 'text-white/90'}
          />
        </button>
        <span className="text-sm font-semibold tracking-wider text-white font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
          {formatDuration(effectiveProgressMs)} / {formatDuration(totalDuration)}
        </span>
      </div>
    </div>
  );
});

export const GlacialGlassShowcase: React.FC<GlacialGlassShowcaseProps> = ({ onSelectPlaylist }) => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    playTrack,
    nextTrack,
    prevTrack,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
  } = usePlayback();
  const { allPlaylists, isLiked, toggleLike } = useLibrary();
  const { openThemeModal } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'both' | 'playlists' | 'player'>('both');

  // Featured Glacial Playlists matching screenshot Page 2
  const soulSootherPlaylist = allPlaylists.find((p) => p.name.includes('Soul Soother')) || allPlaylists[0];
  const aestheticVibesPlaylist = allPlaylists.find((p) => p.name.includes('Aesthetic Vibes')) || allPlaylists[1];
  const auraOfPeacePlaylist = allPlaylists.find((p) => p.name.includes('Aura of Peace')) || allPlaylists[2];

  // Specific tracks from the screenshot Page 3 carousel
  const hateMeTrack = mockTracks.find((t) => t.name.includes('HATE ME')) || mockTracks[0];
  const pray4LoveTrack = mockTracks.find((t) => t.name.includes('Pray 4 Love') || t.name.includes('Pray for Love')) || mockTracks[1];
  const vampireTrack = mockTracks.find((t) => t.name.includes('Vampire')) || mockTracks[2];

  const handlePlayCard = (playlist: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleTrackSelect = (track: Track) => {
    playTrack(track, [hateMeTrack, pray4LoveTrack, vampireTrack]);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden glacial-glass-bg text-slate-800">
      {/* Top Global Navigation Bar */}
      <header className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-white/30 backdrop-blur-md bg-white/20 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-300 flex items-center justify-center shadow-md">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
              Glacial Liquid Glass
            </h1>
            <p className="text-xs font-medium text-slate-600">
              Frosted ice specular depth & curved radial arc playback
            </p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="hidden lg:flex items-center p-1 rounded-full bg-white/40 border border-white/60 shadow-sm">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'both'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dual Phone Canvas
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'playlists'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Page 2: Playlists
          </button>
          <button
            onClick={() => setActiveTab('player')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'player'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Page 3: Now Playing
          </button>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={openThemeModal}
            title="Theme Selection Modal"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 shadow-md shadow-sky-500/20 transition-all"
          >
            <Palette size={14} />
            <span className="hidden sm:inline">Themes</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8 md:gap-12">
          {/* ========================================================= */}
          {/* PAGE 2 PHONE SCREEN: "Recommended Music Playlists"        */}
          {/* ========================================================= */}
          {(activeTab === 'both' || activeTab === 'playlists') && (
            <div className="w-full max-w-[380px] h-[740px] rounded-[48px] p-4 bg-gradient-to-b from-white/70 via-sky-100/50 to-white/70 border-[8px] border-white/80 shadow-[0_30px_70px_rgba(70,110,160,0.28)] flex flex-col justify-between relative overflow-hidden backdrop-blur-2xl">
              {/* Dynamic Island & Status Bar */}
              <div className="flex items-center justify-between px-4 pt-1 mb-2 z-10">
                <span className="text-xs font-bold text-slate-800">9:41</span>
                <div className="w-24 h-5 rounded-full bg-black/85 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2 border border-white/20" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Subtitle & Title */}
              <div className="px-4 pt-1 z-10">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Sparkles size={13} className="text-sky-500" />
                  <span>Recommended</span>
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Music Playlists
                  </h2>
                  <button
                    onClick={() => {
                      const input = prompt('Search music playlists:');
                      if (input) setSearchQuery(input);
                    }}
                    className="w-9 h-9 rounded-full glacial-circle-btn flex items-center justify-center text-slate-700 shadow-sm"
                    title="Search playlists"
                  >
                    <Search size={16} />
                  </button>
                </div>
              </div>

              {/* Cascade of 3D Floating Liquid Glass Cards */}
              <div className="flex-1 px-2 py-4 flex flex-col gap-3.5 overflow-y-auto no-scrollbar z-10">
                {/* CARD 1: Soul Soother */}
                <div
                  onClick={() => onSelectPlaylist?.(soulSootherPlaylist)}
                  className="group relative cursor-pointer rounded-3xl p-4 glacial-card flex items-center justify-between overflow-hidden"
                  style={{
                    transform: 'perspective(600px) rotateX(1deg)',
                  }}
                >
                  <div className="flex flex-col justify-center min-w-0 pr-3 z-10">
                    <span className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-sky-600 transition-colors">
                      Soul Soother
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                      Ambient Waves & Calm
                    </span>
                  </div>

                  {/* Artwork & Action Button */}
                  <div className="relative flex-shrink-0 w-28 h-20 rounded-2xl overflow-hidden shadow-md">
                    <img
                      src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=500&fit=crop"
                      alt="Soul Soother"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-sky-900/10 flex items-center justify-center">
                      <button
                        onClick={(e) => handlePlayCard(soulSootherPlaylist, e)}
                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-sky-600 hover:scale-110 active:scale-95 transition-all"
                        title="Play Soul Soother"
                      >
                        <Play size={18} fill="#0284c7" className="ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Aesthetic Vibes */}
                <div
                  onClick={() => onSelectPlaylist?.(aestheticVibesPlaylist)}
                  className="group relative cursor-pointer rounded-3xl p-4 glacial-card flex items-center justify-between overflow-hidden"
                  style={{
                    transform: 'perspective(600px) rotateX(1deg)',
                  }}
                >
                  <div className="flex flex-col justify-center min-w-0 pr-3 z-10">
                    <span className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-rose-600 transition-colors">
                      Aesthetic Vibes
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                      Sunset Blush & Chills
                    </span>
                  </div>

                  {/* Artwork & Action Button */}
                  <div className="relative flex-shrink-0 w-28 h-20 rounded-2xl overflow-hidden shadow-md">
                    <img
                      src="https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&h=500&fit=crop"
                      alt="Aesthetic Vibes"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-rose-900/10 flex items-center justify-center">
                      <button
                        onClick={(e) => handlePlayCard(aestheticVibesPlaylist, e)}
                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-rose-500 hover:scale-110 active:scale-95 transition-all"
                        title="Play Aesthetic Vibes"
                      >
                        <Pause size={18} fill="#f43f5e" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* CARD 3: Aura of Peace */}
                <div
                  onClick={() => onSelectPlaylist?.(auraOfPeacePlaylist)}
                  className="group relative cursor-pointer rounded-3xl p-4 glacial-card flex items-center justify-between overflow-hidden"
                  style={{
                    transform: 'perspective(600px) rotateX(1deg)',
                  }}
                >
                  <div className="flex flex-col justify-center min-w-0 pr-3 z-10">
                    <span className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                      Aura of Peace
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                      Golden Dusk Frequencies
                    </span>
                  </div>

                  {/* Artwork & Action Button */}
                  <div className="relative flex-shrink-0 w-28 h-20 rounded-2xl overflow-hidden shadow-md">
                    <img
                      src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&h=500&fit=crop"
                      alt="Aura of Peace"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-amber-900/10 flex items-center justify-center">
                      <button
                        onClick={(e) => handlePlayCard(auraOfPeacePlaylist, e)}
                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-amber-600 hover:scale-110 active:scale-95 transition-all"
                        title="Play Aura of Peace"
                      >
                        <Play size={18} fill="#d97706" className="ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cascaded Hint Card: Melancholy Reverie */}
                <div
                  onClick={() => onSelectPlaylist?.(soulSootherPlaylist)}
                  className="relative cursor-pointer rounded-3xl p-3.5 glacial-card flex items-center justify-between opacity-80"
                >
                  <span className="text-base font-semibold text-slate-800">
                    Melancholy Reverie
                  </span>
                  <div className="w-16 h-10 rounded-xl bg-sky-200/50 flex items-center justify-center">
                    <Music size={16} className="text-sky-600" />
                  </div>
                </div>
              </div>

              {/* Floating Mini Player Capsule Dock at Bottom */}
              <div className="px-2 pb-2 z-20">
                <div
                  onClick={() => setActiveTab('player')}
                  className="w-full p-2.5 rounded-full glacial-sculpted-dock flex items-center justify-between shadow-lg cursor-pointer hover:bg-white/60 transition-all border border-white/80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        currentTrack?.album.images[0]?.url ||
                        'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&h=300&fit=crop'
                      }
                      alt="Current"
                      className="w-11 h-11 rounded-full object-cover shadow-sm border border-white/60"
                    />
                    <div className="flex flex-col truncate">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {currentTrack?.name || 'Pray for Love'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium truncate">
                        {currentTrack?.artists[0]?.name || 'The Weeknd'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pr-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentTrack) toggleLike(currentTrack);
                      }}
                      className="w-8 h-8 rounded-full glacial-circle-btn flex items-center justify-center text-slate-700"
                      title="Add to favorites"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                      className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                      title="Play/Pause"
                    >
                      {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ambient bottom warm glow */}
              <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-rose-300/30 blur-2xl pointer-events-none" />
            </div>
          )}

          {/* ========================================================= */}
          {/* PAGE 3 PHONE SCREEN: "Music" Now Playing with Arc Scrubber */}
          {/* ========================================================= */}
          {(activeTab === 'both' || activeTab === 'player') && (
            <div className="w-full max-w-[380px] h-[740px] rounded-[48px] p-4 border-[8px] border-white/80 shadow-[0_30px_70px_rgba(70,110,160,0.32)] flex flex-col justify-between relative overflow-hidden text-white backdrop-blur-2xl">
              {/* Dual-Tone Background Image with Vertical Specular Reflection Seam */}
              <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(56, 189, 248, 0.4) 0%, rgba(255, 255, 255, 0.05) 48%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0.05) 52%, rgba(251, 146, 60, 0.45) 100%),
                    linear-gradient(to bottom, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0.65) 100%),
                    url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&h=1200&fit=crop')
                  `,
                }}
              />

              {/* Vertical Luminous Glass Reflection Seam */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px] vertical-glass-seam pointer-events-none z-10" />

              {/* Status Bar */}
              <div className="flex items-center justify-between px-4 pt-1 mb-2 z-20">
                <span className="text-xs font-bold text-white/90">9:41</span>
                <div className="w-24 h-5 rounded-full bg-black/80 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2 border border-white/20" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/90 font-semibold">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Top Navigation Header: "Music" */}
              <div className="flex items-center justify-between px-4 pt-1 z-20">
                <div className="w-9" />
                <h2 className="text-lg font-bold text-white tracking-wide drop-shadow-sm">
                  Music
                </h2>
                <button
                  onClick={() => setActiveTab('playlists')}
                  className="w-9 h-9 rounded-full glacial-circle-btn flex items-center justify-center text-white/90 shadow-sm"
                  title="Minimize player"
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {/* Center Curved Track Carousel */}
              <div className="w-full flex items-center justify-center py-4 z-20">
                <div className="flex items-center justify-center gap-3 text-center">
                  {/* Track 01: HATE ME (left arc) */}
                  <button
                    onClick={() => handleTrackSelect(hateMeTrack)}
                    className="flex flex-col items-center opacity-60 hover:opacity-100 transition-all transform -rotate-6 hover:scale-105"
                  >
                    <span className="text-xs font-semibold text-white/80">01 HATE ME</span>
                    <span className="text-[10px] text-white/60">Ellie Goulding</span>
                  </button>

                  {/* Track 02: Pray 4 Love (active center peak) */}
                  <button
                    onClick={() => handleTrackSelect(pray4LoveTrack)}
                    className="flex flex-col items-center px-3 py-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/30 shadow-lg transform scale-110"
                  >
                    <span className="text-sm font-extrabold text-white tracking-tight drop-shadow">
                      {currentTrack?.name || '02 Pray 4 Love'}
                    </span>
                    <span className="text-xs text-sky-200 font-medium">
                      {currentTrack?.artists[0]?.name || 'The Weeknd'}
                    </span>
                  </button>

                  {/* Track 03: Vampire (right arc) */}
                  <button
                    onClick={() => handleTrackSelect(vampireTrack)}
                    className="flex flex-col items-center opacity-60 hover:opacity-100 transition-all transform rotate-6 hover:scale-105"
                  >
                    <span className="text-xs font-semibold text-white/80">03 Vampire</span>
                    <span className="text-[10px] text-white/60">Olivia Rodrigo</span>
                  </button>
                </div>
              </div>

              {/* Radial Arc Progress Dial */}
              <div className="w-full flex-1 flex flex-col justify-end items-center px-4 pb-2 z-20">
                <GlacialRadialArcScrubber />
              </div>

              {/* Master Sculptured Liquid Glass Controller Deck */}
              <div className="w-full flex flex-col gap-3 pb-3 px-2 z-20">
                {/* Upper Secondary Controls: Shuffle & Repeat Pods */}
                <div className="flex items-center justify-between px-6">
                  <button
                    onClick={toggleShuffle}
                    className={`w-10 h-10 rounded-full glacial-circle-btn flex items-center justify-center shadow-md ${
                      isShuffle ? 'text-sky-300 ring-2 ring-sky-300/50' : 'text-white/80'
                    }`}
                    title="Toggle Shuffle"
                  >
                    <Shuffle size={18} />
                  </button>

                  <button
                    onClick={toggleRepeat}
                    className={`w-10 h-10 rounded-full glacial-circle-btn flex items-center justify-center shadow-md ${
                      repeatMode !== 'off' ? 'text-sky-300 ring-2 ring-sky-300/50' : 'text-white/80'
                    }`}
                    title="Toggle Repeat"
                  >
                    {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                  </button>
                </div>

                {/* Organic Sculptured Dock Container */}
                <div className="w-full p-2.5 rounded-[36px] glacial-sculpted-dock flex items-center justify-between px-6 shadow-2xl border border-white/60 backdrop-blur-3xl">
                  {/* Skip Previous */}
                  <button
                    onClick={prevTrack}
                    className="w-12 h-12 rounded-full glacial-circle-btn flex items-center justify-center text-white/90 shadow-md active:scale-95"
                    title="Previous Track"
                  >
                    <SkipBack size={22} fill="rgba(255, 255, 255, 0.4)" />
                  </button>

                  {/* Signature Large White Button in Chromatic Iridescent Refraction Halo */}
                  <div className="chromatic-halo">
                    <button
                      onClick={togglePlay}
                      className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-900 shadow-[0_8px_25px_rgba(0,0,0,0.35)] active:scale-90 transition-transform"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause size={26} fill="#0f172a" className="text-slate-900" />
                      ) : (
                        <Play size={26} fill="#0f172a" className="text-slate-900 ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Skip Next */}
                  <button
                    onClick={nextTrack}
                    className="w-12 h-12 rounded-full glacial-circle-btn flex items-center justify-center text-white/90 shadow-md active:scale-95"
                    title="Next Track"
                  >
                    <SkipForward size={22} fill="rgba(255, 255, 255, 0.4)" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
