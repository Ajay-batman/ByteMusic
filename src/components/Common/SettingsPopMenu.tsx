import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Download, Info, Palette, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SettingsPopMenuProps {
  onOpenDownloader: () => void;
  onOpenAbout: () => void;
  buttonClassName?: string;
}

export const SettingsPopMenu: React.FC<SettingsPopMenuProps> = ({
  onOpenDownloader,
  onOpenAbout,
  buttonClassName,
}) => {
  const { isFrost, isVelvetStyle, isLiquidGlass, isUltraviolet, openThemeModal, currentThemeDef } =
    useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const isSpatialGlass = isVelvetStyle || isLiquidGlass || isUltraviolet;

  return (
    <div ref={containerRef} className="relative z-40">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Settings"
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          buttonClassName ||
          `frosted-circle-btn w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95 ${
            isFrost ? 'text-slate-900 bg-white/80 border-slate-300 shadow-sm' : 'text-white'
          }`
        }
      >
        <Settings size={17} style={{ color: currentThemeDef.accentColor }} />
      </button>

      {open && (
        <div
          role="menu"
          style={
            isSpatialGlass
              ? {
                  backdropFilter: 'blur(24px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
                  boxShadow: isFrost
                    ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), 0 18px 36px -8px rgba(15,23,42,0.16)'
                    : 'inset 0 1.5px 1.5px rgba(255,255,255,0.4), 0 22px 44px -10px rgba(0,0,0,0.65)',
                }
              : undefined
          }
          className={`absolute right-0 mt-2.5 w-64 rounded-2xl border p-2 shadow-2xl select-none z-50 ${
            isFrost
              ? 'bg-white/95 border-slate-200 text-slate-900'
              : isSpatialGlass
              ? 'bg-[#141422]/92 border-white/20 text-white'
              : 'bg-[#242424] border-[#3a3a3a] text-white'
          }`}
        >
          <div
            className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              isFrost ? 'text-slate-500' : 'text-white/50'
            }`}
          >
            Settings
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenDownloader();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
              isFrost ? 'hover:bg-slate-100' : 'hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Download size={16} className="text-[#1db954] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">Video Downloader</p>
                <p className={`text-[11px] truncate ${isFrost ? 'text-slate-500' : 'text-white/55'}`}>
                  YouTube MP4 & quality picker
                </p>
              </div>
            </div>
            <ChevronRight size={14} className="opacity-45 flex-shrink-0" />
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openThemeModal();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
              isFrost ? 'hover:bg-slate-100' : 'hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Palette size={16} style={{ color: currentThemeDef.accentColor }} className="flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">Theme Styles</p>
                <p className={`text-[11px] truncate ${isFrost ? 'text-slate-500' : 'text-white/55'}`}>
                  {currentThemeDef.name}
                </p>
              </div>
            </div>
            <ChevronRight size={14} className="opacity-45 flex-shrink-0" />
          </button>

          <div className={`my-1.5 border-t ${isFrost ? 'border-slate-200' : 'border-white/10'}`} />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenAbout();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
              isFrost ? 'hover:bg-slate-100' : 'hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Info size={16} className={isFrost ? 'text-sky-600 flex-shrink-0' : 'text-cyan-400 flex-shrink-0'} />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">About</p>
                <p className={`text-[11px] truncate ${isFrost ? 'text-slate-500' : 'text-white/55'}`}>
                  App information
                </p>
              </div>
            </div>
            <ChevronRight size={14} className="opacity-45 flex-shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
};
