import React from 'react';
import { Home, Search, Library } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface MobileBottomNavProps {
  currentView: 'home' | 'search' | 'library' | 'playlist';
  setCurrentView: (view: 'home' | 'search' | 'library') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  setCurrentView,
}) => {
  const { isLiquidGlass, isVelvetLime } = useTheme();

  const tabs: { id: 'home' | 'search' | 'library'; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'My Music', icon: Library },
  ];

  return (
    <nav
      className={`fixed z-40 md:hidden flex items-center justify-around select-none transition-all ${
        isVelvetLime
          ? 'bottom-2.5 left-4 right-4 h-14 rounded-full bg-[#14141e]/90 backdrop-blur-xl border border-white/10 shadow-2xl px-2'
          : isLiquidGlass
          ? 'bottom-0 left-0 right-0 h-14 glass-panel border-t border-white/20'
          : 'bottom-0 left-0 right-0 h-14 bg-[#121212] border-t border-[#282828]'
      }`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          currentView === tab.id || (tab.id === 'library' && currentView === 'playlist');

        if (isVelvetLime) {
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              className={`flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#D2F843] text-black w-10 h-10 rounded-full shadow-lg scale-105'
                  : 'text-[#8E8E9F] hover:text-white w-10 h-10 rounded-full'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        }

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
