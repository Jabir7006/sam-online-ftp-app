/**
 * posterStore.ts
 *
 * A module-level synchronous poster cache + async fetcher.
 *
 * WHY THIS EXISTS:
 * Putting async data fetching inside a FlashList-recycled component causes
 * inevitable visual artifacts:
 *   1. setState(undefined) → shows shimmer briefly even for cached items
 *   2. Aborted fetches leave stale state on recycled components
 *   3. Multiple components for the same href each race to fetch the same URL
 *
 * HOW THIS WORKS:
 *   - memoryCache: Map<href, url | null>
 *       Synchronous. Checked before any state update. Zero async delay.
 *   - subscribers: Set of callbacks per href, called when a fetch completes.
 *   - pendingFetches: Deduplication — only ONE fetch ever runs per href.
 *   - Components read from memoryCache synchronously on mount/recycle.
 *     If found → instant display, NO shimmer, NO blink.
 *     If not found → shimmer shown while fetch runs in background.
 */

import { fetchDirectory, getBaseUrlForPath } from '../api';
import { posterLimiter } from './posterLimiter';
import { getCachedPosterUrl, cachePosterUrl } from './posterCache';

// ─── Synchronous in-memory store ──────────────────────────────────────────────
// string  = resolved poster URL
// null    = confirmed no poster exists for this folder
// (absent) = not yet fetched
const memoryCache = new Map<string, string | null>();

// Active fetches — href → promise (for deduplication)
const pendingFetches = new Map<string, Promise<void>>();

// Subscribers — href → Set of callbacks (notified when fetch completes)
const subscribers = new Map<string, Set<() => void>>();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Synchronously reads the poster URL for a given href.
 * Returns `undefined` if not yet known (fetch not started or still pending).
 */
export function getPosterSync(href: string): string | null | undefined {
  if (memoryCache.has(href)) return memoryCache.get(href);
  return undefined;
}

/**
 * Subscribe to poster resolution for a given href.
 * `callback` is called when the poster URL becomes known (or confirmed absent).
 * Returns an unsubscribe function.
 */
export function subscribePoster(href: string, callback: () => void): () => void {
  if (!subscribers.has(href)) subscribers.set(href, new Set());
  subscribers.get(href)!.add(callback);
  return () => {
    subscribers.get(href)?.delete(callback);
    // Clean up empty sets to avoid memory leaks
    if (subscribers.get(href)?.size === 0) subscribers.delete(href);
  };
}

/**
 * Ensures a poster fetch is running for the given href.
 * Safe to call multiple times — subsequent calls for the same href are no-ops
 * while a fetch is in flight or after it has completed.
 */
export function ensurePosterFetched(href: string): void {
  // Already in sync cache — nothing to do
  if (memoryCache.has(href)) return;
  // Already fetching — nothing to do
  if (pendingFetches.has(href)) return;

  const promise = (async () => {
    try {
      // 1. Check AsyncStorage disk cache (fast path — avoids network call)
      const cached = await getCachedPosterUrl(href);
      if (cached !== undefined) {
        memoryCache.set(href, cached);
        notifySubscribers(href);
        return;
      }

      // 2. Fetch directory listing from server (rate-limited)
      const items = await posterLimiter.run(() => fetchDirectory(href));

      const imageFile = items.find(
        (i) =>
          i.size !== null &&
          (i.href.toLowerCase().endsWith('.jpg') ||
            i.href.toLowerCase().endsWith('.jpeg') ||
            i.href.toLowerCase().endsWith('.png'))
      );

      const resolvedUrl = imageFile
        ? `${getBaseUrlForPath(imageFile.href)}${imageFile.href}`
        : null;

      memoryCache.set(href, resolvedUrl);
      cachePosterUrl(href, resolvedUrl); // persist to AsyncStorage
      notifySubscribers(href);
    } catch {
      // On error: don't cache — allow retry next time this href is requested
      // Just notify subscribers so they can show the fallback icon
      memoryCache.set(href, null);
      notifySubscribers(href);
    } finally {
      pendingFetches.delete(href);
    }
  })();

  pendingFetches.set(href, promise);
}

/** Pre-warm the memory cache from AsyncStorage for a list of hrefs. */
export async function prewarmCache(hrefs: string[]): Promise<void> {
  await Promise.all(
    hrefs
      .filter((href) => !memoryCache.has(href))
      .map(async (href) => {
        const cached = await getCachedPosterUrl(href);
        if (cached !== undefined) {
          memoryCache.set(href, cached);
        }
      })
  );
}

// ─── Internal ─────────────────────────────────────────────────────────────────
function notifySubscribers(href: string): void {
  subscribers.get(href)?.forEach((cb) => cb());
}
