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
import { Playlist } from './types/spotify';
import { Loader2 } from 'lucide-react';

// Route code splitting for faster startup & reduced initial JS parse time
const SearchRoute = lazy(() => import('./components/Search/SearchRoute').then((m) => ({ default: m.SearchRoute })));
const PlaylistRoute = lazy(() => import('./components/Playlist/PlaylistRoute').then((m) => ({ default: m.PlaylistRoute })));
const LibraryRoute = lazy(() => import('./components/Library/LibraryRoute').then((m) => ({ default: m.LibraryRoute })));
const MobileNowPlaying = lazy(() => import('./components/Mobile/MobileNowPlaying').then((m) => ({ default: m.MobileNowPlaying })));

const RouteLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-[#b3b3b3]">
    <Loader2 size={32} className="animate-spin text-[#1db954] mb-3" />
    <span className="text-xs font-medium">Loading view...</span>
  </div>
);

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'playlist'>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('playlist-today-top-hits');
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const { allPlaylists, getPlaylistById } = useLibrary();
  const { isLiquidGlass } = useTheme();

  const selectedPlaylist = getPlaylistById(selectedPlaylistId) || allPlaylists[0];

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);
    setCurrentView('playlist');
  };

  return (
    <div
      className={`flex flex-col h-screen w-screen font-sans overflow-hidden select-none transition-colors duration-500 relative ${
        isLiquidGlass ? 'liquid-glass-bg text-white' : 'bg-black text-white'
      }`}
    >
      {/* Dynamic Ambient Fluid Light Orbs for Liquid Glass Theme */}
      {isLiquidGlass && (
        <>
          <div className="orb-float-1 fixed -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/25 blur-[100px] pointer-events-none z-0" />
          <div className="orb-float-2 fixed -bottom-24 -right-24 w-[32rem] h-[32rem] rounded-full bg-pink-500/20 blur-[120px] pointer-events-none z-0" />
          <div className="orb-float-1 fixed top-1/2 left-1/3 w-80 h-80 rounded-full bg-emerald-500/15 blur-[90px] pointer-events-none z-0" />
        </>
      )}

      {/* Main Work Area */}
      <div className={`flex flex-1 overflow-hidden p-2 gap-2.5 z-10 ${isLiquidGlass ? 'pb-2' : ''}`}>
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
          className={`flex-1 rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 pb-32 md:pb-0 ${
            isLiquidGlass ? 'glass-panel' : 'bg-[#121212] rounded-lg'
          }`}
        >
          <Suspense fallback={<RouteLoadingFallback />}>
            {currentView === 'home' && <HomeRoute onSelectPlaylist={handleSelectPlaylist} />}
            {currentView === 'search' && <SearchRoute />}
            {currentView === 'library' && <LibraryRoute onSelectPlaylist={handleSelectPlaylist} />}
            {currentView === 'playlist' && selectedPlaylist && (
              <PlaylistRoute
                playlist={selectedPlaylist}
                onSelectPlaylist={handleSelectPlaylist}
                onBack={() => setCurrentView('library')}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* Desktop Bottom Playback Controller (Hidden on mobile) */}
      <div className="hidden md:block z-20">
        <BottomPlayerBar />
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
