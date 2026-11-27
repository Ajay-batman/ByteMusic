import React, { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export interface LiquidGlassNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export interface LiquidGlassMetaballNavProps {
  items: LiquidGlassNavItem[];
  activeId: string;
  /** Liquid viscosity (SVG blur stdDeviation). Default: 14 */
  viscosity?: number;
  /** Spring elasticity constant. Default: 0.15 */
  stiffness?: number;
  /** Specular rim intensity (0.15 - 1). Default: 0.75 */
  specular?: number;
  /** 'both' | 'click' | 'drag'. Default: 'both' */
  interactionMode?: 'both' | 'click' | 'drag';
  className?: string;
}

interface SlotPhysState {
  baseX: number;
  x: number;
  vx: number;
  scaleX: number;
  scaleY: number;
  scaleVx: number;
  scaleVy: number;
  wasFused: boolean;
}

/**
 * Exact TypeScript & responsive adaptation of ios_liquid_glass_metaball_nav_bar.tsx.
 * Features:
 * - Layer 1: Unified SVG gooey metaball membrane fusing outer track, per-icon nodes, and moving placeholder droplet
 * - Layer 2: Crisp backdrop-blur specular glass shells + animated liquid caustic refraction + smooth rim dissolution
 * - Layer 3: Razor-sharp icon buttons with click + scrub (>6px) pointer handling and 60fps spring recoil
 */
export const LiquidGlassMetaballNav: React.FC<LiquidGlassMetaballNavProps> = ({
  items,
  activeId,
  viscosity = 14,
  stiffness = 0.15,
  specular = 0.75,
  interactionMode = 'both',
  className = '',
}) => {
  const filterId = useId().replace(/:/g, '');
  const { isAurora, isFrost, isSunset } = useTheme();
  const isLight = isFrost;
  const useDarkInk = isLight;
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId)
  );

  // Responsive metrics derived from viewport width so the bar scales smoothly across all devices
  const [metrics, setMetrics] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    if (w < 360) return { itemSize: 48, itemGap: 8, padding: 6 };
    if (w < 768) return { itemSize: 52, itemGap: 10, padding: 8 };
    return { itemSize: 56, itemGap: 14, padding: 8 };
  });

  useEffect(() => {
    const updateMetrics = () => {
      const w = window.innerWidth;
      if (w < 360) {
        setMetrics({ itemSize: 48, itemGap: 8, padding: 6 });
      } else if (w < 768) {
        setMetrics({ itemSize: 52, itemGap: 10, padding: 8 });
      } else {
        setMetrics({ itemSize: 56, itemGap: 14, padding: 8 });
      }
    };
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, []);

  const ITEM_SIZE = metrics.itemSize;
  const ITEM_GAP = metrics.itemGap;
  const PADDING = metrics.padding;
  const STEP = ITEM_SIZE + ITEM_GAP;
  const TRACK_WIDTH =
    PADDING * 2 + items.length * ITEM_SIZE + Math.max(0, items.length - 1) * ITEM_GAP;
  const TRACK_HEIGHT = ITEM_SIZE + PADDING * 2;

  const getTargetX = (index: number, trackW = TRACK_WIDTH, pad = PADDING, itemS = ITEM_SIZE, step = STEP) => {
    const startCenter = -trackW / 2 + pad + itemS / 2;
    return startCenter + index * step;
  };

  // DOM Refs for 60fps zero-rerender physics loop
  const trackGooRef = useRef<HTMLDivElement>(null);
  const trackGlassRef = useRef<HTMLDivElement>(null);
  const dropletGooRef = useRef<HTMLDivElement>(null);
  const dropletGlassRef = useRef<HTMLDivElement>(null);
  const slotGooRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slotGlassRefs = useRef<(HTMLDivElement | null)[]>([]);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const matrixRef = useRef<SVGFEColorMatrixElement>(null);
  const causticRef = useRef<SVGFETurbulenceElement>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const phys = useRef({
    // Moving active placeholder droplet
    sX: getTargetX(activeIndex),
    sVx: 0,
    sTargetX: getTargetX(activeIndex),
    sScaleX: 1,
    sScaleY: 1,
    sScaleVx: 0,
    sScaleVy: 0,

    // Each icon slot has its own reactive Liquid Glass node for two-component fusion
    slots: items.map((_, idx): SlotPhysState => ({
      baseX: getTargetX(idx),
      x: getTargetX(idx),
      vx: 0,
      scaleX: 1,
      scaleY: 1,
      scaleVx: 0,
      scaleVy: 0,
      wasFused: idx === activeIndex,
    })),

    // Subtle outer dock recoil
    pX: 0,
    pVx: 0,
    pScaleX: 1,
    pScaleY: 1,
    pScaleVx: 0,
    pScaleVy: 0,

    // Pointer interaction flags (does NOT capture until threshold exceeded so clicks always fire)
    pointerActive: false,
    isDragging: false,
    pointerId: null as number | null,
    pointerDownX: 0,
    dragStartX: 0,
    suppressNextClick: false,
    causticPhase: 0,
    viscosity,
    stiffness,
    interactionMode,
    step: STEP,
    trackWidth: TRACK_WIDTH,
    padding: PADDING,
    itemSize: ITEM_SIZE,
    activeIndex,
  });

  // Update slot coordinates smoothly when metrics or item count change
  useEffect(() => {
    const s = phys.current;
    s.step = STEP;
    s.trackWidth = TRACK_WIDTH;
    s.padding = PADDING;
    s.itemSize = ITEM_SIZE;

    if (s.slots.length !== items.length) {
      s.slots = items.map((_, idx) => ({
        baseX: getTargetX(idx, TRACK_WIDTH, PADDING, ITEM_SIZE, STEP),
        x: getTargetX(idx, TRACK_WIDTH, PADDING, ITEM_SIZE, STEP),
        vx: 0,
        scaleX: 1,
        scaleY: 1,
        scaleVx: 0,
        scaleVy: 0,
        wasFused: idx === s.activeIndex,
      }));
    } else {
      s.slots.forEach((slot, idx) => {
        const nextBase = getTargetX(idx, TRACK_WIDTH, PADDING, ITEM_SIZE, STEP);
        slot.baseX = nextBase;
        slot.x = nextBase;
      });
    }

    const currTarget = getTargetX(s.activeIndex, TRACK_WIDTH, PADDING, ITEM_SIZE, STEP);
    s.sTargetX = currTarget;
    if (!s.isDragging) {
      s.sX = currTarget;
    }
  }, [STEP, TRACK_WIDTH, PADDING, ITEM_SIZE, items.length]);

  // Sync React controls to physics ref & SVG filter attributes
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
  }, [stiffness]);

  useEffect(() => {
    phys.current.interactionMode = interactionMode;
  }, [interactionMode]);

  // Move & fuse placeholder droplet when activeIndex changes externally
  useEffect(() => {
    const s = phys.current;
    if (s.activeIndex !== activeIndex) {
      const prevX = s.sX;
      const nextX = getTargetX(activeIndex, s.trackWidth, s.padding, s.itemSize, s.step);
      const direction = Math.sign(nextX - prevX) || 1;
      s.activeIndex = activeIndex;
      s.sTargetX = nextX;
      s.sScaleVx += 0.18;
      s.sScaleVy -= 0.13;
      s.pVx += direction * 1.5;
      s.pScaleVx += 0.02;
      s.pScaleVy -= 0.014;
    }
  }, [activeIndex]);

  // 60fps Liquid Glass Two-Component Metaball Fusion Physics Loop
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const s = phys.current;
      const k = s.stiffness;
      const damping = 0.76;

      // 1. Distance to target & surface-tension magnetic pull
      const dx = s.sTargetX - s.sX;
      const dist = Math.abs(dx);

      let tensionPull = 0;
      if (!s.isDragging && dist < 44 && dist > 0.05) {
        tensionPull = dx * 0.15;
      }

      // 2. Integrate Active Placeholder Droplet Spring
      const activeK = s.isDragging ? Math.min(0.42, k * 2.2) : k;
      const activeDamp = s.isDragging ? 0.68 : damping;
      s.sVx = (s.sVx + dx * activeK + tensionPull) * activeDamp;
      s.sX += s.sVx;

      // 3. Two-Component Metaball Fusion with Each Icon Node
      const bridgeThreshold = 46 + s.viscosity * 0.85;

      s.slots.forEach((slot, idx) => {
        const sdx = s.sX - slot.x;
        const sdist = Math.abs(sdx);
        const dir = Math.sign(sdx) || 1;
        const isFused = sdist < bridgeThreshold;

        // Detect fusion collision & surface-tension snap separation
        if (isFused && !slot.wasFused) {
          slot.wasFused = true;
          // Collision jiggle impulse on both droplet & destination icon node
          slot.scaleVx -= 0.16;
          slot.scaleVy += 0.12;
          s.sScaleVx -= 0.12;
          s.sScaleVy += 0.09;
        } else if (!isFused && slot.wasFused) {
          slot.wasFused = false;
          // Snap recoil when liquid neck breaks away from departing icon
          slot.scaleVx += 0.18;
          slot.scaleVy -= 0.13;
          slot.vx -= dir * 2.1;
          s.sScaleVx += 0.15;
          s.sScaleVy -= 0.11;
        }

        // Magnetic lean toward approaching placeholder droplet
        const rawFusion = Math.max(0, Math.min(1, 1 - sdist / bridgeThreshold));
        const dissolveCurve = rawFusion * rawFusion * (3 - 2 * rawFusion);
        const leanWeight = 1 - dissolveCurve * 0.55;
        const slotTargetX = slot.baseX + dir * rawFusion * 9 * leanWeight;

        slot.vx = (slot.vx + (slotTargetX - slot.x) * (k * 1.15)) * 0.74;
        slot.x += slot.vx;

        // Icon node squash & stretch spring
        const targetSlotScaleX = 1 + dissolveCurve * 0.08;
        const targetSlotScaleY = 1 + dissolveCurve * 0.04;
        slot.scaleVx = (slot.scaleVx + (targetSlotScaleX - slot.scaleX) * 0.22) * 0.74;
        slot.scaleVy = (slot.scaleVy + (targetSlotScaleY - slot.scaleY) * 0.22) * 0.74;
        slot.scaleX += slot.scaleVx;
        slot.scaleY += slot.scaleVy;

        const slotTransform = `translate3d(${slot.x.toFixed(2)}px, 0, 0) scale(${slot.scaleX.toFixed(4)}, ${slot.scaleY.toFixed(4)})`;
        const gooEl = slotGooRefs.current[idx];
        const glassEl = slotGlassRefs.current[idx];
        if (gooEl) gooEl.style.transform = slotTransform;
        if (glassEl) {
          glassEl.style.transform = slotTransform;
          // Dissolve individual icon rim smoothly as placeholder fuses into it
          glassEl.style.opacity = Math.max(0.18, 1 - dissolveCurve * 0.85).toFixed(3);
        }
      });

      // 4. Organic Squash, Stretch & Surface-Tension Neck Elongation on Moving Droplet
      const speed = Math.abs(s.sVx);
      const velStretch = Math.min(speed * 0.024, 0.36);
      const travelFactor = Math.min(dist / s.step, 1);
      const bridgeStretch = travelFactor * 0.18;

      const targetSScaleX = 1 + velStretch + bridgeStretch;
      const targetSScaleY = 1 - (velStretch + bridgeStretch) * 0.44;

      s.sScaleVx = (s.sScaleVx + (targetSScaleX - s.sScaleX) * 0.24) * 0.72;
      s.sScaleVy = (s.sScaleVy + (targetSScaleY - s.sScaleY) * 0.24) * 0.72;
      s.sScaleX += s.sScaleVx;
      s.sScaleY += s.sScaleVy;

      // 5. Outer Dock Track Recoil
      s.pVx = (s.pVx + (0 - s.pX) * 0.18) * 0.75;
      s.pX += s.pVx;
      s.pScaleVx = (s.pScaleVx + (1 - s.pScaleX) * 0.22) * 0.74;
      s.pScaleVy = (s.pScaleVy + (1 - s.pScaleY) * 0.22) * 0.74;
      s.pScaleX += s.pScaleVx;
      s.pScaleY += s.pScaleVy;

      // 6. Apply GPU Transforms
      const trackTransform = `translate3d(${s.pX.toFixed(2)}px, 0, 0) scale(${s.pScaleX.toFixed(4)}, ${s.pScaleY.toFixed(4)})`;
      const dropletTransform = `translate3d(${s.sX.toFixed(2)}px, 0, 0) scale(${s.sScaleX.toFixed(4)}, ${s.sScaleY.toFixed(4)})`;

      if (trackGooRef.current) trackGooRef.current.style.transform = trackTransform;
      if (trackGlassRef.current) trackGlassRef.current.style.transform = trackTransform;
      if (dropletGooRef.current) dropletGooRef.current.style.transform = dropletTransform;
      if (dropletGlassRef.current) dropletGlassRef.current.style.transform = dropletTransform;

      // Subtle living liquid shimmer in internal caustics
      s.causticPhase += 0.014;
      if (causticRef.current) {
        const fx = (0.014 + Math.sin(s.causticPhase) * 0.002).toFixed(5);
        const fy = (0.028 + Math.cos(s.causticPhase * 0.8) * 0.0025).toFixed(5);
        causticRef.current.setAttribute('baseFrequency', `${fx} ${fy}`);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Move & fuse placeholder droplet into clicked/selected icon (and vibrate with water physics)
  const selectIndex = (index: number) => {
    const s = phys.current;
    const prevX = s.sX;
    const nextX = getTargetX(index, s.trackWidth, s.padding, s.itemSize, s.step);
    const direction = Math.sign(nextX - prevX) || 1;
    const isSame = index === s.activeIndex;

    s.activeIndex = index;
    s.sTargetX = nextX;

    // Tactile launch, snap & water vibration impulse
    if (isSame) {
      s.sScaleVx += 0.22;
      s.sScaleVy -= 0.17;
      s.pScaleVx += 0.035;
      s.pScaleVy -= 0.025;
      if (s.slots[index]) {
        s.slots[index].scaleVx -= 0.16;
        s.slots[index].scaleVy += 0.12;
      }
    } else {
      s.sScaleVx += 0.18;
      s.sScaleVy -= 0.13;
      s.pVx += direction * 1.8;
      s.pScaleVx += 0.025;
      s.pScaleVy -= 0.018;
    }

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    } catch {}

    itemsRef.current[index]?.onSelect();
  };

  // Non-blocking pointer handlers: clicks fire cleanly on buttons, while dragging > 6px engages scrub
  const handleNavPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (phys.current.interactionMode === 'click') return;
    phys.current.pointerActive = true;
    phys.current.isDragging = false;
    phys.current.pointerId = e.pointerId;
    phys.current.pointerDownX = e.clientX;
    phys.current.dragStartX = e.clientX - phys.current.sX;
  };

  const handleNavPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = phys.current;
    if (!s.pointerActive || s.interactionMode === 'click') return;

    const delta = Math.abs(e.clientX - s.pointerDownX);
    if (!s.isDragging && delta > 6) {
      s.isDragging = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if capture is unavailable
      }
    }

    if (s.isDragging) {
      const minX = getTargetX(0, s.trackWidth, s.padding, s.itemSize, s.step);
      const maxX = getTargetX(itemsRef.current.length - 1, s.trackWidth, s.padding, s.itemSize, s.step);
      const rawX = e.clientX - s.dragStartX;
      s.sTargetX = Math.max(minX, Math.min(maxX, rawX));
    }
  };

  const handleNavPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const s = phys.current;
    if (!s.pointerActive) return;
    const wasDragging = s.isDragging;
    s.pointerActive = false;
    s.isDragging = false;

    if (wasDragging) {
      try {
        if (s.pointerId !== null && e.currentTarget.hasPointerCapture(s.pointerId)) {
          e.currentTarget.releasePointerCapture(s.pointerId);
        }
      } catch {
        // Ignore
      }

      s.suppressNextClick = true;
      setTimeout(() => {
        phys.current.suppressNextClick = false;
      }, 60);

      let nearestIdx = 0;
      let minDist = Infinity;
      itemsRef.current.forEach((_, idx) => {
        const d = Math.abs(s.sX - getTargetX(idx, s.trackWidth, s.padding, s.itemSize, s.step));
        if (d < minDist) {
          minDist = d;
          nearestIdx = idx;
        }
      });
      selectIndex(nearestIdx);
    }
  };

  const contrast = Math.round(18 + viscosity * 0.45);
  const shift = -(contrast * 0.42).toFixed(2);

  return (
    <nav
      aria-label="Liquid Glass Navigation"
      onPointerDown={handleNavPointerDown}
      onPointerMove={handleNavPointerMove}
      onPointerUp={handleNavPointerUp}
      onPointerCancel={handleNavPointerUp}
      style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}
      className={`relative flex items-center justify-center touch-none select-none pointer-events-auto ${className}`}
    >
      {/* SVG Gooey Metaball & Liquid Caustic Filters */}
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
              values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${contrast} ${shift}`}
              result="goo"
            />
            <feComposite in="goo" in2="goo" operator="in" />
          </filter>

          <filter id={`liquid-caustic-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              ref={causticRef}
              type="fractalNoise"
              baseFrequency="0.014 0.028"
              numOctaves={2}
              seed={11}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={10}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* LAYER 1: Unified SVG Gooey Metaball Membrane (Fuses icon nodes & sliding placeholder) */}
      <div
        aria-hidden="true"
        style={{ filter: `url(#liquid-fusion-${filterId})` }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.20] transition-opacity duration-500"
      >
        {/* Outer Pill Dock Base */}
        <div
          ref={trackGooRef}
          style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}
          className="absolute rounded-full bg-white"
        />

        {/* Individual Icon Node Goo Cores (Two-Component Fusion Targets) */}
        {items.map((item, idx) => (
          <div
            key={item.id}
            ref={(el) => {
              slotGooRefs.current[idx] = el;
            }}
            style={{ width: ITEM_SIZE - 6, height: ITEM_SIZE - 6 }}
            className="absolute rounded-full bg-white"
          />
        ))}

        {/* Moving Active Placeholder Droplet Goo Core */}
        <div
          ref={dropletGooRef}
          style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
          className="absolute rounded-full bg-white"
        />
      </div>

      {/* LAYER 2: Crisp Specular Rim & Caustic Glass Shells */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        {/* Outer Nav Bar Specular Shell */}
        <div
          ref={trackGlassRef}
          style={{
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            backdropFilter: 'blur(16px) saturate(185%)',
            WebkitBackdropFilter: 'blur(16px) saturate(185%)',
            boxShadow: useDarkInk
              ? `inset 0 1.5px 1px rgba(255,255,255,${Math.min(1, specular + 0.15)}), inset 0 -1.5px 2px rgba(15,23,42,0.14), 0 20px 44px -10px rgba(15,23,42,0.22)`
              : `inset 0 1.5px 1.5px rgba(255,255,255,${specular}), inset 0 -1.5px 2px rgba(255,255,255,${
                  specular * 0.3
                }), 0 24px 52px -12px rgba(0,0,0,0.52)`,
          }}
          className={`absolute rounded-full overflow-hidden border transition-colors duration-500 ${
            isLight
              ? 'border-white/75 bg-white/15'
              : isAurora
              ? 'border-white/55 bg-white/[0.06]'
              : 'border-white/30 bg-white/[0.04]'
          }`}
        >
          <div
            style={{ filter: `url(#liquid-caustic-${filterId})` }}
            className={`w-full h-full opacity-50 ${
              isLight
                ? 'bg-gradient-to-tr from-sky-300/25 via-transparent to-indigo-300/25'
                : isAurora
                ? 'bg-gradient-to-tr from-emerald-200/25 via-transparent to-cyan-200/25'
                : 'bg-gradient-to-tr from-cyan-400/20 via-transparent to-fuchsia-400/20'
            }`}
          />
        </div>

        {/* Individual Icon Node Glass Wells */}
        {items.map((item, idx) => (
          <div
            key={item.id}
            ref={(el) => {
              slotGlassRefs.current[idx] = el;
            }}
            style={{
              width: ITEM_SIZE - 8,
              height: ITEM_SIZE - 8,
              boxShadow: `inset 0 1px 1px rgba(255,255,255,${specular * 0.45})`,
            }}
            className="absolute rounded-full border border-white/15 bg-white/[0.02] transition-colors duration-500"
          />
        ))}

        {/* Sliding Active Placeholder Liquid Droplet Shell */}
        <div
          ref={dropletGlassRef}
          style={{
            width: ITEM_SIZE,
            height: ITEM_SIZE,
            backdropFilter: 'blur(16px) saturate(185%)',
            WebkitBackdropFilter: 'blur(16px) saturate(185%)',
            boxShadow: useDarkInk
              ? `inset 0 1.5px 1px rgba(255,255,255,${Math.min(1, specular + 0.2)}), inset 0 -1.5px 2px rgba(15,23,42,0.16), 0 10px 24px -6px rgba(15,23,42,0.25)`
              : `inset 0 1.5px 1.5px rgba(255,255,255,${Math.min(
                  1,
                  specular + 0.15
                )}), inset 0 -1.5px 2px rgba(255,255,255,${
                  specular * 0.35
                }), 0 12px 28px -6px rgba(0,0,0,0.55)`,
          }}
          className={`absolute rounded-full overflow-hidden border transition-colors duration-500 ${
            isLight
              ? 'border-white/90 bg-white/45'
              : isAurora
              ? 'border-white/70 bg-white/20'
              : 'border-white/45 bg-white/15'
          }`}
        >
          <div
            style={{ filter: `url(#liquid-caustic-${filterId})` }}
            className="w-full h-full opacity-60 bg-gradient-to-tr from-emerald-300/25 via-transparent to-cyan-200/30"
          />
        </div>
      </div>

      {/* LAYER 3: Razor-Sharp Interactive Icon Buttons */}
      <div
        style={{ gap: ITEM_GAP, padding: PADDING }}
        className="relative z-10 flex items-center justify-center"
      >
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeIndex === idx;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (phys.current.suppressNextClick) {
                  phys.current.suppressNextClick = false;
                  return;
                }
                selectIndex(idx);
              }}
              aria-label={item.label}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
              style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
              className={`relative rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 ${
                useDarkInk
                  ? isActive
                    ? 'text-slate-950 scale-110'
                    : 'text-slate-900/65 hover:text-slate-950'
                  : isActive
                  ? 'text-white scale-110'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
