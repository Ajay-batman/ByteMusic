import React from 'react';
import { Palette, Check, X, Sparkles, Moon, Zap, Compass } from 'lucide-react';
import { useTheme, THEME_REGISTRY, AppTheme } from '../../context/ThemeContext';

export const ThemePickerModal: React.FC = () => {
  const { theme, setTheme, isThemeModalOpen, closeThemeModal, isLiquidGlass, isFrost } = useTheme();

  if (!isThemeModalOpen) return null;

  const themesList = Object.values(THEME_REGISTRY);

  const getThemeIcon = (id: AppTheme) => {
    switch (id) {
      case 'dark':
        return <Moon size={16} className="text-[#1db954]" />;
      case 'cosmic-ultraviolet':
        return <Sparkles size={16} className="text-[#d946ef]" />;
      case 'velvet-lime':
        return <Sparkles size={16} className="text-[#D2F843]" />;
      case 'liquid-glass':
        return <Sparkles size={16} className="text-cyan-300" />;
      case 'cyberpunk':
        return <Zap size={16} className="text-pink-400" />;
      case 'aurora':
        return <Compass size={16} className="text-emerald-400" />;
      case 'sunset':
        return <Sparkles size={16} className="text-rose-400" />;
      case 'frost':
        return <Sparkles size={16} className="text-sky-500" />;
      default:
        return <Palette size={16} className="text-white" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md anim-scrim-in">
      <div
        className={`w-full max-w-lg p-6 rounded-3xl shadow-2xl transition-all border anim-modal-in ${
          isFrost
            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/30'
            : isLiquidGlass
            ? 'glass-panel border-white/20 text-white'
            : 'bg-[#181818] text-white border-[#2e2e2e]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-4 border-b mb-5 ${
            isFrost ? 'border-slate-200' : 'border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg">
              <Palette size={20} className="text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isFrost ? 'text-slate-900' : 'text-white'}`}>
                Theme Styles
              </h2>
              <p className={`text-xs ${isFrost ? 'text-slate-500' : 'text-[#b3b3b3]'}`}>
                Custom visual palettes & hardware-optimized skins
              </p>
            </div>
          </div>
          <button
            onClick={closeThemeModal}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isFrost
                ? 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 hover:text-slate-900'
                : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {themesList.map((item, idx) => {
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTheme(item.id);
                }}
                style={{ '--stagger-i': idx } as React.CSSProperties}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer anim-stagger-item ${
                  isFrost
                    ? isSelected
                      ? 'border-slate-900/30 bg-slate-900/5 shadow-sm'
                      : 'border-slate-200/80 bg-white/60 hover:bg-white hover:border-slate-300'
                    : isSelected
                    ? 'border-white/40 bg-white/15 shadow-lg'
                    : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 mr-3">
                  {/* Theme icon container */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                      isFrost ? 'border border-slate-200/80' : ''
                    }`}
                    style={{ backgroundColor: item.previewColors[0] }}
                  >
                    {getThemeIcon(item.id)}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold text-sm truncate ${
                          isFrost ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          isFrost
                            ? 'bg-slate-200/80 text-slate-700'
                            : 'bg-white/10 text-white/80'
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <span
                      className={`text-xs truncate mt-0.5 ${
                        isFrost ? 'text-slate-600' : 'text-[#b3b3b3]'
                      }`}
                    >
                      {item.description}
                    </span>
                  </div>
                </div>

                {/* Right: Preview color dots + Checkmark */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center -space-x-1.5">
                    {item.previewColors.map((c, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? isFrost
                          ? 'bg-slate-900 text-white shadow-md scale-105'
                          : 'bg-white text-black shadow-md scale-105'
                        : isFrost
                        ? 'border border-slate-300 opacity-0 group-hover:opacity-100'
                        : 'border border-white/20 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check size={14} className="stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div
          className={`mt-5 pt-3 border-t flex items-center justify-between text-xs ${
            isFrost ? 'border-slate-200 text-slate-500' : 'border-white/10 text-[#909090]'
          }`}
        >
          <span>Optimized for 60fps native GPU rendering</span>
          <button
            onClick={closeThemeModal}
            className={`px-4 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
              isFrost
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
