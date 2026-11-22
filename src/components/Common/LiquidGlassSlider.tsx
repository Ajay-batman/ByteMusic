import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface LiquidGlassSliderProps {
  value: number; // e.g. progressMs or volume (0 to 1)
  min?: number;
  max: number;
  onChange: (value: number) => void;
  formatTooltip?: (value: number) => string;
  className?: string;
  accentColor?: string;
}

/**
 * LiquidGlassSlider
 * Reconstructed from Alexey Demin's LiquidGlassKit (LiquidGlassSlider.swift)
 * Features:
 * - Dual Thumb States: Contracted (resting pill) and Expanded (refractive liquid glass lens)
 * - Spring-based morphing transitions
 * - Specular glare reflection and chromatic edge highlights
 * - Real-time floating seek tooltip during drag
 * - Graceful fallback to Spotify Classic track on Dark theme
 */
export const LiquidGlassSlider: React.FC<LiquidGlassSliderProps> = ({
  value,
  min = 0,
  max,
  onChange,
  formatTooltip,
  className = '',
  accentColor,
}) => {
  const { isLiquidGlass, currentThemeDef } = useTheme();
  const effectiveAccent = accentColor || currentThemeDef?.accentColor || '#30d158';
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  const range = max - min;
  const clampedValue = Math.min(Math.max(value, min), max);
  const currentPercent = range > 0 ? ((clampedValue - min) / range) * 100 : 0;
  const activePercent = isDragging && dragPercent !== null ? dragPercent : currentPercent;

  const calculatePercentFromEvent = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const rawPercent = ((clientX - rect.left) / rect.width) * 100;
      return Math.min(Math.max(rawPercent, 0), 100);
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const percent = calculatePercentFromEvent(e.clientX);
    setDragPercent(percent);
    const newValue = min + (percent / 100) * range;
    onChange(newValue);

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const percent = calculatePercentFromEvent(e.clientX);
    setDragPercent(percent);
    const newValue = min + (percent / 100) * range;
    onChange(newValue);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragPercent(null);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // If in classic Spotify Dark Theme, render authentic Spotify CEF scrubber
  if (!isLiquidGlass) {
    return (
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex items-center h-4 cursor-pointer select-none ${className}`}
      >
        <div className="w-full h-1 bg-[#4d4d4d] group-hover:h-1.5 rounded-full relative transition-all overflow-hidden">
          <div
            style={{ width: `${activePercent}%` }}
            className="h-full bg-white group-hover:bg-[#1db954] rounded-full transition-all"
          />
        </div>
        {/* Spotify Thumb circle */}
        <div
          style={{ left: `${activePercent}%` }}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow transition-opacity ${
            isHovered || isDragging ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  }

  // LiquidGlassKit Theme (iOS Liquid Glass Slider)
  const isExpanded = isDragging || isHovered;

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex items-center h-7 cursor-pointer select-none touch-none ${className}`}
    >
      {/* Liquid Glass Track Trough */}
      <div className="w-full h-[6px] rounded-full bg-white/[0.12] border border-white/[0.18] backdrop-blur-md relative overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
        {/* Track Fill with Specular Gradient */}
        <div
          style={{
            width: `${activePercent}%`,
            background: `linear-gradient(90deg, ${effectiveAccent}88 0%, ${effectiveAccent} 100%)`,
          }}
          className="h-full rounded-full relative transition-all duration-75 shadow-[0_0_10px_rgba(48,209,88,0.4)]"
        >
          {/* Top Edge Specular Shine on Fill */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/40 rounded-full" />
        </div>
      </div>

      {/* Floating Tooltip Badge during drag or hover */}
      {isDragging && formatTooltip && (
        <div
          style={{ left: `${activePercent}%` }}
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md glass-pill text-[11px] font-mono text-white shadow-lg pointer-events-none whitespace-nowrap z-30"
        >
          {formatTooltip(min + (activePercent / 100) * range)}
        </div>
      )}

      {/* 
        LiquidGlassKit Dual-State Thumb:
        Contracted: Solid pill (30px x 14px) with subtle shadow
        Expanded: Liquid Glass Lens (44px x 22px) with refraction, glare and chromatic edge
      */}
      <div
        style={{
          left: `${activePercent}%`,
        }}
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-200 ease-out flex items-center justify-center pointer-events-none z-20 ${
          isExpanded
            ? 'w-[42px] h-[22px] rounded-full'
            : 'w-[26px] h-[13px] rounded-full'
        }`}
      >
        {isExpanded ? (
          /* Expanded Liquid Glass Lens */
          <div className="w-full h-full rounded-full bg-white/[0.28] backdrop-blur-[24px] saturate-[200%] border border-white/60 shadow-[0_8px_20px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.8),0_0_12px_rgba(16,185,129,0.35)] relative overflow-hidden flex items-center justify-center">
            {/* Specular Glare Streak */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-white/60 pointer-events-none" />
            {/* Center Lens Glint */}
            <div className="w-2.5 h-[2px] rounded-full bg-white/80 shadow-[0_0_4px_white]" />
          </div>
        ) : (
          /* Contracted Pill (Resting State) */
          <div className="w-full h-full rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/40" />
        )}
      </div>
    </div>
  );
};
