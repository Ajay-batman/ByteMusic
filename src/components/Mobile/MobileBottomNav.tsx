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
  const { isLiquidGlass } = useTheme();

  const tabs: { id: 'home' | 'search' | 'library'; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 h-14 z-40 md:hidden flex items-center justify-around select-none transition-all ${
        isLiquidGlass
          ? 'glass-panel border-t border-white/20'
          : 'bg-[#121212] border-t border-[#282828]'
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
