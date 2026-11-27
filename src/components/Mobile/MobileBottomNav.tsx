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

  // Velvet & Spatial Responsive Liquid Glass Metaball Dock (Mobile bottom slot lifted above system nav)
  if (isVelvetStyle) {
    return (
      <div
        style={{ bottom: 'calc(18px + var(--safe-bottom, 0px))' }}
        className="md:hidden fixed inset-x-0 px-2 flex justify-center z-40 pointer-events-none"
      >
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
      style={{ bottom: 'calc(10px + var(--safe-bottom, 0px))' }}
      className={`fixed left-2.5 right-2.5 h-16 rounded-2xl z-40 md:hidden flex items-center justify-around select-none transition-colors shadow-2xl ${
        isLiquidGlass
          ? 'glass-panel border border-white/25'
          : 'bg-[#161618]/95 border border-[#2c2c30]'
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
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
              isActive ? 'text-white' : 'text-[#a7a7a7] hover:text-white'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[11px] ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
