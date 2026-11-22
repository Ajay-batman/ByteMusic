import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'dark' | 'liquid-glass' | 'velvet-lime' | 'cyberpunk' | 'amoled' | 'aurora';

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
    name: 'Velvet & Lime',
    category: 'Aesthetic',
    description: 'Dribbble-inspired velvet dark with electric acid lime and pastel lavender cards.',
    previewColors: ['#0B0B10', '#D2F843', '#D8B4FE'],
    accentColor: '#D2F843',
  },
  'liquid-glass': {
    id: 'liquid-glass',
    name: 'iOS Liquid Glass',
    category: 'Glass',
    description: 'Apple-inspired frosted glassmorphism, fluid ambient mesh, and specular light.',
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
    name: 'Nordic Aurora',
    category: 'Vibrant',
    description: 'Deep arctic marine blue with glowing emerald and turquoise polar auroras.',
    previewColors: ['#06131c', '#10b981', '#22d3ee'],
    accentColor: '#10b981',
  },
};

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isLiquidGlass: boolean;
  isVelvetLime: boolean;
  isCyberpunk: boolean;
  isAmoled: boolean;
  isAurora: boolean;
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
    root.classList.remove('theme-dark', 'theme-liquid-glass', 'theme-velvet-lime', 'theme-cyberpunk', 'theme-amoled', 'theme-aurora');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  const currentThemeDef = THEME_REGISTRY[theme] || THEME_REGISTRY.dark;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isLiquidGlass: theme === 'liquid-glass',
        isVelvetLime: theme === 'velvet-lime',
        isCyberpunk: theme === 'cyberpunk',
        isAmoled: theme === 'amoled',
        isAurora: theme === 'aurora',
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
