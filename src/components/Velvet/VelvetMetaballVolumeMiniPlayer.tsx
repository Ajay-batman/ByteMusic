import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Disc3,
  Loader2,
} from 'lucide-react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useTheme } from '../../context/ThemeContext';
import { captureTransitionOrigin, registerMiniPlayerArtwork, registerMiniPlayerContainer } from '../../utils/motion';

interface VelvetMetaballVolumeMiniPlayerProps {
  onOpenFullPlayer: () => void;
  className?: string;
}

/**
 * Isolated 2px bottom progress hairline consuming high-frequency progress ticks
 * without forcing re-renders on the physics stage.
 */
const MiniHairlineProgress: React.FC<{ fallbackDurationMs: number; isFrost?: boolean }> = React.memo(
  ({ fallbackDurationMs, isFrost }) => {
    const { progressMs, durationMs } = usePlaybackProgress();
    const total = durationMs > 0 ? durationMs : fallbackDurationMs || 1;
    const progressPct = Math.min(100, Math.max(0, (progressMs / total) * 100));

    return (
      <div
        className={`pointer-events-none absolute bottom-0 left-5 right-5 h-[2px] rounded-full overflow-hidden ${
          isFrost ? 'bg-slate-300/40' : 'bg-black/20'
        }`}
      >
        <div
          style={{ width: `${progressPct}%` }}
          className={`h-full transition-[width] duration-200 ${
            isFrost ? 'bg-slate-900/70' : 'bg-white/60'
          }`}
        />
      </div>
    );
  }
);

/**
 * Velvet & Lime Minimized Music Player implementing ios_liquid_glass_metaball_volume_mini_player.tsx.
 * Features a 60fps floating pill + detachable Liquid Glass Volume droplet that collides, stretches,
 * fuses to expand into a live volume slider panel, and auto-separates via an SVG countdown ring.
 */
