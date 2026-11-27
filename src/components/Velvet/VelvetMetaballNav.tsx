import React from 'react';
import { Home, Music, Search, ListMusic, Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { LiquidGlassMetaballNav, LiquidGlassNavItem } from '../Common/LiquidGlassMetaball';

import { AppView } from '../../types/spotify';

interface VelvetMetaballNavProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  className?: string;
}

/**
 * Velvet & Lime Navigation Bar powered directly by the exact Liquid Glass Metaball Nav Bar physics.
 */
export const VelvetMetaballNav: React.FC<VelvetMetaballNavProps> = ({
  currentView,
  setCurrentView,
  className = '',
}) => {
  const { openThemeModal, isThemeModalOpen } = useTheme();

  const activeId = isThemeModalOpen ? 'themes' : currentView;

  const items: LiquidGlassNavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      onSelect: () => setCurrentView('home'),
    },
    {
      id: 'library',
      label: 'My Music',
      icon: Music,
      onSelect: () => setCurrentView('library'),
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      onSelect: () => setCurrentView('search'),
    },
    {
      id: 'playlist',
      label: 'Queue & Playlists',
      icon: ListMusic,
      onSelect: () => setCurrentView('playlist'),
    },
    {
      id: 'themes',
      label: 'Theme Styles',
      icon: Palette,
      onSelect: openThemeModal,
    },
  ];

  return (
    <LiquidGlassMetaballNav
      items={items}
      activeId={activeId}
      viscosity={14}
      stiffness={0.15}
      specular={0.75}
      interactionMode="both"
      className={className}
    />
  );
};
