import type { H5aiItem, H5aiApiResponse } from './types';

/**
 * Extracts the server IP dynamically from the path.
 * e.g., "/DHAKA-FLIX-14/..." -> "http://172.16.50.14"
 */
export function getBaseUrlForPath(path: string): string {
  const match = path.match(/\/DHAKA-FLIX-(\d+)\//i);
  if (match && match[1]) {
    return `http://172.16.50.${match[1]}`;
  }
  return 'http://172.16.50.7'; // fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory directory cache with LRU eviction
//
// Previously this was an unbounded Map — every visited folder was held in RAM
// forever. We now cap it at MAX_CACHE_SIZE entries and evict the oldest entry
// when the cap is reached (simple FIFO approximation of LRU is sufficient here
// because Map insertion-order iteration is guaranteed in JS/TS).
// ─────────────────────────────────────────────────────────────────────────────
const MAX_CACHE_SIZE = 150;
const directoryCache = new Map<string, H5aiItem[]>();

function setCacheEntry(key: string, value: H5aiItem[]): void {
  // Evict the oldest entry if we are at capacity
  if (directoryCache.size >= MAX_CACHE_SIZE && !directoryCache.has(key)) {
    const oldestKey = directoryCache.keys().next().value;
    if (oldestKey !== undefined) directoryCache.delete(oldestKey);
  }
  // Re-insert to move to "most recent" position
  directoryCache.delete(key);
  directoryCache.set(key, value);
}

/**
 * Fetches the directory listing from the h5ai server for the given path.
 *
 * @param path - The directory path to fetch (defaults to "/DHAKA-FLIX-7/")
 * @param signal - Optional AbortSignal to cancel the fetch if the user navigates away
 * @param forceRefresh - If true, bypasses the cache and forces a network request
 * @returns A filtered array of {@link H5aiItem} objects.
 */
export async function fetchDirectory(
  path: string = '/DHAKA-FLIX-7/',
  signal?: AbortSignal,
  forceRefresh: boolean = false
): Promise<H5aiItem[]> {
  if (!forceRefresh && directoryCache.has(path)) {
    if (__DEV__) console.log(`[API] Cache hit: ${path}`);
    return directoryCache.get(path)!;
  }

  const baseUrl = getBaseUrlForPath(path);
  const url = `${baseUrl}${path}?`;

  const requestBody = { action: 'get', items: { href: path, what: 1 } };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch directory "${path}": HTTP ${response.status} ${response.statusText}`
    );
  }

  const rawText = await response.text();

  let json: any;
  try {
    json = JSON.parse(rawText);
  } catch (error) {
    if (__DEV__) console.warn(`[API] Failed to parse JSON for: ${path}`);
    throw new Error('Invalid JSON response from server');
  }

  let itemsArray: H5aiItem[] = [];

  if (Array.isArray(json?.items)) {
    itemsArray = json.items;
  } else if (Array.isArray(json)) {
    itemsArray = json as unknown as H5aiItem[];
  } else {
    if (__DEV__) console.warn(`[API] Unexpected response format for: ${path}`);
    return [];
  }

  // Filter out the root entry ("/") and the parent-directory back-link.
  // Decode path once outside the loop to avoid repeated decodeURIComponent calls.
  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {}

  const filtered = itemsArray.filter((item: H5aiItem) => {
    if (item.href === '/') return false;

    let decodedItemHref = item.href;
    try {
      decodedItemHref = decodeURIComponent(item.href);
    } catch {}

    if (!decodedItemHref.startsWith(decodedPath) || decodedItemHref === decodedPath) return false;
    return true;
  });

  setCacheEntry(path, filtered);

  return filtered;
}
