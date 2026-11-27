import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Heart,
  Disc3,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  RotateCcw,
  ChevronDown,
  Maximize2,
  Check,
  Loader2,
} from 'lucide-react';
import { usePlayback, usePlaybackProgress } from '../../context/PlaybackContext';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { mockTracks } from '../../data/mockSpotifyCatalog';
import { AudioQuality, Track } from '../../types/spotify';
import { LiquidGlassSlider } from '../Common/LiquidGlassSlider';
import { DownloadButton } from '../Common/DownloadButton';

function formatTimeSeconds(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

interface VelvetMetaballFullPlayerProps {
  onClose: () => void;
  isClosing?: boolean;
}

/**
 * Full-card & mobile Now Playing experience faithfully implementing
 * ios_liquid_glass_metaball_music_player.tsx backed by live ByteMusic playback & library state.
 */
export const VelvetMetaballFullPlayer: React.FC<VelvetMetaballFullPlayerProps> = ({ onClose, isClosing = false }) => {
  const filterId = useId().replace(/:/g, '');
  const {
    currentTrack,
    isPlaying,
    isLoading,
    audioQuality,
    setAudioQuality,
    togglePlay,
    playTrack,
    seek,
    nextTrack,
    prevTrack,
  } = usePlayback();
  const { progressMs, durationMs } = usePlaybackProgress();
  const { isLiked, toggleLike } = useLibrary();
  const { isAurora, isFrost, isSunset, isVelvetLime } = useTheme();

  // Live Liquid Glass Physics Controls (matches reference file defaults)
  const [viscosity, setViscosity] = useState(13);
  const [stiffness, setStiffness] = useState(0.15);
  const [specular, setSpecular] = useState(0.75);
  const [showPhysics, setShowPhysics] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [activeControlIndex, setActiveControlIndex] = useState(1); // 0: Prev, 1: Play/Pause, 2: Next, 3: Like

  // Track selector pills (stable 3-track window so tapping pills never jumps/reorders under finger)
  const [windowStartIdx, setWindowStartIdx] = useState(0);
  const selectorTracks: Track[] = useMemo(() => {
    const sourceList: Track[] = mockTracks;
    if (sourceList.length <= 3) return sourceList;
    return [
      sourceList[windowStartIdx % sourceList.length],
      sourceList[(windowStartIdx + 1) % sourceList.length],
      sourceList[(windowStartIdx + 2) % sourceList.length],
    ];
  }, [windowStartIdx]);

  useEffect(() => {
    if (!currentTrack) return;
    const isVisible = selectorTracks.some((t) => t.id === currentTrack.id);
    if (!isVisible) {
      const idx = mockTracks.findIndex((t) => t.id === currentTrack.id);
      if (idx !== -1) {
        setWindowStartIdx(idx);
      }
    }
  }, [currentTrack, selectorTracks]);

  // Responsive card/scrubber/dock geometry
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 370 : false
  );
  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 370);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const BTN_SIZE = compact ? 48 : 54;
  const BTN_GAP = compact ? 10 : 12;
  const DOCK_PAD = 8;
  const DOCK_STEP = BTN_SIZE + BTN_GAP;
  const DOCK_WIDTH = DOCK_PAD * 2 + 4 * BTN_SIZE + 3 * BTN_GAP;
  const DOCK_HEIGHT = BTN_SIZE + DOCK_PAD * 2;

  const SCRUB_WIDTH = compact ? 256 : 296;
  const SCRUB_HEIGHT = 12;
  const THUMB_SIZE = 28;
  const SCRUB_HALF_SPAN = (SCRUB_WIDTH - THUMB_SIZE) / 2;

  const getDockSlotX = (idx: number, dockW = DOCK_WIDTH, btnS = BTN_SIZE, step = DOCK_STEP) => {
    const startCenter = -dockW / 2 + DOCK_PAD + btnS / 2;
    return startCenter + idx * step;
  };

  // DOM Refs for 60fps zero-rerender physics engine
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const matrixRef = useRef<SVGFEColorMatrixElement>(null);
  const wakePhysicsRef = useRef<(() => void) | null>(null);

  // Card Shell Refs
  const cardGooRef = useRef<HTMLDivElement>(null);
  const cardGlassRef = useRef<HTMLDivElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const vizBarsRef = useRef<(HTMLSpanElement | null)[]>([]);

  // Scrubber Metaball Refs
  const scrubTrackGooRef = useRef<HTMLDivElement>(null);
  const scrubThumbGooRef = useRef<HTMLDivElement>(null);
  const scrubThumbGlassRef = useRef<HTMLDivElement>(null);

  // Transport Dock Metaball Refs
  const dockTrackGooRef = useRef<HTMLDivElement>(null);
  const dockGlassRef = useRef<HTMLDivElement>(null);
  const dockDropletGooRef = useRef<HTMLDivElement>(null);
  const dockDropletGlassRef = useRef<HTMLDivElement>(null);
  const slotGooRefs = useRef<(HTMLDivElement | null)[]>([]);
  const suppressDockClickRef = useRef(false);

  const [scrubDisplaySec, setScrubDisplaySec] = useState<number | null>(null);

  const actionsRef = useRef({
    togglePlay,
    nextTrack,
    prevTrack,
    toggleLike,
    seek,
    currentTrack,
  });
  actionsRef.current = { togglePlay, nextTrack, prevTrack, toggleLike, seek, currentTrack };

  const effectiveDurationSec =
    (durationMs > 0 ? durationMs : currentTrack?.duration.milliseconds || 180000) / 1000;
  const liveProgressRatio =
    durationMs > 0 ? Math.min(1, Math.max(0, progressMs / durationMs)) : 0;

  // Mutable 60fps Physics State
  const phys = useRef({
    cardScaleX: 1,
    cardScaleY: 1,
    cardScaleVx: 0,
    cardScaleVy: 0,
    discAngle: 0,

    progress: liveProgressRatio,
    targetProgress: liveProgressRatio,
    thumbX: -SCRUB_HALF_SPAN + liveProgressRatio * (SCRUB_HALF_SPAN * 2),
    thumbVx: 0,
    thumbScaleX: 1,
    thumbScaleY: 1,
    thumbScaleVx: 0,
    thumbScaleVy: 0,
    isScrubbing: false,

    dX: getDockSlotX(1),
    dVx: 0,
    dTargetX: getDockSlotX(1),
    dScaleX: 1,
    dScaleY: 1,
    dScaleVx: 0,
    dScaleVy: 0,
    isDockDragging: false,
    dockDragOffsetX: 0,
    dockPointerDownX: null as number | null,

    dockPX: 0,
    dockPVx: 0,
    dockPScaleX: 1,
    dockPScaleY: 1,
    dockPScaleVx: 0,
    dockPScaleVy: 0,
    slotScales: [1, 1, 1, 1],
    slotVels: [0, 0, 0, 0],
    wasFusedSlot: 1,

    vizPhase: 0,
    lastFrameTime: performance.now(),
    viscosity,
    stiffness,
    isPlaying,
    durationSec: effectiveDurationSec,
    scrubHalfSpan: SCRUB_HALF_SPAN,
    dockStep: DOCK_STEP,
    dockWidth: DOCK_WIDTH,
    btnSize: BTN_SIZE,
  });

  // Keep layout dimensions synced with physics ref
  useEffect(() => {
    const s = phys.current;
    s.scrubHalfSpan = SCRUB_HALF_SPAN;
    s.dockStep = DOCK_STEP;
    s.dockWidth = DOCK_WIDTH;
    s.btnSize = BTN_SIZE;
    s.dTargetX = getDockSlotX(activeControlIndex, DOCK_WIDTH, BTN_SIZE, DOCK_STEP);
    if (!s.isDockDragging) {
      s.dX = s.dTargetX;
    }
  }, [SCRUB_HALF_SPAN, DOCK_STEP, DOCK_WIDTH, BTN_SIZE, activeControlIndex]);

  useEffect(() => {
    phys.current.viscosity = viscosity;
    if (blurRef.current) {
      blurRef.current.setAttribute('stdDeviation', String(viscosity));
    }
    if (matrixRef.current) {
      const contrast = Math.round(18 + viscosity * 0.45);
      const shift = -(contrast * 0.42).toFixed(2);
      matrixRef.current.setAttribute(
        'values',
        `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${contrast} ${shift}`
      );
    }
  }, [viscosity]);

  useEffect(() => {
    phys.current.stiffness = stiffness;
    wakePhysicsRef.current?.();
  }, [stiffness]);

  useEffect(() => {
    phys.current.isPlaying = isPlaying;
    wakePhysicsRef.current?.();
  }, [isPlaying]);

  useEffect(() => {
    phys.current.durationSec = effectiveDurationSec;
    wakePhysicsRef.current?.();
  }, [effectiveDurationSec]);

  useEffect(() => {
    phys.current.targetProgress = liveProgressRatio;
    wakePhysicsRef.current?.();
  }, [liveProgressRatio]);

  // Trigger subtle card jiggle when track changes externally
  const prevTrackIdRef = useRef(currentTrack?.id);
  useEffect(() => {
    if (currentTrack?.id && prevTrackIdRef.current !== currentTrack.id) {
      prevTrackIdRef.current = currentTrack.id;
      phys.current.progress = 0;
      phys.current.targetProgress = 0;
      phys.current.thumbScaleVx += 0.22;
      phys.current.thumbScaleVy -= 0.16;
      phys.current.cardScaleVx += 0.032;
      phys.current.cardScaleVy -= 0.024;
      wakePhysicsRef.current?.();
    }
  }, [currentTrack?.id]);

  // Main 60fps Liquid Glass Physics & Audio Visualizer Loop (sleeps when paused & settled)
  useEffect(() => {
    let rafId = 0;

    const schedule = () => {
      if (!rafId) {
        phys.current.lastFrameTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };
    wakePhysicsRef.current = schedule;

    const tick = (now: number) => {
      rafId = 0;
      const s = phys.current;
      const dt = Math.min(0.05, (now - s.lastFrameTime) / 1000);
      s.lastFrameTime = now;

      const k = s.stiffness;
      const damping = 0.76;

      // 1. Playback Progress Smoothing & Disc Rotation
      if (s.isPlaying) {
        s.discAngle = (s.discAngle + dt * 28) % 360;
      }
      if (!s.isScrubbing) {
        if (s.isPlaying && s.durationSec > 0) {
          s.progress += dt / s.durationSec;
        }
        // Converge cleanly onto real audio progressMs without drift
        s.progress += (s.targetProgress - s.progress) * 0.22;
        s.progress = Math.max(0, Math.min(1, s.progress));
      }

      if (discRef.current) {
        discRef.current.style.transform = `rotate(${s.discAngle.toFixed(2)}deg)`;
      }

      // 2. Live Frequency Visualizer Bars
      s.vizPhase += s.isPlaying ? 0.14 : 0.025;
      for (let i = 0; i < 16; i++) {
        const barEl = vizBarsRef.current[i];
        if (barEl) {
          const wave =
            Math.sin(s.vizPhase + i * 0.55) * 0.38 +
            Math.cos(s.vizPhase * 1.6 - i * 0.85) * 0.32 +
            0.45;
          const level = s.isPlaying ? Math.max(0.18, Math.min(1, wave)) : 0.16;
          barEl.style.transform = `scaleY(${level.toFixed(3)})`;
        }
      }

      // 3. Main Player Card Squash/Stretch Spring
      s.cardScaleVx = (s.cardScaleVx + (1 - s.cardScaleX) * 0.2) * 0.75;
      s.cardScaleVy = (s.cardScaleVy + (1 - s.cardScaleY) * 0.2) * 0.75;
      s.cardScaleX += s.cardScaleVx;
      s.cardScaleY += s.cardScaleVy;

      const cardTransform = `scale(${s.cardScaleX.toFixed(4)}, ${s.cardScaleY.toFixed(4)})`;
      if (cardGooRef.current) cardGooRef.current.style.transform = cardTransform;
      if (cardGlassRef.current) cardGlassRef.current.style.transform = cardTransform;
      if (cardContentRef.current) cardContentRef.current.style.transform = cardTransform;

      // 4. Scrubber Metaball Progress Droplet Physics
      const halfSpan = s.scrubHalfSpan;
      const targetThumbX = -halfSpan + s.progress * (halfSpan * 2);
      const scrubK = s.isScrubbing ? 0.44 : Math.max(0.16, k * 1.35);
      const scrubDamp = s.isScrubbing ? 0.66 : 0.74;

      s.thumbVx = (s.thumbVx + (targetThumbX - s.thumbX) * scrubK) * scrubDamp;
      s.thumbX += s.thumbVx;

      const thumbSpeed = Math.abs(s.thumbVx);
      const thumbStretch = Math.min(thumbSpeed * 0.032, 0.42) + (s.isScrubbing ? 0.12 : 0);
      const targetThumbScaleX = 1 + thumbStretch;
      const targetThumbScaleY = 1 - thumbStretch * 0.36;

      s.thumbScaleVx = (s.thumbScaleVx + (targetThumbScaleX - s.thumbScaleX) * 0.25) * 0.72;
      s.thumbScaleVy = (s.thumbScaleVy + (targetThumbScaleY - s.thumbScaleY) * 0.25) * 0.72;
      s.thumbScaleX += s.thumbScaleVx;
      s.thumbScaleY += s.thumbScaleVy;

      const thumbTransform = `translate3d(${s.thumbX.toFixed(2)}px, 0, 0) scale(${s.thumbScaleX.toFixed(
        4
      )}, ${s.thumbScaleY.toFixed(4)})`;
      if (scrubThumbGooRef.current) scrubThumbGooRef.current.style.transform = thumbTransform;
      if (scrubThumbGlassRef.current) scrubThumbGlassRef.current.style.transform = thumbTransform;

      // 5. Transport Dock Two-Component Metaball Fusion Physics
      const dx = s.dTargetX - s.dX;
      const dist = Math.abs(dx);

      let tensionPull = 0;
      if (!s.isDockDragging && dist < 42 && dist > 0.1) {
        tensionPull = dx * 0.15;
      }

      const activeK = s.isDockDragging ? Math.min(0.42, k * 2.2) : k;
      const activeDamp = s.isDockDragging ? 0.68 : damping;
      s.dVx = (s.dVx + dx * activeK + tensionPull) * activeDamp;
      s.dX += s.dVx;

      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < 4; i++) {
        const dSlot = Math.abs(s.dX - getDockSlotX(i, s.dockWidth, s.btnSize, s.dockStep));
        if (dSlot < nearestDist) {
          nearestDist = dSlot;
          nearestIdx = i;
        }
      }

      const bridgeThreshold = 46 + s.viscosity * 0.75;
      const isFused = nearestDist < bridgeThreshold;
      const currentFusedSlot = isFused ? nearestIdx : -1;

      if (currentFusedSlot !== s.wasFusedSlot) {
        if (s.wasFusedSlot !== -1) {
          s.slotVels[s.wasFusedSlot] += 0.14;
        }
        if (currentFusedSlot !== -1) {
          s.slotVels[currentFusedSlot] -= 0.16;
          s.dScaleVx -= 0.12;
          s.dScaleVy += 0.1;
        }
        s.wasFusedSlot = currentFusedSlot;
      }

      const dSpeed = Math.abs(s.dVx);
      const velStretch = Math.min(dSpeed * 0.022, 0.34);
      const bridgeStretch =
        !isFused && nearestDist < bridgeThreshold + 18 ? 0.18 : Math.min(dist / s.dockStep, 1) * 0.14;

      const targetDScaleX = 1 + velStretch + bridgeStretch;
      const targetDScaleY = 1 - (velStretch + bridgeStretch) * 0.42;

      s.dScaleVx = (s.dScaleVx + (targetDScaleX - s.dScaleX) * 0.24) * 0.72;
      s.dScaleVy = (s.dScaleVy + (targetDScaleY - s.dScaleY) * 0.24) * 0.72;
      s.dScaleX += s.dScaleVx;
      s.dScaleY += s.dScaleVy;

      for (let i = 0; i < 4; i++) {
        const slotX = getDockSlotX(i, s.dockWidth, s.btnSize, s.dockStep);
        const distToSlot = Math.abs(s.dX - slotX);
        const proximity = Math.max(0, 1 - distToSlot / bridgeThreshold);
        const targetSlotScale = 1 + proximity * 0.12;

        s.slotVels[i] = (s.slotVels[i] + (targetSlotScale - s.slotScales[i]) * 0.24) * 0.72;
        s.slotScales[i] += s.slotVels[i];

        const slotEl = slotGooRefs.current[i];
        if (slotEl) {
          slotEl.style.transform = `translate3d(${slotX}px, 0, 0) scale(${s.slotScales[i].toFixed(4)})`;
        }
      }

      // Outer transport dock recoil
      s.dockPVx = (s.dockPVx + (0 - s.dockPX) * 0.18) * 0.74;
      s.dockPX += s.dockPVx;
      s.dockPScaleVx = (s.dockPScaleVx + (1 - s.dockPScaleX) * 0.22) * 0.74;
      s.dockPScaleVy = (s.dockPScaleVy + (1 - s.dockPScaleY) * 0.22) * 0.74;
      s.dockPScaleX += s.dockPScaleVx;
      s.dockPScaleY += s.dockPScaleVy;

      const dockTrackTransform = `translate3d(${s.dockPX.toFixed(2)}px, 0, 0) scale(${s.dockPScaleX.toFixed(
        4
      )}, ${s.dockPScaleY.toFixed(4)})`;
      const dockDropletTransform = `translate3d(${s.dX.toFixed(2)}px, 0, 0) scale(${s.dScaleX.toFixed(
        4
      )}, ${s.dScaleY.toFixed(4)})`;

      if (dockTrackGooRef.current) dockTrackGooRef.current.style.transform = dockTrackTransform;
      if (dockGlassRef.current) dockGlassRef.current.style.transform = dockTrackTransform;
      if (dockDropletGooRef.current) dockDropletGooRef.current.style.transform = dockDropletTransform;
      if (dockDropletGlassRef.current) dockDropletGlassRef.current.style.transform = dockDropletTransform;

      const settled =
        !s.isPlaying &&
        !s.isScrubbing &&
        !s.isDockDragging &&
        Math.abs(s.targetProgress - s.progress) < 0.0005 &&
        Math.abs(s.thumbVx) < 0.02 &&
        Math.abs(s.dTargetX - s.dX) < 0.08 &&
        Math.abs(s.dVx) < 0.02 &&
        Math.abs(s.cardScaleX - 1) < 0.001 &&
        Math.abs(s.cardScaleVx) < 0.001 &&
        Math.abs(s.thumbScaleX - 1) < 0.002 &&
        Math.abs(s.dScaleX - 1) < 0.002;
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

  const isCurrentLiked = isLiked(currentTrack.id);
  const artworkUrl = currentTrack.album.images[0]?.url;

  const pulsePlayerCard = (ix = 0.025, iy = -0.02) => {
    phys.current.cardScaleVx += ix;
    phys.current.cardScaleVy += iy;
  };

  const handleSelectTrackPill = (track: Track) => {
    playTrack(track, mockTracks);
    phys.current.thumbScaleVx += 0.22;
    phys.current.thumbScaleVy -= 0.16;
    pulsePlayerCard(0.032, -0.024);
  };

  // Transport Control Selection (Click or Scrub Snap)
  const triggerControlAction = (index: number) => {
    const s = phys.current;
    const prevX = s.dX;
    const nextX = getDockSlotX(index, s.dockWidth, s.btnSize, s.dockStep);
    const dir = Math.sign(nextX - prevX) || 1;

    setActiveControlIndex(index);
    s.dTargetX = nextX;

    // Launch & collision jiggle impulse
    s.dScaleVx += 0.18;
    s.dScaleVy -= 0.13;
    s.dockPVx += dir * 1.6;
    s.dockPScaleVx += 0.02;
    s.dockPScaleVy -= 0.014;

    if (index === 0) {
      actionsRef.current.prevTrack();
      pulsePlayerCard(0.032, -0.024);
    } else if (index === 1) {
      actionsRef.current.togglePlay();
      pulsePlayerCard(-0.022, 0.026);
    } else if (index === 2) {
      actionsRef.current.nextTrack();
      pulsePlayerCard(0.032, -0.024);
    } else if (index === 3 && actionsRef.current.currentTrack) {
      actionsRef.current.toggleLike(actionsRef.current.currentTrack);
      pulsePlayerCard(0.02, -0.018);
    }
    wakePhysicsRef.current?.();
  };

  // Scrubber Pointer Interactions (Click anywhere on bar OR drag droplet)
  const updateProgressFromClientX = (clientX: number, rect: DOMRect) => {
    const halfSpan = phys.current.scrubHalfSpan;
    const centerX = rect.left + rect.width / 2;
    const relX = Math.max(-halfSpan, Math.min(halfSpan, clientX - centerX));
    const ratio = (relX + halfSpan) / (halfSpan * 2);
    phys.current.progress = ratio;
    phys.current.targetProgress = ratio;
    setScrubDisplaySec(ratio * effectiveDurationSec);
    return ratio;
  };

  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    phys.current.isScrubbing = true;
    phys.current.thumbScaleVy -= 0.18;
    updateProgressFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
    wakePhysicsRef.current?.();
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!phys.current.isScrubbing) return;
    updateProgressFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  const handleScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!phys.current.isScrubbing) return;
    const ratio = updateProgressFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
    phys.current.isScrubbing = false;
    phys.current.thumbScaleVx += 0.24;
    phys.current.thumbScaleVy -= 0.18;
    setScrubDisplaySec(null);
    seek(ratio * (durationMs > 0 ? durationMs : currentTrack.duration.milliseconds));
  };

  // Transport Dock Drag-Scrub Support (captures > 6px so clicks always fire cleanly without double-toggle)
  const handleDockPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    phys.current.dockPointerDownX = e.clientX;
    phys.current.dockDragOffsetX = e.clientX - phys.current.dX;
    wakePhysicsRef.current?.();
  };

  const handleDockPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (phys.current.dockPointerDownX === null) return;
    const moved = Math.abs(e.clientX - phys.current.dockPointerDownX);

    if (!phys.current.isDockDragging && moved > 14) {
      phys.current.isDockDragging = true;
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {}
    }

    if (phys.current.isDockDragging) {
      const minX = getDockSlotX(0, phys.current.dockWidth, phys.current.btnSize, phys.current.dockStep);
      const maxX = getDockSlotX(3, phys.current.dockWidth, phys.current.btnSize, phys.current.dockStep);
      const rawX = e.clientX - phys.current.dockDragOffsetX;
      phys.current.dTargetX = Math.max(minX, Math.min(maxX, rawX));
    }
  };

  const handleDockPointerUp = () => {
    const wasDragging = phys.current.isDockDragging;
    phys.current.isDockDragging = false;
    phys.current.dockPointerDownX = null;

    if (wasDragging) {
      // Suppress trailing native onClick so togglePlay doesn't double-fire!
      suppressDockClickRef.current = true;
      setTimeout(() => {
        suppressDockClickRef.current = false;
      }, 400);

      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < 4; i++) {
        const d = Math.abs(
          phys.current.dX -
            getDockSlotX(i, phys.current.dockWidth, phys.current.btnSize, phys.current.dockStep)
        );
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      triggerControlAction(nearestIdx);
    }
  };

  const handleResetPhysics = () => {
    setViscosity(13);
    setStiffness(0.15);
    setSpecular(0.75);
    pulsePlayerCard(0.03, -0.025);
  };

  const controlButtons = [
    { id: 'prev', label: 'Previous Track', icon: SkipBack },
    { id: 'play', label: isPlaying ? 'Pause' : 'Play', icon: isPlaying ? Pause : Play },
    { id: 'next', label: 'Next Track', icon: SkipForward },
    { id: 'like', label: isCurrentLiked ? 'Unlike Track' : 'Like Track', icon: Heart },
  ];

  const displayedSeconds =
    scrubDisplaySec !== null ? scrubDisplaySec : Math.floor(progressMs / 1000);

  const isLight = isFrost;
  const [dragY, setDragY] = useState(0);
  const swipeStartRef = useRef<{ y: number; t: number } | null>(null);

  const handleSwipeStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    swipeStartRef.current = { y: e.clientY, t: performance.now() };
  };

  const handleSwipeMove = (e: React.PointerEvent) => {
    if (!swipeStartRef.current) return;
    const dy = Math.max(0, e.clientY - swipeStartRef.current.y);
    if (dy > 6) setDragY(dy);
  };

  const handleSwipeEnd = () => {
    if (!swipeStartRef.current) return;
    const elapsed = Math.max(1, performance.now() - swipeStartRef.current.t);
    const velocity = dragY / elapsed;
    swipeStartRef.current = null;
    if (dragY > 95 || velocity > 0.5) {
      setDragY(0);
      onClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <div
      style={{
        paddingTop: 'calc(18px + var(--safe-top, 0px))',
        paddingBottom: 'calc(20px + var(--safe-bottom, 0px))',
        ...(dragY > 0 ? { transform: `translate3d(0, ${dragY}px, 0)`, transition: 'none' } : {}),
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between select-none font-sans overflow-y-auto scrollbar-none px-4 sm:px-6 transition-colors duration-300 ${
        isClosing ? 'anim-player-sheet-out' : 'anim-player-sheet-in'
      } ${
        isFrost
          ? 'bg-[#eef4fb] text-slate-900'
          : isAurora
          ? 'bg-[#091522] text-white'
          : isVelvetLime
          ? 'bg-[#0b0b14] text-white'
          : 'bg-[#150716] text-white'
      }`}
    >
      {/* Backdrop dismiss on desktop click outside */}
      <div className="hidden md:block fixed inset-0 cursor-pointer z-0" onClick={onClose} />

      {/* SVG Gooey Metaball Filter */}
      <svg className="sr-only" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id={`liquid-fusion-${filterId}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur
              ref={blurRef}
              in="SourceGraphic"
              stdDeviation={viscosity}
              result="blur"
            />
            <feColorMatrix
              ref={matrixRef}
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
              result="goo"
            />
            <feComposite in="goo" in2="goo" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* GPU-Fast Static Spatial Wallpaper (Zero animated blur-115px orbs -> eliminates flicker) */}
      <div
        aria-hidden="true"
        style={{
          backgroundImage: isAurora
            ? 'radial-gradient(circle 480px at 22% 8%, rgba(52,211,153,0.36) 0%, transparent 70%), radial-gradient(circle 440px at 82% 28%, rgba(99,102,241,0.30) 0%, transparent 70%), radial-gradient(circle 420px at 20% 88%, rgba(34,211,238,0.28) 0%, transparent 70%), radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)'
            : isFrost
            ? 'radial-gradient(circle 440px at 25% 15%, rgba(56,189,248,0.30) 0%, transparent 70%), radial-gradient(circle 440px at 80% 82%, rgba(129,140,248,0.26) 0%, transparent 70%), radial-gradient(rgba(15,23,42,0.10) 1px, transparent 1px)'
            : isVelvetLime
            ? 'radial-gradient(circle 480px at 14% 10%, rgba(217,70,239,0.34) 0%, rgba(168,85,247,0.18) 40%, transparent 72%), radial-gradient(circle 440px at 88% 82%, rgba(210,248,67,0.12) 0%, rgba(139,92,246,0.18) 45%, transparent 72%), radial-gradient(rgba(255,255,255,0.11) 1px, transparent 1px)'
            : 'radial-gradient(circle 480px at 75% 10%, rgba(244,63,94,0.32) 0%, transparent 70%), radial-gradient(circle 440px at 12% 45%, rgba(245,158,11,0.20) 0%, transparent 70%), radial-gradient(circle 440px at 82% 88%, rgba(217,70,239,0.30) 0%, transparent 70%), radial-gradient(rgba(255,255,255,0.11) 1px, transparent 1px)',
          backgroundSize: isFrost
            ? 'auto, auto, 24px 24px'
            : isAurora || isVelvetLime || !isFrost
            ? 'auto, auto, auto, 24px 24px'
            : '24px 24px',
        }}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Top Header: Status + Minimize & Quality */}
      <header
        onPointerDown={handleSwipeStart}
        onPointerMove={handleSwipeMove}
        onPointerUp={handleSwipeEnd}
        onPointerCancel={handleSwipeEnd}
        className="relative z-20 w-full max-w-2xl flex items-center justify-between gap-3 touch-none"
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Minimize Now Playing"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
              isFrost
                ? 'bg-slate-900/10 hover:bg-slate-900/20 border border-slate-300 text-slate-900'
                : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
            }`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <span className={`text-xs font-semibold uppercase tracking-widest ${isFrost ? 'text-slate-800' : 'text-white/90'}`}>
            Player
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
              isPlaying
                ? isFrost
                  ? 'bg-emerald-500/15 text-emerald-800 border-emerald-400/30'
                  : 'bg-emerald-400/20 text-emerald-200 border-emerald-300/35'
                : isFrost
                ? 'bg-slate-200/70 text-slate-700 border-slate-300/60'
                : 'bg-white/10 text-white/60 border-white/15'
            }`}
          >
            {isLoading ? 'Buffering' : isPlaying ? 'Live' : 'Paused'}
          </span>
        </div>

        {/* Bitrate Quality Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowQualityMenu((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
              isFrost
                ? 'border-slate-300 bg-white/80 hover:bg-white text-slate-900'
                : 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Sliders className={`w-3.5 h-3.5 ${isFrost ? 'text-sky-600' : 'text-[#D2F843]'}`} />
            <span>
              {audioQuality === 'very_high'
                ? '320k'
                : audioQuality === 'high'
                ? '256k'
                : audioQuality === 'normal'
                ? '160k'
                : '96k'}
            </span>
          </button>

          {showQualityMenu && (
            <div className={`absolute right-0 mt-2 w-44 rounded-2xl backdrop-blur-2xl border shadow-2xl p-1.5 z-50 text-xs ${
              isFrost ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60' : 'bg-[#161721]/95 border-white/20 text-white'
            }`}>
              {[
                { id: 'very_high', label: 'Very High', rate: '320 kbps' },
                { id: 'high', label: 'High', rate: '256 kbps' },
                { id: 'normal', label: 'Normal', rate: '160 kbps' },
                { id: 'low', label: 'Low', rate: '96 kbps' },
              ].map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setAudioQuality(q.id as AudioQuality);
                    setShowQualityMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition ${
                    audioQuality === q.id
                      ? isFrost
                        ? 'bg-slate-900/10 text-slate-950 font-bold'
                        : 'bg-white/15 text-[#D2F843] font-bold'
                      : isFrost
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <span>{q.label}</span>
                  <span className="flex items-center gap-1 opacity-75">
                    {q.rate}
                    {audioQuality === q.id && <Check size={13} />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Center Stage: Liquid Glass Music Player Card + Metaball Transport Dock */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-md my-3 gap-5 pointer-events-none">
        {/* MAIN LIQUID GLASS PLAYER CARD */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-[348px] max-w-full flex items-center justify-center pointer-events-auto"
        >
          {/* LAYER 1: Ambient Translucent Liquid Membrane (CSS-composited to prevent SVG blur tearing on scale) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]">
            <div ref={cardGooRef} className="w-full h-full rounded-[38px] bg-white will-change-transform" />
          </div>

          {/* LAYER 2: Specular Glass Shell & Animated Caustics */}
          <div
            ref={cardGlassRef}
            style={{
              backdropFilter: 'blur(12px) saturate(145%)',
              WebkitBackdropFilter: 'blur(12px) saturate(145%)',
              boxShadow: `inset 0 1.5px 1.5px rgba(255,255,255,${specular}), inset 0 -1.5px 2px rgba(255,255,255,${
                specular * 0.3
              }), 0 28px 60px -14px rgba(0,0,0,0.55)`,
            }}
            className="pointer-events-none absolute inset-0 rounded-[38px] overflow-hidden border border-white/30 bg-white/[0.05] transition-colors duration-300 will-change-transform"
          >
            <div
              className="w-full h-full opacity-45 bg-gradient-to-tr from-cyan-400/20 via-transparent to-fuchsia-400/20"
            />
          </div>

          {/* LAYER 3: Razor-Sharp Interactive Player Content */}
          <div
            ref={cardContentRef}
            className="relative z-10 w-full px-5 sm:px-6 py-6 flex flex-col items-center will-change-transform"
          >
            {/* Track Selector Pills */}
            <div className="w-full flex items-center justify-between gap-1.5 mb-5">
              {selectorTracks.map((track) => {
                const active = track.id === currentTrack.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleSelectTrackPill(track)}
                    title={track.name}
                    className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-semibold truncate transition-all cursor-pointer border ${
                      active
                        ? isFrost
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-950 border-white shadow-sm'
                        : isFrost
                        ? 'bg-white/70 text-slate-700 border-slate-300/80 hover:bg-white'
                        : 'bg-white/10 text-white/75 border-white/15 hover:bg-white/20'
                    }`}
                  >
                    {track.name}
                  </button>
                );
              })}
            </div>

            {/* Glowing Spatial Vinyl Disc */}
            <div className="relative flex items-center justify-center my-1">
              {/* Ambient Spectral Halo */}
              <div
                style={{ backgroundColor: 'rgba(217, 70, 239, 0.38)' }}
                className={`absolute w-36 h-36 rounded-full blur-2xl transition-all duration-700 ${
                  isPlaying ? 'opacity-90 scale-105' : 'opacity-35 scale-95'
                }`}
              />

              {/* Rotating Spatial Album Art / Vinyl Disc */}
              <div
                ref={discRef}
                className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-rose-400 via-amber-300 to-fuchsia-500 p-1 shadow-xl flex items-center justify-center"
              >
                <div className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden bg-slate-950/65 backdrop-blur-md">
                  {artworkUrl && (
                    <img
                      src={artworkUrl}
                      alt={currentTrack.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-55"
                    />
                  )}
                  <div className="absolute inset-0 bg-slate-950/35" />
                  {/* Concentric Vinyl Grooves */}
                  <div className="absolute inset-2.5 rounded-full border border-white/20" />
                  <div className="absolute inset-5 rounded-full border border-white/20" />
                  <Disc3 className="w-10 h-10 text-white/95 relative z-10 drop-shadow" />
                </div>
              </div>
            </div>

            {/* Track Title, Artist & 16-Bar Live Frequency Visualizer */}
            <div className="text-center mt-4 w-full">
              <h1 className={`text-xl font-bold tracking-tight truncate px-2 ${isFrost ? 'text-slate-900' : 'text-white'}`}>
                {currentTrack.name}
              </h1>
              <p className={`text-xs font-medium mt-0.5 truncate px-2 ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>
                {currentTrack.artists.map((a) => a.name).join(', ')} • Lossless Audio
              </p>

              {/* 16-Bar Live Audio Visualizer */}
              <div
                aria-hidden="true"
                className="flex items-end justify-center gap-1 h-6 mt-3 px-6"
              >
                {Array.from({ length: 16 }).map((_, idx) => (
                  <span
                    key={idx}
                    ref={(el) => {
                      vizBarsRef.current[idx] = el;
                    }}
                    style={{ transformOrigin: 'bottom' }}
                    className={`w-1 h-full rounded-full transition-colors duration-300 ${isFrost ? 'bg-slate-900/75' : 'bg-white/85'}`}
                  />
                ))}
              </div>
            </div>

            {/* METABALL LIQUID GLASS SCRUBBER / PROGRESS BAR */}
            <div className="w-full mt-4 flex flex-col items-center">
              <div
                role="slider"
                tabIndex={0}
                aria-label="Track Progress Scrubber"
                aria-valuemin={0}
                aria-valuemax={Math.round(effectiveDurationSec)}
                aria-valuenow={Math.round(displayedSeconds)}
                onPointerDown={handleScrubPointerDown}
                onPointerMove={handleScrubPointerMove}
                onPointerUp={handleScrubPointerUp}
                onPointerCancel={handleScrubPointerUp}
                style={{ width: SCRUB_WIDTH, height: THUMB_SIZE + 8 }}
                className="relative flex items-center justify-center cursor-pointer touch-none"
              >
                {/* Scrubber Layer 1: SVG Gooey Metaball Track + Stretching Droplet */}
                <div
                  style={{ filter: `url(#liquid-fusion-${filterId})` }}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.28]"
                >
                  <div
                    ref={scrubTrackGooRef}
                    style={{ width: SCRUB_WIDTH, height: SCRUB_HEIGHT }}
                    className="absolute rounded-full bg-white"
                  />
                  <div
                    ref={scrubThumbGooRef}
                    style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                    className="absolute rounded-full bg-white"
                  />
                </div>

                {/* Scrubber Layer 2: Crisp Specular Glass Groove & Droplet Thumb */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    style={{ width: SCRUB_WIDTH, height: SCRUB_HEIGHT }}
                    className={`absolute rounded-full border ${isFrost ? 'bg-slate-300/50 border-slate-400/40' : 'bg-white/15 border-white/30'}`}
                  />
                  <div
                    ref={scrubThumbGlassRef}
                    style={{
                      width: THUMB_SIZE,
                      height: THUMB_SIZE,
                      backdropFilter: 'blur(12px) saturate(185%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(185%)',
                      boxShadow: `inset 0 1.5px 1px rgba(255,255,255,0.85), 0 6px 16px rgba(0,0,0,0.5)`,
                    }}
                    className={`absolute rounded-full border ${isFrost ? 'bg-white/90 border-slate-300 shadow-sm' : 'bg-white/30 border-white/70'}`}
                  />
                </div>
              </div>

              {/* Elapsed, BPM & Remaining Timestamps */}
              <div
                style={{ width: SCRUB_WIDTH }}
                className={`flex items-center justify-between text-[11px] font-mono font-semibold mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/70'}`}
              >
                <span>{formatTimeSeconds(displayedSeconds)}</span>
                <span className="flex items-center gap-1 opacity-75">
                  <Volume2 className="w-3 h-3" />
                  {currentTrack.bpm || 116} BPM
                </span>
                <span>-{formatTimeSeconds(Math.max(0, effectiveDurationSec - displayedSeconds))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* METABALL TRANSPORT CONTROL DOCK (Previous, Play/Pause, Next, Favorite) */}
        <nav
          aria-label="Playback Transport Controls"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={handleDockPointerDown}
          onPointerMove={handleDockPointerMove}
          onPointerUp={handleDockPointerUp}
          onPointerCancel={handleDockPointerUp}
          style={{ width: DOCK_WIDTH, height: DOCK_HEIGHT }}
          className="relative flex items-center justify-center touch-none pointer-events-auto"
        >
          {/* LAYER 1: Unified SVG Gooey Metaball Membrane */}
          <div
            style={{ filter: `url(#liquid-fusion-${filterId})` }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.16] transition-opacity duration-500"
          >
            <div
              ref={dockTrackGooRef}
              style={{ width: DOCK_WIDTH, height: DOCK_HEIGHT }}
              className="absolute rounded-full bg-white"
            />
            {controlButtons.map((btn, idx) => (
              <div
                key={btn.id}
                ref={(el) => {
                  slotGooRefs.current[idx] = el;
                }}
                style={{
                  width: BTN_SIZE * 0.84,
                  height: BTN_SIZE * 0.84,
                  transform: `translate3d(${getDockSlotX(idx)}px, 0, 0)`,
                }}
                className="absolute rounded-full bg-white"
              />
            ))}
            <div
              ref={dockDropletGooRef}
              style={{ width: BTN_SIZE, height: BTN_SIZE }}
              className="absolute rounded-full bg-white"
            />
          </div>

          {/* LAYER 2: Crisp Specular Rim & Caustic Glass Shells */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              ref={dockGlassRef}
              style={{
                width: DOCK_WIDTH,
                height: DOCK_HEIGHT,
                backdropFilter: 'blur(12px) saturate(145%)',
                WebkitBackdropFilter: 'blur(12px) saturate(145%)',
                boxShadow: `inset 0 1.5px 1.5px rgba(255,255,255,${specular}), inset 0 -1.5px 2px rgba(255,255,255,${
                  specular * 0.3
                }), 0 24px 52px -12px rgba(0,0,0,0.52)`,
              }}
              className="absolute rounded-full overflow-hidden border border-white/30 bg-white/[0.05] transition-colors duration-300"
            >
              <div
                className="w-full h-full opacity-45 bg-gradient-to-tr from-cyan-400/20 via-transparent to-fuchsia-400/20"
              />
            </div>

            <div
              ref={dockDropletGlassRef}
              style={{
                width: BTN_SIZE,
                height: BTN_SIZE,
                backdropFilter: 'blur(12px) saturate(145%)',
                WebkitBackdropFilter: 'blur(12px) saturate(145%)',
                boxShadow: `inset 0 1.5px 1.5px rgba(255,255,255,${Math.min(
                  1,
                  specular + 0.15
                )}), inset 0 -1.5px 2px rgba(255,255,255,${
                  specular * 0.35
                }), 0 12px 28px -6px rgba(0,0,0,0.55)`,
              }}
              className="absolute rounded-full overflow-hidden border border-white/45 bg-white/15 transition-colors duration-300"
            >
              <div
                className="w-full h-full opacity-55 bg-gradient-to-tr from-emerald-300/25 via-transparent to-cyan-200/30"
              />
            </div>
          </div>

          {/* LAYER 3: Razor-Sharp Interactive Transport Icons */}
          <div
            style={{ gap: BTN_GAP, padding: DOCK_PAD }}
            className="relative z-10 flex items-center justify-center"
          >
            {controlButtons.map((btn, idx) => {
              const Icon = btn.icon;
              const isSelected = activeControlIndex === idx;
              const isHeartActive = btn.id === 'like' && isCurrentLiked;

              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (suppressDockClickRef.current) {
                      suppressDockClickRef.current = false;
                      return;
                    }
                    triggerControlAction(idx);
                  }}
                  aria-label={btn.label}
                  style={{ width: BTN_SIZE, height: BTN_SIZE }}
                  className={`relative rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 ${
                    isHeartActive
                      ? 'text-rose-500 scale-110'
                      : isSelected
                      ? isFrost
                        ? 'text-slate-950 scale-110'
                        : 'text-white scale-110'
                      : isFrost
                      ? 'text-slate-600 hover:text-slate-950'
                      : 'text-white/65 hover:text-white'
                  }`}
                >
                  {btn.id === 'play' && isLoading ? (
                    <Loader2 className={`w-5 h-5 animate-spin ${isFrost ? 'text-slate-900' : 'text-white'}`} />
                  ) : (
                    <Icon
                      className={`w-5 h-5 ${
                        btn.id === 'play' && !isPlaying ? 'ml-0.5' : ''
                      } ${isHeartActive ? 'fill-current' : ''}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </main>

      {/* Bottom Collapsible Liquid Physics Control Bar */}
      <footer
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 w-full flex justify-center"
      >
        <div
          className={`w-full max-w-2xl rounded-3xl px-5 py-3 backdrop-blur-2xl border shadow-2xl transition-colors ${
            isFrost
              ? 'bg-white/85 border-slate-200/90 text-slate-900 shadow-slate-300/60'
              : 'bg-slate-950/60 border-white/15 text-white'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowPhysics((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-85 hover:opacity-100 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Liquid Glass Physics</span>
              <span className="text-[10px] opacity-65">({showPhysics ? 'Hide' : 'Show'})</span>
            </button>

            <button
              type="button"
              onClick={handleResetPhysics}
              title="Reset physics defaults"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                isFrost
                  ? 'bg-slate-900/5 border-slate-300 text-slate-800 hover:bg-slate-900/10'
                  : 'bg-white/10 border-white/15 hover:bg-white/20 text-white'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {showPhysics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3.5 pt-3 border-t border-current/10">
              <label className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between opacity-85">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Surface Tension
                  </span>
                  <span className="font-mono">{viscosity}px</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={22}
                  step={1}
                  value={viscosity}
                  onChange={(e) => setViscosity(Number(e.target.value))}
                  className="accent-cyan-400 cursor-pointer"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between opacity-85">
                  <span>Spring Elasticity</span>
                  <span className="font-mono">{stiffness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.06}
                  max={0.3}
                  step={0.01}
                  value={stiffness}
                  onChange={(e) => setStiffness(Number(e.target.value))}
                  className="accent-cyan-400 cursor-pointer"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between opacity-85">
                  <span>Specular Rim</span>
                  <span className="font-mono">{specular.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={1}
                  step={0.02}
                  value={specular}
                  onChange={(e) => setSpecular(Number(e.target.value))}
                  className="accent-cyan-400 cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

interface VelvetMetaballBottomBarProps {
  onOpenNowPlaying?: () => void;
}

/**
 * Desktop Persistent Bottom Bar for Velvet & Lime theme, powered by the exact same
 * Liquid Glass Metaball Scrubber & 4-button Metaball Transport Dock.
 */
export const VelvetMetaballBottomBar: React.FC<VelvetMetaballBottomBarProps> = ({
  onOpenNowPlaying,
}) => {
  const filterId = useId().replace(/:/g, '');
  const {
    currentTrack,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    audioQuality,
    setAudioQuality,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
  } = usePlayback();
  const { progressMs, durationMs } = usePlaybackProgress();
  const { isLiked, toggleLike } = useLibrary();

  const [activeControlIndex, setActiveControlIndex] = useState(1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [scrubDisplaySec, setScrubDisplaySec] = useState<number | null>(null);

  const viscosity = 13;
  const stiffness = 0.15;
  const specular = 0.75;

  const BTN_SIZE = 40;
  const BTN_GAP = 10;
  const DOCK_PAD = 5;
  const DOCK_STEP = BTN_SIZE + BTN_GAP; // 50px
  const DOCK_WIDTH = DOCK_PAD * 2 + 4 * BTN_SIZE + 3 * BTN_GAP; // 200px
  const DOCK_HEIGHT = BTN_SIZE + DOCK_PAD * 2; // 50px

  const SCRUB_WIDTH = 300;
  const SCRUB_HEIGHT = 8;
  const THUMB_SIZE = 20;
  const SCRUB_HALF_SPAN = (SCRUB_WIDTH - THUMB_SIZE) / 2;

  const getDockSlotX = (idx: number) => {
    const startCenter = -DOCK_WIDTH / 2 + DOCK_PAD + BTN_SIZE / 2;
    return startCenter + idx * DOCK_STEP;
  };

  const wakePhysicsRef = useRef<(() => void) | null>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const scrubThumbGooRef = useRef<HTMLDivElement>(null);
  const scrubThumbGlassRef = useRef<HTMLDivElement>(null);
  const dockTrackGooRef = useRef<HTMLDivElement>(null);
  const dockGlassRef = useRef<HTMLDivElement>(null);
  const dockDropletGooRef = useRef<HTMLDivElement>(null);
  const dockDropletGlassRef = useRef<HTMLDivElement>(null);
  const slotGooRefs = useRef<(HTMLDivElement | null)[]>([]);
  const suppressDockClickRef = useRef(false);

  const actionsRef = useRef({ togglePlay, nextTrack, prevTrack, toggleLike, currentTrack });
  actionsRef.current = { togglePlay, nextTrack, prevTrack, toggleLike, currentTrack };

  const effectiveDurationSec =
    (durationMs > 0 ? durationMs : currentTrack?.duration.milliseconds || 180000) / 1000;
  const liveProgressRatio =
    durationMs > 0 ? Math.min(1, Math.max(0, progressMs / durationMs)) : 0;

  const phys = useRef({
    discAngle: 0,
    progress: liveProgressRatio,
    targetProgress: liveProgressRatio,
    thumbX: -SCRUB_HALF_SPAN + liveProgressRatio * (SCRUB_HALF_SPAN * 2),
    thumbVx: 0,
    thumbScaleX: 1,
    thumbScaleY: 1,
    thumbScaleVx: 0,
    thumbScaleVy: 0,
    isScrubbing: false,

    dX: getDockSlotX(1),
    dVx: 0,
    dTargetX: getDockSlotX(1),
    dScaleX: 1,
    dScaleY: 1,
    dScaleVx: 0,
    dScaleVy: 0,
    isDockDragging: false,
    dockDragOffsetX: 0,
    dockPointerDownX: null as number | null,

    dockPX: 0,
    dockPVx: 0,
    dockPScaleX: 1,
    dockPScaleY: 1,
    dockPScaleVx: 0,
    dockPScaleVy: 0,
    slotScales: [1, 1, 1, 1],
    slotVels: [0, 0, 0, 0],
    wasFusedSlot: 1,
    lastFrameTime: performance.now(),
    isPlaying,
    durationSec: effectiveDurationSec,
  });

  useEffect(() => {
    phys.current.isPlaying = isPlaying;
    wakePhysicsRef.current?.();
  }, [isPlaying]);

  useEffect(() => {
    phys.current.durationSec = effectiveDurationSec;
    wakePhysicsRef.current?.();
  }, [effectiveDurationSec]);

  useEffect(() => {
    phys.current.targetProgress = liveProgressRatio;
    wakePhysicsRef.current?.();
  }, [liveProgressRatio]);

  useEffect(() => {
    let rafId = 0;
    const schedule = () => {
      if (!rafId) {
        phys.current.lastFrameTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };
    wakePhysicsRef.current = schedule;

    const tick = (now: number) => {
      rafId = 0;
      const s = phys.current;
      const dt = Math.min(0.05, (now - s.lastFrameTime) / 1000);
      s.lastFrameTime = now;

      if (s.isPlaying) {
        s.discAngle = (s.discAngle + dt * 28) % 360;
      }
      if (!s.isScrubbing) {
        if (s.isPlaying && s.durationSec > 0) {
          s.progress += dt / s.durationSec;
        }
        s.progress += (s.targetProgress - s.progress) * 0.22;
        s.progress = Math.max(0, Math.min(1, s.progress));
      }
      if (discRef.current) {
        discRef.current.style.transform = `rotate(${s.discAngle.toFixed(2)}deg)`;
      }

      // Scrubber physics
      const targetThumbX = -SCRUB_HALF_SPAN + s.progress * (SCRUB_HALF_SPAN * 2);
      const scrubK = s.isScrubbing ? 0.44 : 0.2;
      const scrubDamp = s.isScrubbing ? 0.66 : 0.74;
      s.thumbVx = (s.thumbVx + (targetThumbX - s.thumbX) * scrubK) * scrubDamp;
      s.thumbX += s.thumbVx;
      const thumbStretch = Math.min(Math.abs(s.thumbVx) * 0.032, 0.42) + (s.isScrubbing ? 0.12 : 0);
      s.thumbScaleVx = (s.thumbScaleVx + (1 + thumbStretch - s.thumbScaleX) * 0.25) * 0.72;
      s.thumbScaleVy = (s.thumbScaleVy + (1 - thumbStretch * 0.36 - s.thumbScaleY) * 0.25) * 0.72;
      s.thumbScaleX += s.thumbScaleVx;
      s.thumbScaleY += s.thumbScaleVy;
      const thumbTransform = `translate3d(${s.thumbX.toFixed(2)}px, 0, 0) scale(${s.thumbScaleX.toFixed(
        4
      )}, ${s.thumbScaleY.toFixed(4)})`;
      if (scrubThumbGooRef.current) scrubThumbGooRef.current.style.transform = thumbTransform;
      if (scrubThumbGlassRef.current) scrubThumbGlassRef.current.style.transform = thumbTransform;

      // Dock metaball physics
      const dx = s.dTargetX - s.dX;
      const dist = Math.abs(dx);
      const tensionPull = !s.isDockDragging && dist < 34 && dist > 0.1 ? dx * 0.15 : 0;
      const activeK = s.isDockDragging ? 0.34 : stiffness;
      const activeDamp = s.isDockDragging ? 0.68 : 0.76;
      s.dVx = (s.dVx + dx * activeK + tensionPull) * activeDamp;
      s.dX += s.dVx;

      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < 4; i++) {
        const dSlot = Math.abs(s.dX - getDockSlotX(i));
        if (dSlot < nearestDist) {
          nearestDist = dSlot;
          nearestIdx = i;
        }
      }

      const bridgeThreshold = 34 + viscosity * 0.6;
      const isFused = nearestDist < bridgeThreshold;
      const currentFusedSlot = isFused ? nearestIdx : -1;
      if (currentFusedSlot !== s.wasFusedSlot) {
        if (s.wasFusedSlot !== -1) s.slotVels[s.wasFusedSlot] += 0.14;
        if (currentFusedSlot !== -1) {
          s.slotVels[currentFusedSlot] -= 0.16;
          s.dScaleVx -= 0.12;
          s.dScaleVy += 0.1;
        }
        s.wasFusedSlot = currentFusedSlot;
      }

      const dSpeed = Math.abs(s.dVx);
      const velStretch = Math.min(dSpeed * 0.022, 0.34);
      const bridgeStretch =
        !isFused && nearestDist < bridgeThreshold + 14 ? 0.16 : Math.min(dist / DOCK_STEP, 1) * 0.14;
      s.dScaleVx = (s.dScaleVx + (1 + velStretch + bridgeStretch - s.dScaleX) * 0.24) * 0.72;
      s.dScaleVy =
        (s.dScaleVy + (1 - (velStretch + bridgeStretch) * 0.42 - s.dScaleY) * 0.24) * 0.72;
      s.dScaleX += s.dScaleVx;
      s.dScaleY += s.dScaleVy;

      for (let i = 0; i < 4; i++) {
        const slotX = getDockSlotX(i);
        const proximity = Math.max(0, 1 - Math.abs(s.dX - slotX) / bridgeThreshold);
        s.slotVels[i] = (s.slotVels[i] + (1 + proximity * 0.12 - s.slotScales[i]) * 0.24) * 0.72;
        s.slotScales[i] += s.slotVels[i];
        const slotEl = slotGooRefs.current[i];
        if (slotEl) {
          slotEl.style.transform = `translate3d(${slotX}px, 0, 0) scale(${s.slotScales[i].toFixed(4)})`;
        }
      }

      s.dockPVx = (s.dockPVx + (0 - s.dockPX) * 0.18) * 0.74;
      s.dockPX += s.dockPVx;
      s.dockPScaleVx = (s.dockPScaleVx + (1 - s.dockPScaleX) * 0.22) * 0.74;
      s.dockPScaleVy = (s.dockPScaleVy + (1 - s.dockPScaleY) * 0.22) * 0.74;
      s.dockPScaleX += s.dockPScaleVx;
      s.dockPScaleY += s.dockPScaleVy;

      const dockTrackTransform = `translate3d(${s.dockPX.toFixed(2)}px, 0, 0) scale(${s.dockPScaleX.toFixed(
        4
      )}, ${s.dockPScaleY.toFixed(4)})`;
      const dockDropletTransform = `translate3d(${s.dX.toFixed(2)}px, 0, 0) scale(${s.dScaleX.toFixed(
        4
      )}, ${s.dScaleY.toFixed(4)})`;

      if (dockTrackGooRef.current) dockTrackGooRef.current.style.transform = dockTrackTransform;
      if (dockGlassRef.current) dockGlassRef.current.style.transform = dockTrackTransform;
      if (dockDropletGooRef.current) dockDropletGooRef.current.style.transform = dockDropletTransform;
      if (dockDropletGlassRef.current) dockDropletGlassRef.current.style.transform = dockDropletTransform;

      const settled =
        !s.isPlaying &&
        !s.isScrubbing &&
        !s.isDockDragging &&
        Math.abs(s.targetProgress - s.progress) < 0.0005 &&
        Math.abs(s.thumbVx) < 0.02 &&
        Math.abs(s.dTargetX - s.dX) < 0.08 &&
        Math.abs(s.dVx) < 0.02 &&
        Math.abs(s.dScaleX - 1) < 0.002;
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

  const isCurrentLiked = isLiked(currentTrack.id);
  const contrast = Math.round(18 + viscosity * 0.45);
  const shift = -(contrast * 0.42).toFixed(2);
  const displayedSeconds =
    scrubDisplaySec !== null ? scrubDisplaySec : Math.floor(progressMs / 1000);

  const triggerControlAction = (index: number) => {
    const s = phys.current;
    const prevX = s.dX;
    const nextX = getDockSlotX(index);
    const dir = Math.sign(nextX - prevX) || 1;
    setActiveControlIndex(index);
    s.dTargetX = nextX;
    s.dScaleVx += 0.18;
    s.dScaleVy -= 0.13;
    s.dockPVx += dir * 1.4;
    s.dockPScaleVx += 0.02;
    s.dockPScaleVy -= 0.014;

    if (index === 0) actionsRef.current.prevTrack();
    else if (index === 1) actionsRef.current.togglePlay();
    else if (index === 2) actionsRef.current.nextTrack();
    else if (index === 3 && actionsRef.current.currentTrack) {
      actionsRef.current.toggleLike(actionsRef.current.currentTrack);
    }
    wakePhysicsRef.current?.();
  };

  const updateProgressFromClientX = (clientX: number, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2;
    const relX = Math.max(-SCRUB_HALF_SPAN, Math.min(SCRUB_HALF_SPAN, clientX - centerX));
    const ratio = (relX + SCRUB_HALF_SPAN) / (SCRUB_HALF_SPAN * 2);
    phys.current.progress = ratio;
    phys.current.targetProgress = ratio;
    setScrubDisplaySec(ratio * effectiveDurationSec);
    return ratio;
  };

  const handleDockPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    phys.current.dockPointerDownX = e.clientX;
    phys.current.dockDragOffsetX = e.clientX - phys.current.dX;
  };

  const handleDockPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (phys.current.dockPointerDownX === null) return;
    const moved = Math.abs(e.clientX - phys.current.dockPointerDownX);
    if (!phys.current.isDockDragging && moved > 6) {
      phys.current.isDockDragging = true;
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {}
    }
    if (phys.current.isDockDragging) {
      const rawX = e.clientX - phys.current.dockDragOffsetX;
      phys.current.dTargetX = Math.max(getDockSlotX(0), Math.min(getDockSlotX(3), rawX));
    }
  };

  const handleDockPointerUp = () => {
    const wasDragging = phys.current.isDockDragging;
    phys.current.isDockDragging = false;
    phys.current.dockPointerDownX = null;
    if (wasDragging) {
      suppressDockClickRef.current = true;
      setTimeout(() => {
        suppressDockClickRef.current = false;
      }, 60);

      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < 4; i++) {
        const d = Math.abs(phys.current.dX - getDockSlotX(i));
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      triggerControlAction(nearestIdx);
    }
  };

  const controlButtons = [
    { id: 'prev', label: 'Previous Track', icon: SkipBack },
    { id: 'play', label: isPlaying ? 'Pause' : 'Play', icon: isPlaying ? Pause : Play },
    { id: 'next', label: 'Next Track', icon: SkipForward },
    { id: 'like', label: isCurrentLiked ? 'Unlike Track' : 'Like Track', icon: Heart },
  ];

  return (
    <footer className="mx-4 mb-3 rounded-[28px] border border-white/25 bg-white/[0.04] backdrop-blur-2xl h-22 py-2 px-5 grid grid-cols-[1fr_2fr_1fr] items-center shadow-[0_24px_52px_-12px_rgba(0,0,0,0.65)] z-50 select-none relative overflow-visible">
      {/* SVG Filter */}
      <svg className="sr-only" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id={`liquid-fusion-bar-${filterId}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={10} result="blur" />
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

      {/* Left: Rotating Spatial Vinyl Disc & Track Info */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          onClick={onOpenNowPlaying}
          title="Open Liquid Glass Music Player"
          className="relative flex-shrink-0 cursor-pointer group"
        >
          <div className="absolute -inset-1 rounded-full bg-fuchsia-500/35 blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
          <div
            ref={discRef}
            className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-rose-400 via-amber-300 to-fuchsia-500 p-0.5 shadow-lg flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-950/75 flex items-center justify-center">
              {currentTrack.album.images[0] && (
                <img
                  src={currentTrack.album.images[0].url}
                  alt={currentTrack.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
              )}
              <Disc3 className="w-5 h-5 text-white relative z-10 drop-shadow" />
            </div>
          </div>
        </div>

        <div
          onClick={onOpenNowPlaying}
          title="Open Liquid Glass Music Player"
          className="flex flex-col truncate cursor-pointer"
        >
          <span className="text-sm font-bold text-white hover:underline truncate">
            {currentTrack.name}
          </span>
          <span className="text-xs text-white/60 hover:text-white truncate">
            {currentTrack.artists.map((a) => a.name).join(', ')}
          </span>
        </div>
        <DownloadButton track={currentTrack} size={18} className="ml-1" />
      </div>

      {/* Center: Metaball Transport Control Dock + Metaball Scrubber */}
      <div className="flex flex-col items-center justify-center gap-1">
        {/* Compact 4-Button Metaball Transport Dock */}
        <nav
          aria-label="Playback Transport Controls"
          onPointerDown={handleDockPointerDown}
          onPointerMove={handleDockPointerMove}
          onPointerUp={handleDockPointerUp}
          onPointerCancel={handleDockPointerUp}
          style={{ width: DOCK_WIDTH, height: DOCK_HEIGHT }}
          className="relative flex items-center justify-center touch-none"
        >
          <div
            style={{ filter: `url(#liquid-fusion-bar-${filterId})` }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.16]"
          >
            <div
              ref={dockTrackGooRef}
              style={{ width: DOCK_WIDTH, height: DOCK_HEIGHT }}
              className="absolute rounded-full bg-white"
            />
            {controlButtons.map((btn, idx) => (
              <div
                key={btn.id}
                ref={(el) => {
                  slotGooRefs.current[idx] = el;
                }}
                style={{
                  width: BTN_SIZE * 0.84,
                  height: BTN_SIZE * 0.84,
                  transform: `translate3d(${getDockSlotX(idx)}px, 0, 0)`,
                }}
                className="absolute rounded-full bg-white"
              />
            ))}
            <div
              ref={dockDropletGooRef}
              style={{ width: BTN_SIZE, height: BTN_SIZE }}
              className="absolute rounded-full bg-white"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              ref={dockGlassRef}
              style={{
                width: DOCK_WIDTH,
                height: DOCK_HEIGHT,
                backdropFilter: 'blur(12px) saturate(145%)',
                WebkitBackdropFilter: 'blur(12px) saturate(145%)',
                boxShadow: `inset 0 1.5px 1.5px rgba(255,255,255,${specular}), inset 0 -1.5px 2px rgba(255,255,255,${
                  specular * 0.3
                })`,
              }}
              className="absolute rounded-full overflow-hidden border border-white/30 bg-white/[0.04]"
            >
              <div
                className="w-full h-full opacity-45 bg-gradient-to-tr from-cyan-400/20 via-transparent to-fuchsia-400/20"
              />
            </div>
            <div
              ref={dockDropletGlassRef}
              style={{
                width: BTN_SIZE,
                height: BTN_SIZE,
                backdropFilter: 'blur(12px) saturate(145%)',
                WebkitBackdropFilter: 'blur(12px) saturate(145%)',
                boxShadow: `inset 0 1.5px 1.5px rgba(255,255,255,0.9), 0 8px 18px -4px rgba(0,0,0,0.45)`,
              }}
              className="absolute rounded-full overflow-hidden border border-white/45 bg-white/15"
            >
              <div
                className="w-full h-full opacity-55 bg-gradient-to-tr from-emerald-300/25 via-transparent to-cyan-200/30"
              />
            </div>
          </div>

          <div
            style={{ gap: BTN_GAP, padding: DOCK_PAD }}
            className="relative z-10 flex items-center justify-center"
          >
            {controlButtons.map((btn, idx) => {
              const Icon = btn.icon;
              const isSelected = activeControlIndex === idx;
              const isHeartActive = btn.id === 'like' && isCurrentLiked;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (suppressDockClickRef.current) {
                      suppressDockClickRef.current = false;
                      return;
                    }
                    triggerControlAction(idx);
                  }}
                  aria-label={btn.label}
                  style={{ width: BTN_SIZE, height: BTN_SIZE }}
                  className={`relative rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 ${
                    isHeartActive
                      ? 'text-rose-400 scale-110'
                      : isSelected
                      ? 'text-white scale-110'
                      : 'text-white/65 hover:text-white'
                  }`}
                >
                  {btn.id === 'play' && isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Icon
                      className={`w-4 h-4 ${
                        btn.id === 'play' && !isPlaying ? 'ml-0.5' : ''
                      } ${isHeartActive ? 'fill-current' : ''}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Metaball Scrubber Strip */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono text-white/70 w-9 text-right">
            {formatTimeSeconds(displayedSeconds)}
          </span>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Track Progress Scrubber"
            aria-valuemin={0}
            aria-valuemax={Math.round(effectiveDurationSec)}
            aria-valuenow={Math.round(displayedSeconds)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              phys.current.isScrubbing = true;
              phys.current.thumbScaleVy -= 0.18;
              updateProgressFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
            }}
            onPointerMove={(e) => {
              if (!phys.current.isScrubbing) return;
              updateProgressFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
            }}
            onPointerUp={(e) => {
              if (!phys.current.isScrubbing) return;
              const ratio = updateProgressFromClientX(
                e.clientX,
                e.currentTarget.getBoundingClientRect()
              );
              phys.current.isScrubbing = false;
              phys.current.thumbScaleVx += 0.24;
              phys.current.thumbScaleVy -= 0.18;
              setScrubDisplaySec(null);
              seek(ratio * (durationMs > 0 ? durationMs : currentTrack.duration.milliseconds));
            }}
            style={{ width: SCRUB_WIDTH, height: THUMB_SIZE + 4 }}
            className="relative flex items-center justify-center cursor-pointer touch-none"
          >
            <div
              style={{ filter: `url(#liquid-fusion-bar-${filterId})` }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.28]"
            >
              <div
                style={{ width: SCRUB_WIDTH, height: SCRUB_HEIGHT }}
                className="absolute rounded-full bg-white"
              />
              <div
                ref={scrubThumbGooRef}
                style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                className="absolute rounded-full bg-white"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                style={{ width: SCRUB_WIDTH, height: SCRUB_HEIGHT }}
                className="absolute rounded-full border bg-white/15 border-white/30"
              />
              <div
                ref={scrubThumbGlassRef}
                style={{
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  backdropFilter: 'blur(12px) saturate(185%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(185%)',
                  boxShadow: `inset 0 1.5px 1px rgba(255,255,255,0.85), 0 4px 12px rgba(0,0,0,0.45)`,
                }}
                className="absolute rounded-full border bg-white/30 border-white/70"
              />
            </div>
          </div>
          <span className="text-[11px] font-mono text-white/70 w-10">
            -{formatTimeSeconds(Math.max(0, effectiveDurationSec - displayedSeconds))}
          </span>
        </div>
      </div>

      {/* Right: Volume, Expand & Quality */}
      <div className="flex items-center justify-end gap-3 text-white/75">
        <button onClick={toggleMute} className="hover:text-white transition-colors">
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div className="w-24">
          <LiquidGlassSlider
            value={isMuted ? 0 : volume}
            min={0}
            max={1}
            onChange={(newVol) => setVolume(newVol)}
            formatTooltip={(vol) => `${Math.round(vol * 100)}%`}
            accentColor="#ffffff"
          />
        </div>
        <button
          onClick={onOpenNowPlaying}
          title="Expand Liquid Glass Player"
          className="hover:text-white transition-all p-1.5 rounded-full hover:bg-white/10 active:scale-95 cursor-pointer"
        >
          <Maximize2 size={16} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowQualityMenu((prev) => !prev)}
            title="Audio Quality & Bitrate"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/15 text-white transition-colors"
          >
            <Sliders size={13} />
            <span>
              {audioQuality === 'very_high'
                ? '320k'
                : audioQuality === 'high'
                ? '256k'
                : audioQuality === 'normal'
                ? '160k'
                : '96k'}
            </span>
          </button>

          {showQualityMenu && (
            <div className="absolute bottom-11 right-0 w-52 bg-[#161721]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-1.5 text-xs z-50">
              <div className="px-2.5 py-1.5 font-bold text-white border-b border-white/10 mb-1">
                Audio Quality (Bitrate)
              </div>
              {[
                { id: 'very_high', label: 'Very High', rate: '320 kbps' },
                { id: 'high', label: 'High', rate: '256 kbps' },
                { id: 'normal', label: 'Normal', rate: '160 kbps' },
                { id: 'low', label: 'Low', rate: '96 kbps' },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setAudioQuality(q.id as AudioQuality);
                    setShowQualityMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left ${
                    audioQuality === q.id
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-white/75 hover:bg-white/10'
                  }`}
                >
                  <span>{q.label}</span>
                  <span className="flex items-center gap-1 opacity-75">
                    {q.rate}
                    {audioQuality === q.id && <Check size={13} />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