export const VelvetMetaballVolumeMiniPlayer: React.FC<VelvetMetaballVolumeMiniPlayerProps> = ({
  onOpenFullPlayer,
  className = '',
}) => {
  const filterId = useId().replace(/:/g, '');
  const { isFrost, isAurora, isSunset } = useTheme();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    togglePlay,
    nextTrack,
    setVolume,
    toggleMute,
  } = usePlayback();

  const [isFusedUI, setIsFusedUI] = useState(false);
  const [autoSeparateProgress, setAutoSeparateProgress] = useState(0);

  // Responsive geometry constants (fits compact micro phones, Galaxy A56 ~384-412px, and desktop cleanly)
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isCompactPhone = viewportW < 365;
  const isNarrow = viewportW < 520;
  const BASE_PILL_W = isCompactPhone ? 200 : isNarrow ? 236 : 254;
  const EXPANDED_PILL_W = isCompactPhone ? 286 : isNarrow ? 316 : 354;
  const PILL_H = isNarrow ? 58 : 66;
  const DROPLET_SIZE = isNarrow ? 54 : 66;
  const REST_OFFSET_X = isCompactPhone ? 156 : isNarrow ? 164 : 190;
  const STAGE_SHIFT_SEPARATED = isCompactPhone ? -34 : isNarrow ? -28 : -42;

  // Real volume 0..100
  const volumePct = isMuted ? 0 : Math.round(volume * 100);
  const prevVolumeRef = useRef<number>(72);
  if (volumePct > 0) {
    prevVolumeRef.current = volumePct;
  }

  // DOM Refs for 60fps zero-rerender physics loop
  const stageShiftRef = useRef<HTMLDivElement>(null);
  const primaryGooRef = useRef<HTMLDivElement>(null);
  const satelliteGooRef = useRef<HTMLDivElement>(null);
  const primaryGlassRef = useRef<HTMLDivElement>(null);
  const satelliteGlassRef = useRef<HTMLDivElement>(null);
  const primaryContentRef = useRef<HTMLDivElement>(null);
  const satelliteContentRef = useRef<HTMLDivElement>(null);
  const satelliteBadgeRef = useRef<HTMLDivElement>(null);
  const volumePanelRef = useRef<HTMLDivElement>(null);
  const miniInfoRef = useRef<HTMLDivElement>(null);
  const artworkDiscRef = useRef<HTMLDivElement>(null);
  const bounceStageRef = useRef<HTMLDivElement>(null);
  const wakePhysicsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    registerMiniPlayerArtwork(artworkDiscRef.current);
    registerMiniPlayerContainer(primaryContentRef.current, bounceStageRef.current);
    return () => {
      registerMiniPlayerArtwork(null);
      registerMiniPlayerContainer(null, null);
    };
  }, [currentTrack?.id]);

  const viscosity = 13;
  const stiffness = 0.15;
  const specular = 0.75;

  const actionsRef = useRef({
    toggleMute,
    setVolume,
    volumePct,
  });
  actionsRef.current = { toggleMute, setVolume, volumePct };

  const phys = useRef({
    pX: 0,
    pY: 0,
    pVx: 0,
    pVy: 0,
    pScaleX: 1,
    pScaleY: 1,
    pScaleVx: 0,
    pScaleVy: 0,
    currentPillW: BASE_PILL_W,
    stageShiftX: STAGE_SHIFT_SEPARATED,

    sX: REST_OFFSET_X,
    sY: 0,
    sVx: 0,
    sVy: 0,
    sTargetX: REST_OFFSET_X,
    sTargetY: 0,
    sScaleX: 1,
    sScaleY: 1,
    sScaleVx: 0,
    sScaleVy: 0,

    isDraggingDroplet: false,
    isAdjustingVolume: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    pointerDownX: 0,
    pointerDownY: 0,
    wasFused: false,
    lastVolumeInteractionTime: 0,
    autoSeparateDelayMs: 2600,
    causticPhase: 0,

    basePillW: BASE_PILL_W,
    expandedPillW: EXPANDED_PILL_W,
    pillH: PILL_H,
    dropletSize: DROPLET_SIZE,
    restOffsetX: REST_OFFSET_X,
    stageShiftSeparated: STAGE_SHIFT_SEPARATED,
  });

  // Sync responsive bounds when screen crosses mobile/desktop width
  useEffect(() => {
    const s = phys.current;
    s.basePillW = BASE_PILL_W;
    s.expandedPillW = EXPANDED_PILL_W;
    s.pillH = PILL_H;
    s.dropletSize = DROPLET_SIZE;
    s.restOffsetX = REST_OFFSET_X;
    s.stageShiftSeparated = STAGE_SHIFT_SEPARATED;
    if (!s.wasFused && !s.isDraggingDroplet) {
      s.sTargetX = REST_OFFSET_X;
      s.sX = REST_OFFSET_X;
      s.currentPillW = BASE_PILL_W;
      s.stageShiftX = STAGE_SHIFT_SEPARATED;
      wakePhysicsRef.current?.();
    }
  }, [BASE_PILL_W, EXPANDED_PILL_W, PILL_H, DROPLET_SIZE, REST_OFFSET_X, STAGE_SHIFT_SEPARATED]);

  const triggerFuse = () => {
    const s = phys.current;
    s.sTargetX = (s.expandedPillW - s.dropletSize) / 2 - 6;
    s.sTargetY = 0;
    s.lastVolumeInteractionTime = performance.now();
    wakePhysicsRef.current?.();
  };

  const triggerSeparate = () => {
    const s = phys.current;
    s.isAdjustingVolume = false;
    s.sTargetX = s.restOffsetX;
    s.sTargetY = 0;
    setAutoSeparateProgress(0);
    wakePhysicsRef.current?.();
  };

  // Main 60fps Liquid Glass Physics & Auto-Separation Loop (sleeps at rest)
  useEffect(() => {
    let rafId = 0;
    let lastCountdownBroadcast = 0;

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(tick);
    };
    wakePhysicsRef.current = schedule;

    const tick = (now: number) => {
      rafId = 0;
      const s = phys.current;
      const k = stiffness;
      const damping = 0.77;

      const dx = s.sX - s.pX;
      const dy = s.sY - s.pY;
      const dist = Math.hypot(dx, dy) || 0.001;
      const nx = dx / dist;
      const ny = dy / dist;

      const isMobile = s.basePillW <= 245;
      const pillHalfSpan = (s.currentPillW - s.pillH) / 2;
      const bridgeThreshold =
        pillHalfSpan + (isMobile ? 34 : 62) + viscosity * (isMobile ? 1.05 : 1.4);
      const dockTargetX = s.pX + (s.expandedPillW - s.dropletSize) / 2 - 6;

      const outerEdge = bridgeThreshold;
      const innerDockDist = Math.abs(dockTargetX - s.pX) + (isMobile ? 6 : 12);
      const minFusionRange = isMobile ? 24 : 36;
      const rawFusion = 1 - (dist - innerDockDist) / Math.max(minFusionRange, outerEdge - innerDockDist);
      const fusionFactor = Math.max(0, Math.min(1, rawFusion));
      const dissolveCurve = fusionFactor * fusionFactor * (3 - 2 * fusionFactor);
      const isCurrentlyFused = fusionFactor > 0.32;

      if (isCurrentlyFused && !s.wasFused) {
        s.wasFused = true;
        s.lastVolumeInteractionTime = now;
        setIsFusedUI(true);

        const impact = 0.13;
        s.pScaleVx -= Math.abs(nx) * impact * 0.75;
        s.pScaleVy += Math.abs(nx) * impact * 0.65;
        s.sScaleVx -= Math.abs(nx) * impact * 1.25;
        s.sScaleVy += Math.abs(nx) * impact * 1.1;
      } else if (!isCurrentlyFused && s.wasFused) {
        s.wasFused = false;
        s.isAdjustingVolume = false;
        setIsFusedUI(false);
        setAutoSeparateProgress(0);

        const snapImpulse = 0.18;
        s.pScaleVx += Math.abs(nx) * snapImpulse * 0.85;
        s.pScaleVy -= Math.abs(nx) * snapImpulse * 0.65;
        s.sScaleVx += Math.abs(nx) * snapImpulse * 1.35;
        s.sScaleVy -= Math.abs(nx) * snapImpulse * 1.1;

        s.pVx -= nx * 2.2;
        if (!s.isDraggingDroplet) {
          s.sVx += nx * 3.1;
        }
      }

      // Auto-Separation Countdown while Fused & Idle
      if (s.wasFused) {
        if (s.isDraggingDroplet || s.isAdjustingVolume) {
          s.lastVolumeInteractionTime = now;
          if (now - lastCountdownBroadcast > 60) {
            lastCountdownBroadcast = now;
            setAutoSeparateProgress(0);
          }
        } else {
          const elapsed = now - s.lastVolumeInteractionTime;
          const ratio = Math.min(1, elapsed / s.autoSeparateDelayMs);
          if (now - lastCountdownBroadcast > 50) {
            lastCountdownBroadcast = now;
            setAutoSeparateProgress(ratio);
          }
          if (elapsed >= s.autoSeparateDelayMs) {
            s.sTargetX = s.restOffsetX;
            s.sTargetY = 0;
          }
        }
      }

      // Surface Tension Pull & Cohesive Docking
      let pTargetX = 0;
      let pTargetY = 0;
      let tensionPullX = 0;
      let tensionPullY = 0;

      const hoverRange = bridgeThreshold + (isMobile ? 12 : 24);
      if (dist < hoverRange) {
        const proximity = Math.max(0, 1 - dist / hoverRange);
        const leanWeight = 1 - dissolveCurve * 0.65;
        pTargetX = nx * proximity * 16 * leanWeight;
        pTargetY = ny * proximity * 12 * leanWeight;

        if (
          !s.isDraggingDroplet &&
          s.sTargetX < s.restOffsetX - 25 &&
          dist < bridgeThreshold - 6
        ) {
          tensionPullX = (dockTargetX - s.sX) * 0.16;
          tensionPullY = (s.pY - s.sY) * 0.16;
        }
      }

      s.pVx = (s.pVx + (pTargetX - s.pX) * (k * 0.9)) * damping;
      s.pVy = (s.pVy + (pTargetY - s.pY) * (k * 0.9)) * damping;
      s.pX += s.pVx;
      s.pY += s.pVy;

      const activeK = s.isDraggingDroplet ? Math.min(0.42, k * 2.1) : k;
      const activeDamp = s.isDraggingDroplet ? 0.68 : damping;
      const forceX = (s.sTargetX - s.sX) * activeK + tensionPullX;
      const forceY = (s.sTargetY - s.sY) * activeK + tensionPullY;

      s.sVx = (s.sVx + forceX) * activeDamp;
      s.sVy = (s.sVy + forceY) * activeDamp;
      s.sX += s.sVx;
      s.sY += s.sVy;

      // Smooth Dynamic Width Morphing & Stage Centering
      const targetPillW = s.basePillW + (s.expandedPillW - s.basePillW) * dissolveCurve;
      s.currentPillW += (targetPillW - s.currentPillW) * 0.22;

      const targetShift = s.stageShiftSeparated * (1 - dissolveCurve);
      s.stageShiftX += (targetShift - s.stageShiftX) * 0.16;
      if (stageShiftRef.current) {
        stageShiftRef.current.style.transform = `translate3d(${s.stageShiftX.toFixed(2)}px, 0, 0)`;
      }

      // Organic Squash, Stretch & Liquid Neck Elongation
      const sSpeed = Math.hypot(s.sVx, s.sVy);
      const velStretch = Math.min(sSpeed * 0.0085, 0.14);
      const bridgeStretch =
        fusionFactor > 0.05 && fusionFactor < 0.85 ? Math.sin(fusionFactor * Math.PI) * 0.15 : 0;

      const targetSScaleX = 1 + velStretch + bridgeStretch;
      const targetSScaleY = 1 - (velStretch + bridgeStretch) * 0.46;

      s.pScaleVx = (s.pScaleVx + (1 - s.pScaleX) * 0.22) * 0.74;
      s.pScaleVy = (s.pScaleVy + (1 - s.pScaleY) * 0.22) * 0.74;
      s.pScaleX += s.pScaleVx;
      s.pScaleY += s.pScaleVy;

      s.sScaleVx = (s.sScaleVx + (targetSScaleX - s.sScaleX) * 0.24) * 0.72;
      s.sScaleVy = (s.sScaleVy + (targetSScaleY - s.sScaleY) * 0.24) * 0.72;
      s.sScaleX += s.sScaleVx;
      s.sScaleY += s.sScaleVy;

      const stretchAngle =
        bridgeStretch > 0.01 ? Math.atan2(dy, dx) : Math.atan2(s.sVy, s.sVx);
      const stretchDeg = (stretchAngle * 180) / Math.PI;

      const pillWStr = `${s.currentPillW.toFixed(1)}px`;
      const pTransform = `translate3d(${s.pX.toFixed(2)}px, ${s.pY.toFixed(2)}px, 0) scale(${s.pScaleX.toFixed(
        4
      )}, ${s.pScaleY.toFixed(4)})`;

      const sGooScale = 1 - dissolveCurve * 0.22;
      const sTransform = `translate3d(${s.sX.toFixed(2)}px, ${s.sY.toFixed(2)}px, 0) rotate(${stretchDeg.toFixed(
        1
      )}deg) scale(${(s.sScaleX * sGooScale).toFixed(4)}, ${(s.sScaleY * sGooScale).toFixed(
        4
      )}) rotate(${(-stretchDeg).toFixed(1)}deg)`;
      const sContentTransform = `translate3d(${s.sX.toFixed(2)}px, ${s.sY.toFixed(2)}px, 0) scale(${(
        (s.sScaleX + s.sScaleY) *
        0.5
      ).toFixed(4)})`;

      if (primaryGooRef.current) {
        primaryGooRef.current.style.width = pillWStr;
        primaryGooRef.current.style.transform = pTransform;
      }
      if (primaryGlassRef.current) {
        primaryGlassRef.current.style.width = pillWStr;
        primaryGlassRef.current.style.transform = pTransform;
        primaryGlassRef.current.style.opacity = (0.88 + dissolveCurve * 0.12).toFixed(3);
      }
      if (primaryContentRef.current) {
        primaryContentRef.current.style.width = pillWStr;
        primaryContentRef.current.style.transform = pTransform;
      }

      if (miniInfoRef.current) {
        const infoOpacity = Math.max(0, 1 - dissolveCurve * 1.45);
        miniInfoRef.current.style.opacity = infoOpacity.toFixed(3);
        miniInfoRef.current.style.transform = `translateX(${(-dissolveCurve * 14).toFixed(
          1
        )}px) scale(${(1 - dissolveCurve * 0.08).toFixed(3)})`;
      }
      if (volumePanelRef.current) {
        const panelOpacity = Math.max(0, (dissolveCurve - 0.35) / 0.65);
        volumePanelRef.current.style.opacity = panelOpacity.toFixed(3);
        volumePanelRef.current.style.transform = `translateX(${((1 - panelOpacity) * 14).toFixed(
          1
        )}px) scale(${(0.92 + panelOpacity * 0.08).toFixed(3)})`;
        volumePanelRef.current.style.pointerEvents = panelOpacity > 0.5 ? 'auto' : 'none';
      }

      if (satelliteGooRef.current) satelliteGooRef.current.style.transform = sTransform;
      if (satelliteGlassRef.current) {
        satelliteGlassRef.current.style.transform = sTransform;
        satelliteGlassRef.current.style.opacity = Math.max(0, 1 - dissolveCurve * 1.15).toFixed(3);
      }
      if (satelliteBadgeRef.current) {
        satelliteBadgeRef.current.style.opacity = Math.max(0, 1 - dissolveCurve * 1.1).toFixed(3);
      }
      if (satelliteContentRef.current) {
        satelliteContentRef.current.style.transform = sContentTransform;
      }

      const settled =
        !s.isDraggingDroplet &&
        !s.isAdjustingVolume &&
        !s.wasFused &&
        Math.abs(s.sTargetX - s.sX) < 0.08 &&
        Math.abs(s.sTargetY - s.sY) < 0.08 &&
        Math.abs(s.sVx) < 0.02 &&
        Math.abs(s.sVy) < 0.02 &&
        Math.abs(s.pX) < 0.08 &&
        Math.abs(s.pVx) < 0.02 &&
        Math.abs(s.currentPillW - s.basePillW) < 0.1 &&
        Math.abs(s.sScaleX - 1) < 0.002 &&
        Math.abs(s.pScaleX - 1) < 0.002;
      if (!settled) {
        rafId = requestAnimationFrame(tick);
      }
    };

    wakePhysicsRef.current();
    return () => {
      wakePhysicsRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  if (!currentTrack) return null;

  const handleDropletPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const s = phys.current;
    s.isDraggingDroplet = true;
    s.pointerDownX = e.clientX;
    s.pointerDownY = e.clientY;
    s.dragOffsetX = e.clientX - s.sX;
    s.dragOffsetY = e.clientY - s.sY;
    s.lastVolumeInteractionTime = performance.now();
    wakePhysicsRef.current?.();
  };

  const handleDropletPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = phys.current;
    if (!s.isDraggingDroplet) return;

    const rawX = e.clientX - s.dragOffsetX;
    const rawY = e.clientY - s.dragOffsetY;

    const maxRadius = s.restOffsetX + 45;
    const dist = Math.hypot(rawX, rawY);
    if (dist > maxRadius) {
      s.sTargetX = (rawX / dist) * maxRadius;
      s.sTargetY = (rawY / dist) * maxRadius;
    } else {
      s.sTargetX = rawX;
      s.sTargetY = rawY;
    }
    s.lastVolumeInteractionTime = performance.now();
  };

  const handleDropletPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = phys.current;
    if (!s.isDraggingDroplet) return;
    s.isDraggingDroplet = false;

    const moved = Math.hypot(e.clientX - s.pointerDownX, e.clientY - s.pointerDownY);
    if (moved < 6) {
      if (!s.wasFused) {
        triggerFuse();
      } else {
        s.lastVolumeInteractionTime = performance.now();
        actionsRef.current.toggleMute();
        s.sScaleVy -= 0.14;
      }
    } else {
      const dist = Math.hypot(s.sX - s.pX, s.sY - s.pY);
      const snapMargin = s.basePillW < 230 ? 24 : 18;
      if (dist < s.restOffsetX - snapMargin) {
        triggerFuse();
      } else {
        triggerSeparate();
      }
    }
  };

  const handleVolumeSliderChange = (nextPct: number) => {
    phys.current.lastVolumeInteractionTime = performance.now();
    if (isMuted && nextPct > 0) {
      toggleMute();
    }
    setVolume(nextPct / 100);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    nextTrack();
    phys.current.pScaleVx += 0.08;
    phys.current.pScaleVy -= 0.06;
    wakePhysicsRef.current?.();
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlay();
    phys.current.pScaleVy -= 0.12;
    wakePhysicsRef.current?.();
  };

  const renderVolumeIcon = (iconClass = 'w-4 h-4') => {
    if (volumePct === 0) return <VolumeX className={iconClass} />;
    if (volumePct < 50) return <Volume1 className={iconClass} />;
    return <Volume2 className={iconClass} />;
  };

  const artworkUrl = currentTrack.album.images[0]?.url;
  const contrast = Math.round(18 + viscosity * 0.45);
  const shift = -(contrast * 0.42).toFixed(2);

  return (
    <div
      ref={bounceStageRef}
      style={{ height: PILL_H }}
      className={`relative w-full flex items-center justify-center select-none pointer-events-none ${className}`}
    >
      {/* SVG Gooey Metaball Filter */}
      <svg className="sr-only" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id={`liquid-fusion-mini-${filterId}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={viscosity} result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${contrast} ${shift}`}
              result="goo"
            />
            <feComposite in="goo" in2="goo" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* Shifting Responsive Stage (keeps Pill + Separated Droplet balanced cleanly in viewport) */}
      <div
        ref={stageShiftRef}
        className="relative flex items-center justify-center pointer-events-auto"
      >
        {/* Subtle Dock Target Indicator when Fused */}
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(${REST_OFFSET_X}px, 0, 0)`,
            width: DROPLET_SIZE + 10,
            height: DROPLET_SIZE + 10,
          }}
          className={`pointer-events-none absolute rounded-full border border-dashed border-white/20 transition-opacity duration-500 ${
            isFusedUI ? 'opacity-45' : 'opacity-0'
          }`}
        />

        {/* LAYER 1: Unified SVG Gooey Metaball Membrane */}
        <div
          aria-hidden="true"
          style={{ filter: `url(#liquid-fusion-mini-${filterId})` }}
          className="pointer-events-none absolute -inset-10 flex items-center justify-center opacity-[0.18]"
        >
          <div
            ref={primaryGooRef}
            style={{ width: BASE_PILL_W, height: PILL_H }}
            className="absolute rounded-full bg-white"
          />
          <div
            ref={satelliteGooRef}
            style={{ width: DROPLET_SIZE, height: DROPLET_SIZE }}
            className="absolute rounded-full bg-white"
          />
        </div>

        {/* LAYER 2: Crisp Specular Rim & Caustic Glass Shells */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {/* Primary Mini-Player Glass Specular Shell */}
          <div
            ref={primaryGlassRef}
            style={{
              width: BASE_PILL_W,
              height: PILL_H,
              backdropFilter: 'blur(12px) saturate(145%)',
              WebkitBackdropFilter: 'blur(12px) saturate(145%)',
              boxShadow: isFrost
                ? 'inset 0 1.5px 2px rgba(255,255,255,0.95), inset 0 -1.5px 2px rgba(15,23,42,0.08), 0 20px 45px -10px rgba(15,23,42,0.18)'
                : `inset 0 1.5px 1.5px rgba(255,255,255,${specular}), inset 0 -1.5px 2px rgba(255,255,255,${
                    specular * 0.3
                  }), 0 24px 52px -12px rgba(0,0,0,0.52)`,
            }}
            className={`absolute rounded-full overflow-hidden border transition-colors duration-500 ${
              isFrost
                ? 'border-slate-300/80 bg-white/80'
                : 'border-white/30 bg-white/[0.06]'
            }`}
          >
            <div
              className={`w-full h-full opacity-45 ${
                isFrost
                  ? 'bg-gradient-to-tr from-sky-300/25 via-transparent to-indigo-300/25'
                  : 'bg-gradient-to-tr from-cyan-400/20 via-transparent to-fuchsia-400/20'
              }`}
            />
          </div>

          {/* Satellite Volume Glass Specular Shell (Dissolves smoothly on fusion) */}
          <div
            ref={satelliteGlassRef}
            style={{
              width: DROPLET_SIZE,
              height: DROPLET_SIZE,
              backdropFilter: 'blur(12px) saturate(145%)',
              WebkitBackdropFilter: 'blur(12px) saturate(145%)',
              boxShadow: isFrost
                ? 'inset 0 1.5px 2px rgba(255,255,255,0.95), inset 0 -1.5px 2px rgba(15,23,42,0.08), 0 18px 40px -10px rgba(15,23,42,0.18)'
                : `inset 0 1.5px 1.5px rgba(255,255,255,${specular}), inset 0 -1.5px 2px rgba(255,255,255,${
                    specular * 0.3
                  }), 0 20px 44px -12px rgba(0,0,0,0.5)`,
            }}
            className={`absolute rounded-full overflow-hidden border transition-colors duration-500 ${
              isFrost
                ? 'border-slate-300/80 bg-white/85'
                : 'border-white/35 bg-white/[0.08]'
            }`}
          >
            <div
              className={`w-full h-full opacity-50 ${
                volumePct === 0
                  ? 'bg-gradient-to-tr from-rose-400/30 to-amber-300/20'
                  : isFrost
                  ? 'bg-gradient-to-tr from-sky-400/25 to-indigo-300/25'
                  : 'bg-gradient-to-tr from-emerald-300/20 to-cyan-200/25'
              }`}
            />
          </div>
        </div>

        {/* LAYER 3: Razor-Sharp Interactive UI Content */}
        <div className="relative flex items-center justify-center">
          {/* Primary Minimized Music Player Pill Content */}
          <div
            ref={primaryContentRef}
            onClick={() => {
              captureTransitionOrigin(artworkDiscRef.current, artworkUrl);
              onOpenFullPlayer();
            }}
            style={{ width: BASE_PILL_W, height: PILL_H }}
            className="relative rounded-full flex items-center px-2.5 sm:px-3 overflow-hidden cursor-pointer"
          >
            {/* Left: Spinning Spatial Album Disc + Play/Pause Button */}
            <div className="flex items-center gap-2 shrink-0 z-10">
              <div
                ref={artworkDiscRef}
                title="Open Liquid Glass Music Player"
                className="relative w-10 h-10 rounded-full flex items-center justify-center shadow-inner bg-gradient-to-tr from-rose-400 via-amber-300 to-fuchsia-500 p-0.5 overflow-hidden"
              >
                <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-950/75 flex items-center justify-center">
                  {artworkUrl && (
                    <img
                      src={artworkUrl}
                      alt={currentTrack.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-70"
                    />
                  )}
                  <Disc3
                    className={`w-5 h-5 text-white relative z-10 ${isPlaying ? 'animate-spin' : ''}`}
                    style={{ animationDuration: '5s' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                  isFrost
                    ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
            </div>

            {/* Center/Right: Dual-State Morphing Zone (Track Info <-> Fused Volume Panel) */}
            <div className="relative flex-1 h-full flex items-center ml-2.5 overflow-hidden">
              {/* STATE A: Compact Track Info & Next Button (Shown when Separated) */}
              <div
                ref={miniInfoRef}
                className="w-full flex items-center justify-between gap-2"
              >
                <div className="min-w-0 leading-tight">
                  <div className={`text-xs font-semibold truncate ${isFrost ? 'text-slate-900' : 'text-white'}`}>
                    {currentTrack.name}
                  </div>
                  <div className={`text-[10px] font-medium truncate flex items-center gap-1 ${
                    isFrost ? 'text-slate-600' : 'text-white/65'
                  }`}>
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                        isPlaying ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]' : 'bg-slate-400'
                      }`}
                    />
                    <span className="truncate">
                      {currentTrack.artists.map((a) => a.name).join(', ')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next track"
                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition active:scale-90 cursor-pointer ${
                    isFrost
                      ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900'
                      : 'bg-white/12 hover:bg-white/25 text-white'
                  }`}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* STATE B: Interactive Liquid Glass Volume Control Panel (Revealed when Fused) */}
              <div
                ref={volumePanelRef}
                onClick={(e) => e.stopPropagation()}
                style={{ opacity: 0, pointerEvents: 'none' }}
                className="absolute inset-0 flex items-center pr-11 sm:pr-12 gap-2"
              >
                <div className="flex-1 flex flex-col justify-center gap-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold px-0.5">
                    <span className={isFrost ? 'text-slate-800' : 'text-white/90'}>Volume</span>
                    <span className={`font-mono ${isFrost ? 'text-slate-600' : 'text-white/75'}`}>{volumePct}%</span>
                  </div>

                  <div className="relative h-4 flex items-center">
                    <div className={`w-full h-2.5 rounded-full overflow-hidden p-[1px] ${
                      isFrost ? 'bg-slate-200' : 'bg-white/15'
                    }`}>
                      <div
                        style={{ width: `${volumePct}%` }}
                        className={`h-full rounded-full transition-[width] duration-75 ${
                          volumePct === 0 ? 'bg-rose-500' : isFrost ? 'bg-slate-900' : 'bg-white'
                        }`}
                      />
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volumePct}
                      aria-label="Adjust volume"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        phys.current.isAdjustingVolume = true;
                        phys.current.lastVolumeInteractionTime = performance.now();
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        phys.current.isAdjustingVolume = false;
                        phys.current.lastVolumeInteractionTime = performance.now();
                      }}
                      onChange={(e) => handleVolumeSliderChange(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle Bottom Track Progress Hairline */}
            <MiniHairlineProgress fallbackDurationMs={currentTrack.duration.milliseconds} isFrost={isFrost} />
          </div>

          {/* Draggable / Clickable Satellite Volume Droplet */}
          <div
            ref={satelliteContentRef}
            onPointerDown={handleDropletPointerDown}
            onPointerMove={handleDropletPointerMove}
            onPointerUp={handleDropletPointerUp}
            onPointerCancel={handleDropletPointerUp}
            onClick={(e) => e.stopPropagation()}
            role="button"
            tabIndex={0}
            aria-label="Volume Liquid Glass Droplet"
            title={isFusedUI ? 'Tap to mute/unmute or drag out' : 'Tap or drag into pill for volume'}
            style={{ width: DROPLET_SIZE, height: DROPLET_SIZE }}
            className="absolute rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none group"
          >
            {/* Auto-Separation Countdown Ring when Fused */}
            {isFusedUI && autoSeparateProgress > 0 && (
              <svg
                className="pointer-events-none absolute w-11 h-11 -rotate-90"
                viewBox="0 0 36 36"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={isFrost ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.15)'}
                  strokeWidth="2"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={isFrost ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.82)'}
                  strokeWidth="2"
                  strokeDasharray="94.2"
                  strokeDashoffset={(94.2 * autoSeparateProgress).toFixed(1)}
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Circular Icon Well Background (Dissolves smoothly when merged into main pill) */}
            <div
              ref={satelliteBadgeRef}
              className={`absolute w-10 h-10 rounded-full transition-transform duration-200 group-hover:scale-110 ${
                volumePct === 0
                  ? isFrost ? 'bg-rose-500/20' : 'bg-rose-500/25'
                  : isFrost ? 'bg-slate-900/10' : 'bg-white/15'
              }`}
            />

            {/* Crisp Foreground Volume Icon */}
            <div
              className={`relative z-10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
                volumePct === 0
                  ? isFrost ? 'text-rose-600' : 'text-rose-400'
                  : isFrost ? 'text-slate-900' : 'text-white'
              }`}
            >
              {renderVolumeIcon('w-4 h-4')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
