import { AppView } from '../types/spotify';

export interface TransitionOrigin {
  rect: DOMRect;
  imageUrl?: string;
  timestamp: number;
}

let pendingOrigin: TransitionOrigin | null = null;

/**
 * Captures the bounding rectangle of the clicked album/playlist artwork (or card)
 * so the destination hero cover can smoothly FLIP-glide from it.
 */
export function captureTransitionOrigin(
  containerEl?: HTMLElement | null,
  imageUrl?: string
): void {
  if (!containerEl || typeof window === 'undefined') return;
  try {
    const imgEl = containerEl.querySelector('img');
    const target = imgEl || containerEl;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pendingOrigin = {
      rect,
      imageUrl,
      timestamp: Date.now(),
    };
  } catch {
    pendingOrigin = null;
  }
}

export function consumeTransitionOrigin(expectedImageUrl?: string): TransitionOrigin | null {
  const current = pendingOrigin;
  pendingOrigin = null;
  if (!current) return null;
  if (Date.now() - current.timestamp > 1500) return null;
  if (expectedImageUrl && current.imageUrl && current.imageUrl !== expectedImageUrl) {
    // Still allow card-level origin if exact URL differs slightly, otherwise use rect cleanly
    return current;
  }
  return current;
}

/**
 * Runs a GPU-composited FLIP animation (transform + opacity only) from originRect to targetEl.
 */
export function runFlipCoverAnimation(
  targetEl: HTMLElement | null,
  origin: TransitionOrigin | null
): void {
  if (!targetEl || !origin || typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const dest = targetEl.getBoundingClientRect();
    if (dest.width <= 0 || dest.height <= 0) return;

    const dx = origin.rect.left + origin.rect.width / 2 - (dest.left + dest.width / 2);
    const dy = origin.rect.top + origin.rect.height / 2 - (dest.top + dest.height / 2);
    const sx = Math.max(0.25, Math.min(2.0, origin.rect.width / dest.width));
    const sy = Math.max(0.25, Math.min(2.0, origin.rect.height / dest.height));

    if (Math.abs(dx) < 4 && Math.abs(dy) < 4 && Math.abs(sx - 1) < 0.05) return;

    targetEl.animate(
      [
        {
          transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`,
          opacity: 0.72,
        },
        {
          transform: 'translate3d(0, 0, 0) scale(1, 1)',
          opacity: 1,
        },
      ],
      {
        duration: 340,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      }
    );
  } catch {
    // Graceful no-op if Web Animations API is unavailable
  }
}

const ROUTE_ORDER: Record<AppView, number> = {
  home: 0,
  search: 1,
  library: 2,
  playlist: 3,
  downloader: 4,
  about: 4,
};

export function getRouteTransitionClass(fromView: AppView, toView: AppView): string {
  if (fromView === toView) return 'anim-page-fade';
  if (toView === 'playlist' || toView === 'downloader' || toView === 'about') {
    return 'anim-page-forward';
  }
  if (fromView === 'playlist' || fromView === 'downloader' || fromView === 'about') {
    return 'anim-page-back';
  }
  return ROUTE_ORDER[toView] >= ROUTE_ORDER[fromView] ? 'anim-page-right' : 'anim-page-left';
}

let prefetched = false;

/**
 * Warms lazy route JS chunks during idle time after initial paint so view switches
 * animate cleanly on first tap without flashing a Suspense spinner.
 */
export function prefetchRouteChunks(): void {
  if (prefetched || typeof window === 'undefined') return;
  prefetched = true;
  const run = () => {
    void Promise.allSettled([
      import('../components/Search/SearchRoute'),
      import('../components/Playlist/PlaylistRoute'),
      import('../components/Library/LibraryRoute'),
      import('../components/Mobile/MobileNowPlaying'),
      import('../components/Downloader/DownloaderRoute'),
      import('../components/About/AboutRoute'),
    ]);
  };
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(run, { timeout: 1500 });
  } else {
    setTimeout(run, 900);
  }
}
