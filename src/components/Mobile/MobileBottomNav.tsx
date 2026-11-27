import React from 'react';
import { Home, Search, Library } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { VelvetMetaballNav } from '../Velvet/VelvetMetaballNav';

import { AppView } from '../../types/spotify';

interface MobileBottomNavProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  setCurrentView,
}) => {
  const { isLiquidGlass, isVelvetLime, isVelvetStyle } = useTheme();

  // Velvet & Spatial Responsive Liquid Glass Metaball Dock (Mobile bottom slot)
  if (isVelvetStyle) {
    return (
      <div className="md:hidden fixed bottom-3.5 inset-x-0 px-3 flex justify-center z-40 pointer-events-none">
        <VelvetMetaballNav currentView={currentView} setCurrentView={setCurrentView} />
      </div>
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
