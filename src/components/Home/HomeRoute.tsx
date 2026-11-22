import React, { useState } from 'react';
import { mockPlaylists, mockTracks } from '../../data/mockSpotifyCatalog';
import { Playlist, Track } from '../../types/spotify';
import { Play, Palette, Server, Heart, Sparkles, Search, ArrowDownToLine, MoreHorizontal } from 'lucide-react';
import { usePlayContextItem } from '../../hooks/usePlayContextItem';
import { usePlayback } from '../../context/PlaybackContext';
import { useTheme } from '../../context/ThemeContext';
import { ServerSettingsModal } from '../Common/ServerSettingsModal';

interface HomeRouteProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const HomeRoute: React.FC<HomeRouteProps> = ({ onSelectPlaylist }) => {
  const { isLiquidGlass, isVelvetLime, openThemeModal, currentThemeDef } = useTheme();
  const { playTrack } = usePlayback();
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'new' | 'trending' | 'daily' | 'playlists'>('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New Release' },
    { id: 'trending', label: 'Trending' },
    { id: 'daily', label: 'Top Charts' },
  ] as const;

  // Dribbble Screen 1 Top Daily Playlists Dataset
  const topDailyPlaylists = [
    {
      id: 'starlit-reverie',
      title: 'Starlit Reverie',
      artist: 'By Budiarti',
      count: '8 Songs',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      track: mockTracks[0],
    },
    {
      id: 'midnight-confessions',
      title: 'Midnight Confessions',
      artist: 'By Alexiao',
      count: '24 Songs',
      image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
      track: mockTracks[1],
    },
    {
      id: 'lost-in-the-echo',
      title: 'Lost in the Echo',
      artist: 'By Alexiao',
      count: '24 Songs',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      track: mockTracks[2],
    },
    {
      id: 'letters-i-never-sent',
      title: 'Letters I Never Sent',
      artist: 'By Alexiao',
      count: '24 Songs',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      track: mockTracks[3],
    },
    {
      id: 'breaking-the-silence',
      title: 'Breaking the Silence',
      artist: 'By Alexiao',
      count: '24 Songs',
      image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
      track: mockTracks[4],
    },
    {
      id: 'tears-on-the-vinyl',
      title: 'Tears on the Vinyl',
      artist: 'By Alexiao',
      count: '24 Songs',
      image: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop',
      track: mockTracks[5],
    },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 scrollbar-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pt-1">
        {/* Left: User Avatar & Greeting */}
        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop"
            alt="Samantha"
            className="w-11 h-11 rounded-full object-cover border-2 border-white/20 shadow-lg ring-2 ring-[#D946EF]/30"
          />
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E9F] block -mb-0.5">
              Welcome back
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
              Hi, Samantha
            </h1>
          </div>
        </div>

        {/* Right: Frosted Circular Disc Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsServerModalOpen(true)}
            title="Backend Server Connection"
            className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white"
          >
            <Server size={17} className="text-[#D2F843]" />
          </button>
          <button
            onClick={openThemeModal}
            title="Choose Theme Style"
            className="frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center text-white"
          >
            <Palette size={17} style={{ color: currentThemeDef.accentColor }} />
          </button>
        </div>
      </div>

      {/* Horizontal Category Filter Chips (Dribbble Screen 1) */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none pt-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? isVelvetLime
                    ? 'bg-[#D2F843] text-black shadow-lg shadow-[#D2F843]/20 scale-105'
                    : 'bg-white text-black shadow-md'
                  : isVelvetLime
                  ? 'bg-[#181824]/80 text-[#9E9EA8] hover:text-white border border-white/10 backdrop-blur-md'
                  : 'bg-white/5 hover:bg-white/10 text-[#a0a0b0] border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Curated & Trending Hero Banner (Dribbble Screen 1) */}
      <div className="relative overflow-hidden rounded-[26px] p-5 sm:p-6 bg-gradient-to-r from-[#D8B4FE] via-[#E9D5FF] to-[#C4B5FD] text-[#2E1065] shadow-2xl flex items-center justify-between gap-4">
        <div className="flex-1 z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#2E1065]/10 text-[#4C1D95] mb-2 w-max">
            <Sparkles size={11} />
            <span>Curated & trending</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2E1065] tracking-tight font-sans">
            Discover weekly
          </h2>
          <p className="text-xs text-[#4C1D95]/85 max-w-[210px] sm:max-w-xs mt-1 mb-3.5 font-medium leading-snug">
            The original slow instrumental best palylists.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectPlaylist(mockPlaylists[0])}
              className="w-9 h-9 rounded-full bg-[#3B0764] hover:bg-[#2E1065] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Play size={15} fill="currentColor" className="ml-0.5" />
            </button>
            <button
              onClick={() => onSelectPlaylist(mockPlaylists[0])}
              className="p-2 rounded-full text-[#4C1D95] hover:bg-white/30 transition-colors"
            >
              <Heart size={16} />
            </button>
            <button
              onClick={() => onSelectPlaylist(mockPlaylists[0])}
              className="p-2 rounded-full text-[#4C1D95] hover:bg-white/30 transition-colors"
            >
              <ArrowDownToLine size={16} />
            </button>
            <button
              onClick={() => onSelectPlaylist(mockPlaylists[0])}
              className="p-2 rounded-full text-[#4C1D95] hover:bg-white/30 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="relative flex-shrink-0">
          <img
            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop"
            alt="Discover Weekly"
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-2xl border-2 border-white/60"
          />
        </div>
      </div>

      {/* Top Daily Playlists Section (Dribbble Screen 1) */}
      <div className="space-y-3 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-sans">
            Top daily playlists
          </h2>
          <span className="text-xs font-semibold text-[#8E8E9F] hover:text-white cursor-pointer transition-colors">
            See all
          </span>
        </div>

        <div className="space-y-2">
          {topDailyPlaylists.map((item) => (
            <div
              key={item.id}
              onClick={() => playTrack(item.track)}
              className="group flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all cursor-pointer select-none"
            >
              {/* Left: Thumbnail & Details */}
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-md bg-[#181824]"
                />
                <div className="truncate">
                  <h3 className="text-sm font-bold text-white truncate font-sans group-hover:text-[#D2F843] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#8E8E9F] truncate font-medium">
                    {item.artist} <span className="mx-1">•</span> {item.count}
                  </p>
                </div>
              </div>

              {/* Right: Round Play Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playTrack(item.track);
                }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#D2F843] hover:text-black border border-white/15 flex items-center justify-center text-white transition-all shadow-md active:scale-90 flex-shrink-0 ml-3"
              >
                <Play size={14} fill="currentColor" className="ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <ServerSettingsModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
};
