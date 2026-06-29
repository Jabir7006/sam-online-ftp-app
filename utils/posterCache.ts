/**
 * posterCache.ts
 *
 * A persistent, TTL-aware cache for resolved movie poster URLs.
 * Uses AsyncStorage so the cache survives app restarts.
 *
 * The cache stores:
 *   key  → `poster_v1_<href>`
 *   value → JSON: { url: string | null, timestamp: number }
 *
 * `null` url means we previously checked and found NO poster (negative cache),
 * so we won't hammer the server with repeat failed lookups.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'poster_v1_';
/** Cache entries expire after 7 days */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  url: string | null;
  timestamp: number;
}

/**
 * Returns the cached poster URL for a given movie href.
 * - Returns `string` if a valid poster URL is cached.
 * - Returns `null` if we've previously confirmed no poster exists.
 * - Returns `undefined` if there is no cache entry (or it is stale).
 */
export async function getCachedPosterUrl(href: string): Promise<string | null | undefined> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + href);
    if (!raw) return undefined;

    const entry: CacheEntry = JSON.parse(raw);

    // Treat stale entries as a cache miss
    if (Date.now() - entry.timestamp > TTL_MS) {
      // Fire-and-forget removal; no need to await
      AsyncStorage.removeItem(CACHE_PREFIX + href).catch(() => {});
      return undefined;
    }

    return entry.url; // could be string or null (negative cache)
  } catch {
    return undefined;
  }
}

/**
 * Saves the resolved poster URL (or null for a confirmed miss) to persistent storage.
 */
export async function cachePosterUrl(href: string, url: string | null): Promise<void> {
  try {
    const entry: CacheEntry = { url, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + href, JSON.stringify(entry));
  } catch {
    // Storage errors are non-fatal — silently ignore
  }
}

/**
 * Clears all cached poster entries. Useful for a "clear cache" settings option.
 */
export async function clearPosterCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const posterKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (posterKeys.length > 0) {
      await AsyncStorage.multiRemove(posterKeys);
    }
  } catch {}
}
