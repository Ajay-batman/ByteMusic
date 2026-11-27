import React, { useState, Suspense, lazy } from 'react';
import { PlaybackProvider } from './context/PlaybackContext';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DownloadProvider } from './context/DownloadContext';
import { SidebarNav } from './components/Sidebar/SidebarNav';
import { HomeRoute } from './components/Home/HomeRoute';
import { BottomPlayerBar } from './components/Player/BottomPlayerBar';
import { MobileBottomNav } from './components/Mobile/MobileBottomNav';
import { MobileMiniPlayer } from './components/Mobile/MobileMiniPlayer';
import { VelvetMetaballNav } from './components/Velvet/VelvetMetaballNav';
import { ThemePickerModal } from './components/Common/ThemePickerModal';
import { AppView, Playlist } from './types/spotify';
import { Loader2 } from 'lucide-react';

// Route code splitting for faster startup & reduced initial JS parse time
const SearchRoute = lazy(() => import('./components/Search/SearchRoute').then((m) => ({ default: m.SearchRoute })));
const PlaylistRoute = lazy(() => import('./components/Playlist/PlaylistRoute').then((m) => ({ default: m.PlaylistRoute })));
const LibraryRoute = lazy(() => import('./components/Library/LibraryRoute').then((m) => ({ default: m.LibraryRoute })));
const AboutRoute = lazy(() => import('./components/About/AboutRoute').then((m) => ({ default: m.AboutRoute })));
const DownloaderRoute = lazy(() => import('./components/Downloader/DownloaderRoute').then((m) => ({ default: m.DownloaderRoute })));
const MobileNowPlaying = lazy(() => import('./components/Mobile/MobileNowPlaying').then((m) => ({ default: m.MobileNowPlaying })));

const RouteLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-[#b3b3b3]">
    <Loader2 size={32} className="animate-spin text-[#1db954] mb-3" />
    <span className="text-xs font-medium">Loading view...</span>
  </div>
);

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('playlist-today-top-hits');
  const [transientPlaylist, setTransientPlaylist] = useState<Playlist | null>(null);
  const [playlistOrigin, setPlaylistOrigin] = useState<'home' | 'search' | 'library'>('library');
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const { allPlaylists, getPlaylistById } = useLibrary();
  const { theme, isLiquidGlass, isUltraviolet, isVelvetStyle } = useTheme();

  const selectedPlaylist =
    getPlaylistById(selectedPlaylistId) ||
    (transientPlaylist?.id === selectedPlaylistId ? transientPlaylist : undefined) ||
    allPlaylists[0];

  const handleSelectPlaylist = (playlist: Playlist, origin?: 'home' | 'search' | 'library') => {
    if (!getPlaylistById(playlist.id)) {
      setTransientPlaylist(playlist);
    } else {
      setTransientPlaylist(null);
    }
    const fallbackOrigin: 'home' | 'search' | 'library' =
      currentView === 'search' || currentView === 'home' || currentView === 'library'
        ? currentView
        : playlistOrigin;
    setPlaylistOrigin(origin || fallbackOrigin);
    setSelectedPlaylistId(playlist.id);
    setCurrentView('playlist');
  };

  const themeBgClass =
    theme === 'liquid-glass'
      ? 'liquid-glass-bg text-white'
      : theme === 'velvet-lime'
      ? 'velvet-lime-bg text-white'
      : theme === 'cosmic-ultraviolet'
      ? 'cosmic-ultraviolet-bg text-white'
      : theme === 'cyberpunk'
      ? 'cyberpunk-bg text-white'
      : theme === 'aurora'
      ? 'aurora-bg text-white'
      : theme === 'sunset'
      ? 'sunset-bg text-white'
      : theme === 'frost'
      ? 'frost-bg text-slate-900'
      : 'bg-black text-white';

  return (
    <div
      className={`flex flex-col h-[100dvh] w-screen font-sans overflow-hidden select-none transition-colors duration-300 relative ${themeBgClass}`}
    >
      {/* Main Work Area */}
      <div
        style={{ paddingTop: 'calc(6px + var(--safe-top, 0px))' }}
        className={`flex flex-1 overflow-hidden px-1.5 pb-1.5 sm:p-2 gap-2.5 z-10 ${isLiquidGlass ? 'pb-2' : ''}`}
      >
        {/* Desktop Left Sidebar (Hidden on mobile) */}
        <div className="hidden md:flex h-full">
          <SidebarNav
            currentView={currentView}
            setCurrentView={setCurrentView}
            selectedPlaylist={selectedPlaylist}
            setSelectedPlaylist={handleSelectPlaylist}
          />
        </div>

        {/* Center Main Stage */}
        <main
          className={`flex-1 rounded-2xl overflow-hidden flex flex-col relative pb-[calc(112px+var(--safe-bottom,0px))] md:pb-0 ${
            isVelvetStyle || isUltraviolet
              ? 'bg-transparent'
              : isLiquidGlass
              ? 'glass-panel'
              : 'bg-[#121212] rounded-lg'
          }`}
        >
          {/* Velvet & Spatial Responsive Desktop Navigation Bar */}
          {isVelvetStyle && (
            <div className="hidden md:flex justify-center pt-3.5 pb-1.5 px-4 flex-shrink-0 z-30 pointer-events-none">
              <VelvetMetaballNav currentView={currentView} setCurrentView={setCurrentView} />
            </div>
          )}

          <Suspense fallback={<RouteLoadingFallback />}>
            {currentView === 'home' && (
              <HomeRoute
                onSelectPlaylist={(pl) => handleSelectPlaylist(pl, 'home')}
                onOpenAbout={() => setCurrentView('about')}
                onOpenDownloader={() => setCurrentView('downloader')}
              />
            )}
            {currentView === 'search' && <SearchRoute onSelectPlaylist={(pl) => handleSelectPlaylist(pl, 'search')} />}
            {currentView === 'library' && <LibraryRoute onSelectPlaylist={(pl) => handleSelectPlaylist(pl, 'library')} />}
            {currentView === 'about' && <AboutRoute onBack={() => setCurrentView('home')} />}
            {currentView === 'downloader' && <DownloaderRoute onBack={() => setCurrentView('home')} />}
            {currentView === 'playlist' && selectedPlaylist && (
              <PlaylistRoute
                playlist={selectedPlaylist}
                onSelectPlaylist={(pl) => handleSelectPlaylist(pl)}
                backLabel={playlistOrigin === 'search' ? 'Search' : playlistOrigin === 'home' ? 'Home' : 'Library'}
                onBack={() => setCurrentView(playlistOrigin)}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* Desktop Bottom Playback Controller (Hidden on mobile) */}
      <div className="hidden md:block z-20">
        <BottomPlayerBar onOpenNowPlaying={() => setIsMobilePlayerOpen(true)} />
      </div>

      {/* Mobile Mini Player & Bottom Navigation (Visible only on mobile) */}
      <MobileMiniPlayer onOpenFullPlayer={() => setIsMobilePlayerOpen(true)} />
      <MobileBottomNav currentView={currentView} setCurrentView={setCurrentView} />

      {/* Mobile Expandable Now Playing Screen */}
      {isMobilePlayerOpen && (
        <Suspense fallback={null}>
          <MobileNowPlaying onClose={() => setIsMobilePlayerOpen(false)} />
        </Suspense>
      )}

      {/* Global Multi-Theme Picker Modal */}
      <ThemePickerModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <PlaybackProvider>
        <LibraryProvider>
          <DownloadProvider>
            <AppContent />
          </DownloadProvider>
        </LibraryProvider>
      </PlaybackProvider>
    </ThemeProvider>
  );
};

export default App;
