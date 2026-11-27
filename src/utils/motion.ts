import { AppView } from '../types/spotify';

export interface TransitionOrigin {
  rect: DOMRect;
  imageUrl?: string;
  timestamp: number;
}

let pendingOrigin: TransitionOrigin | null = null;
let miniPlayerArtworkEl: HTMLElement | null = null;
let miniPlayerContainerEl: HTMLElement | null = null;
let miniPlayerBounceEl: HTMLElement | null = null;

/**
 * Registers the mini-player's outer pill container so the full player can
 * morph out of it on open and collapse back into it on close.
 */
export function registerMiniPlayerContainer(
  el: HTMLElement | null,
  bounceEl: HTMLElement | null = el
): void {
  miniPlayerContainerEl = el;
  miniPlayerBounceEl = bounceEl;
}

/**
 * Plays a tactile squash-and-rebound "catch" bounce on the mini-player
 * right as the collapsing full player lands back into it.
 */
export function triggerMiniPlayerCatchBounce(): void {
  const target = miniPlayerBounceEl || miniPlayerContainerEl;
  if (!target || typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    target.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)', offset: 0 },
        { transform: 'translate3d(0, 3.5px, 0) scale3d(1.038, 0.925, 1)', offset: 0.32 },
        { transform: 'translate3d(0, -1.5px, 0) scale3d(0.985, 1.022, 1)', offset: 0.68 },
        { transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)', offset: 1 },
      ],
      {
        duration: 320,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'none',
      }
    );
  } catch {
    // Graceful no-op
  }
}

export function hasMiniPlayerContainer(): boolean {
  if (!miniPlayerContainerEl || typeof window === 'undefined') return false;
  try {
    const r = miniPlayerContainerEl.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  } catch {
    return false;
  }
}

function getClipInsetFromRect(containerRect: DOMRect, pillRect: DOMRect): string {
  const top = Math.max(0, pillRect.top - containerRect.top);
  const right = Math.max(0, containerRect.right - pillRect.right);
  const bottom = Math.max(0, containerRect.bottom - pillRect.bottom);
  const left = Math.max(0, pillRect.left - containerRect.left);
  const radius = Math.min(36, Math.round(pillRect.height / 2));
  return `inset(${top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px round ${radius}px)`;
}

/**
 * Container Transform (Open): expands the full player sheet directly from the
 * mini-player pill bounds using GPU-composited clip-path + transform + opacity.
 */
export function runContainerOpenFromMiniPlayer(sheetEl: HTMLElement | null): boolean {
  if (!sheetEl || !miniPlayerContainerEl || typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    const pill = miniPlayerContainerEl.getBoundingClientRect();
    const sheet = sheetEl.getBoundingClientRect();
    if (pill.width <= 0 || pill.height <= 0 || sheet.width <= 0 || sheet.height <= 0) return false;

    const dx = pill.left + pill.width / 2 - (sheet.left + sheet.width / 2);
    const dy = pill.top + pill.height / 2 - (sheet.top + sheet.height / 2);
    const clipStart = getClipInsetFromRect(sheet, pill);

    sheetEl.animate(
      [
        {
          clipPath: clipStart,
          transform: `translate3d(${(dx * 0.14).toFixed(1)}px, ${(dy * 0.14).toFixed(1)}px, 0) scale(0.95)`,
          opacity: 0.45,
        },
        {
          clipPath: 'inset(0px 0px 0px 0px round 0px)',
          transform: 'translate3d(0, 0, 0) scale(1)',
          opacity: 1,
        },
      ],
      {
        duration: 340,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'backwards',
      }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Container Transform (Close): collapses the full player sheet directly back
 * into the mini-player pill bounds.
 */
export function runContainerCloseToMiniPlayer(sheetEl: HTMLElement | null): boolean {
  if (!sheetEl || !miniPlayerContainerEl || typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    const pill = miniPlayerContainerEl.getBoundingClientRect();
    const sheet = sheetEl.getBoundingClientRect();
    if (pill.width <= 0 || pill.height <= 0 || sheet.width <= 0 || sheet.height <= 0) return false;

    const dx = pill.left + pill.width / 2 - (sheet.left + sheet.width / 2);
    const dy = pill.top + pill.height / 2 - (sheet.top + sheet.height / 2);
    const clipEnd = getClipInsetFromRect(sheet, pill);

    sheetEl.animate(
      [
        {
          clipPath: 'inset(0px 0px 0px 0px round 0px)',
          transform: 'translate3d(0, 0, 0) scale(1)',
          opacity: 1,
        },
        {
          clipPath: clipEnd,
          transform: `translate3d(${(dx * 0.14).toFixed(1)}px, ${(dy * 0.14).toFixed(1)}px, 0) scale(0.94)`,
          opacity: 0.12,
        },
      ],
      {
        duration: 255,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
        fill: 'forwards',
      }
    );
    window.setTimeout(() => {
      triggerMiniPlayerCatchBounce();
    }, 190);
    return true;
  } catch {
    return false;
  }
}

/**
 * Registers the mini-player's left artwork element so closing the full player
 * can run a reverse shared-element FLIP back into it.
 */
export function registerMiniPlayerArtwork(el: HTMLElement | null): void {
  miniPlayerArtworkEl = el;
}

/**
 * Runs a reverse GPU-composited FLIP animation from the full player artwork
 * back into the mini-player's left artwork slot.
 */
export function runFlipToMiniPlayer(sourceEl: HTMLElement | null): void {
  if (!sourceEl || !miniPlayerArtworkEl || typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const src = sourceEl.getBoundingClientRect();
    const dest = miniPlayerArtworkEl.getBoundingClientRect();
    if (src.width <= 0 || src.height <= 0 || dest.width <= 0 || dest.height <= 0) return;

    const dx = dest.left + dest.width / 2 - (src.left + src.width / 2);
    // Account for the parent sheet's ~48px downward exit travel
    const dy = dest.top + dest.height / 2 - (src.top + src.height / 2) - 44;
    const sx = Math.max(0.15, Math.min(1.5, dest.width / src.width));
    const sy = Math.max(0.15, Math.min(1.5, dest.height / src.height));

    sourceEl.animate(
      [
        {
          transform: 'translate3d(0, 0, 0) scale(1, 1)',
          opacity: 1,
        },
        {
          transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`,
          opacity: 0.7,
        },
      ],
      {
        duration: 245,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
        fill: 'forwards',
      }
    );
  } catch {
    // Graceful no-op
  }
}

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
