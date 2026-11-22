import React from 'react';
import { Home, Search, Library, Music, Repeat, ListMusic, Settings, Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface MobileBottomNavProps {
  currentView: 'home' | 'search' | 'library' | 'playlist';
  setCurrentView: (view: 'home' | 'search' | 'library') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  setCurrentView,
}) => {
  const { isLiquidGlass, isVelvetLime, openThemeModal } = useTheme();

  // Velvet & Lime Dribbble Dock: 5 Clean Icon-Only Buttons
  if (isVelvetLime) {
    return (
      <nav className="fixed bottom-3.5 left-4 right-4 max-w-[360px] mx-auto h-16 rounded-full frosted-3d-dock flex items-center justify-between px-3.5 z-40 select-none shadow-2xl">
        {/* 1. Home */}
        <button
          onClick={() => setCurrentView('home')}
          title="Home"
          className={`flex items-center justify-center transition-all ${
            currentView === 'home'
              ? 'bg-[#D2F843] text-black w-11 h-11 rounded-full shadow-[0_0_18px_rgba(210,248,67,0.35)] scale-105'
              : 'text-[#9595a8] hover:text-white w-10 h-10 rounded-full hover:bg-white/5 active:scale-90'
          }`}
        >
          <Home size={22} strokeWidth={currentView === 'home' ? 2.5 : 2} />
        </button>

        {/* 2. Music / Library */}
        <button
          onClick={() => setCurrentView('library')}
          title="My Music"
          className={`flex items-center justify-center transition-all ${
            currentView === 'library' || currentView === 'playlist'
              ? 'bg-[#D2F843] text-black w-11 h-11 rounded-full shadow-[0_0_18px_rgba(210,248,67,0.35)] scale-105'
              : 'text-[#9595a8] hover:text-white w-10 h-10 rounded-full hover:bg-white/5 active:scale-90'
          }`}
        >
          <Music size={21} strokeWidth={currentView === 'library' ? 2.5 : 2} />
        </button>

        {/* 3. Discover / Search */}
        <button
          onClick={() => setCurrentView('search')}
          title="Discover"
          className={`flex items-center justify-center transition-all ${
            currentView === 'search'
              ? 'bg-[#D2F843] text-black w-11 h-11 rounded-full shadow-[0_0_18px_rgba(210,248,67,0.35)] scale-105'
              : 'text-[#9595a8] hover:text-white w-10 h-10 rounded-full hover:bg-white/5 active:scale-90'
          }`}
        >
          <Repeat size={21} strokeWidth={currentView === 'search' ? 2.5 : 2} />
        </button>

        {/* 4. Queue / Equalizer */}
        <button
          onClick={() => setCurrentView('library')}
          title="Queue & Playlists"
          className="flex items-center justify-center text-[#9595a8] hover:text-white w-10 h-10 rounded-full hover:bg-white/5 active:scale-90 transition-all"
        >
          <ListMusic size={21} strokeWidth={2} />
        </button>

        {/* 5. Theme / Settings Cog */}
        <button
          onClick={openThemeModal}
          title="Theme Styles"
          className="flex items-center justify-center text-[#9595a8] hover:text-white w-10 h-10 rounded-full hover:bg-white/5 active:scale-90 transition-all"
        >
          <Palette size={21} strokeWidth={2} />
        </button>
      </nav>
    );
  }

  const tabs: { id: 'home' | 'search' | 'library'; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'My Music', icon: Library },
  ];

  return (
    <nav
      className={`fixed z-40 md:hidden flex items-center justify-around select-none transition-all ${
        isLiquidGlass
          ? 'bottom-0 left-0 right-0 h-14 glass-panel border-t border-white/20'
          : 'bottom-0 left-0 right-0 h-14 bg-[#121212] border-t border-[#282828]'
      }`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          currentView === tab.id || (tab.id === 'library' && currentView === 'playlist');

        return (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
              isActive ? 'text-white' : 'text-[#a7a7a7] hover:text-white'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] ${isActive ? 'font-bold text-white' : 'font-normal'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
