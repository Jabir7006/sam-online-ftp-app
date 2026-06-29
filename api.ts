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

// Simple in-memory cache to ensure instant loading of previously visited directories
const directoryCache = new Map<string, H5aiItem[]>();

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
    console.log(`[API] Returning cached data for: ${path}`);
    return directoryCache.get(path)!;
  }

  const baseUrl = getBaseUrlForPath(path);
  const url = `${baseUrl}${path}?`;

  const requestBody = { action: 'get', items: { href: path, what: 1 } };
  console.log(`[API] Request Body:`, requestBody);

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
  console.log(`[API] Request URL: ${url}`);
  
  let json: any;
  try {
    json = JSON.parse(rawText);
  } catch (error) {
    console.warn(`[API] Failed to parse JSON response. Received text: ${rawText}`);
    throw new Error('Invalid JSON response from server');
  }

  let itemsArray: H5aiItem[] = [];

  if (Array.isArray(json?.items)) {
    console.log(`[API] Successfully received ${json.items.length} items`);
    itemsArray = json.items;
  } else if (Array.isArray(json)) {
    console.log(`[API] Successfully received ${json.length} items (direct array)`);
    itemsArray = json as unknown as H5aiItem[];
  } else {
    console.warn(
      `Unexpected API response format. Returning empty array. Received:`,
      json
    );
    return [];
  }

  // Filter out the root entry ("/") and the parent-directory back-link
  // (the parent back-link always has an href that does NOT start with `path`
  // but is a different, shorter path — or it exactly equals "/").
  const filtered = itemsArray.filter((item: H5aiItem) => {
    if (item.href === '/') return false;
    
    // Decode both item.href and path before comparison 
    // to avoid encoded vs decoded mismatches (e.g. "%20" vs " ")
    let decodedItemHref = item.href;
    let decodedPath = path;
    try {
      decodedItemHref = decodeURIComponent(item.href);
      decodedPath = decodeURIComponent(path);
    } catch {}

    if (!decodedItemHref.startsWith(decodedPath) || decodedItemHref === decodedPath) return false;
    return true;
  });

  // Save to cache before returning
  directoryCache.set(path, filtered);
  
  return filtered;
}
