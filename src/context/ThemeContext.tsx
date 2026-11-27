import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme =
  | 'dark'
  | 'liquid-glass'
  | 'velvet-lime'
  | 'cosmic-ultraviolet'
  | 'cyberpunk'
  | 'amoled'
  | 'aurora'
  | 'glacial-glass'
  | 'sunset'
  | 'frost';

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  category: 'Classic' | 'Glass' | 'Aesthetic' | 'Vibrant' | 'Minimalist';
  description: string;
  previewColors: string[];
  accentColor: string;
}

export const THEME_REGISTRY: Record<AppTheme, ThemeDefinition> = {
  'dark': {
    id: 'dark',
    name: 'Spotify Dark',
    category: 'Classic',
    description: 'Iconic obsidian black with signature Spotify electric green accents.',
    previewColors: ['#121212', '#282828', '#1db954'],
    accentColor: '#1db954',
  },
  'velvet-lime': {
    id: 'velvet-lime',
    name: 'Violet Spatial Glass',
    category: 'Aesthetic',
    description: 'Velvet dark spatial glass with electric acid lime and pastel lavender cards.',
    previewColors: ['#0B0B10', '#D2F843', '#D8B4FE'],
    accentColor: '#D2F843',
  },
  'liquid-glass': {
    id: 'liquid-glass',
    name: 'Frosted Prism',
    category: 'Glass',
    description: 'Frosted glassmorphism, fluid ambient mesh, and specular prism light.',
    previewColors: ['#080811', '#7c3aed', '#06b6d4'],
    accentColor: '#06b6d4',
  },
  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk',
    category: 'Vibrant',
    description: 'Deep midnight neon with electric cyan and hot magenta highlights.',
    previewColors: ['#0a0a14', '#00f0ff', '#ff007f'],
    accentColor: '#00f0ff',
  },
  'amoled': {
    id: 'amoled',
    name: 'Pure AMOLED',
    category: 'Minimalist',
    description: 'Pitch black #000000 with high-contrast borders for maximum OLED battery savings.',
    previewColors: ['#000000', '#1a1a1a', '#7c3aed'],
    accentColor: '#7c3aed',
  },
  'aurora': {
    id: 'aurora',
    name: 'Spatial Aurora',
    category: 'Glass',
    description: 'Deep navy glass with radiant emerald, turquoise, and indigo polar glows.',
    previewColors: ['#091522', '#34d399', '#22d3ee'],
    accentColor: '#34d399',
  },
  'sunset': {
    id: 'sunset',
    name: 'Spatial Sunset',
    category: 'Glass',
    description: 'Deep velvet violet with incandescent rose, warm amber, and vivid fuchsia radiance.',
    previewColors: ['#150716', '#f43f5e', '#d946ef'],
    accentColor: '#f43f5e',
  },
  'frost': {
    id: 'frost',
    name: 'Spatial Frost',
    category: 'Glass',
    description: 'Crisp glacial light gradient with sky blue, indigo aura, and dark ink typography.',
    previewColors: ['#f0f9ff', '#38bdf8', '#818cf8'],
    accentColor: '#38bdf8',
  },
  'glacial-glass': {
    id: 'glacial-glass',
    name: 'Glacial Liquid Glass',
    category: 'Glass',
    description: 'Ethereal frosted ice glassmorphism, iridescent specular light, and curved radial arc controls.',
    previewColors: ['#c3d7e8', '#e2edf7', '#60a5fa'],
    accentColor: '#38bdf8',
  },
  'cosmic-ultraviolet': {
    id: 'cosmic-ultraviolet',
    name: 'Cosmic Ultraviolet',
    category: 'Vibrant',
    description: 'Deep midnight ultraviolet with electric magenta and neon sapphire radiance.',
    previewColors: ['#080716', '#a855f7', '#d946ef'],
    accentColor: '#d946ef',
  },
};

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isLiquidGlass: boolean;
  isVelvetLime: boolean;
  isUltraviolet: boolean;
  isGlacialGlass: boolean;
  isCyberpunk: boolean;
  isAmoled: boolean;
  isAurora: boolean;
  isSunset: boolean;
  isFrost: boolean;
  isVelvetStyle: boolean;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
  openThemeModal: () => void;
  closeThemeModal: () => void;
  currentThemeDef: ThemeDefinition;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('spotify_app_theme') as AppTheme;
      if (saved && THEME_REGISTRY[saved]) {
        return saved;
      }
    } catch {}
    return 'dark';
  });

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const setTheme = (newTheme: AppTheme) => {
    if (!THEME_REGISTRY[newTheme]) return;
    setThemeState(newTheme);
    try {
      localStorage.setItem('spotify_app_theme', newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    const themeKeys = Object.keys(THEME_REGISTRY) as AppTheme[];
    const nextIdx = (themeKeys.indexOf(theme) + 1) % themeKeys.length;
    setTheme(themeKeys[nextIdx]);
  };

  const openThemeModal = () => setIsThemeModalOpen(true);
  const closeThemeModal = () => setIsThemeModalOpen(false);

  // Sync document root class for theme CSS cascades
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(
      'theme-dark',
      'theme-liquid-glass',
      'theme-velvet-lime',
      'theme-cosmic-ultraviolet',
      'theme-cyberpunk',
      'theme-amoled',
      'theme-aurora',
      'theme-glacial-glass',
      'theme-sunset',
      'theme-frost',
      'theme-light'
    );
    root.classList.add(`theme-${theme}`);
    if (theme === 'frost') {
      root.classList.add('theme-light');
    }
  }, [theme]);

  const currentThemeDef = THEME_REGISTRY[theme] || THEME_REGISTRY.dark;
  const isVelvetStyle =
    theme === 'velvet-lime' || theme === 'aurora' || theme === 'sunset' || theme === 'frost';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isLiquidGlass: theme === 'liquid-glass',
        isVelvetLime: theme === 'velvet-lime',
        isUltraviolet: theme === 'cosmic-ultraviolet',
        isGlacialGlass: theme === 'glacial-glass',
        isCyberpunk: theme === 'cyberpunk',
        isAmoled: theme === 'amoled',
        isAurora: theme === 'aurora',
        isSunset: theme === 'sunset',
        isFrost: theme === 'frost',
        isVelvetStyle,
        isThemeModalOpen,
        setIsThemeModalOpen,
        openThemeModal,
        closeThemeModal,
        currentThemeDef,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
