/**
 * search.tsx
 *
 * Optimizations applied vs. previous version:
 *  1. FlatList → FlashList (windowed rendering for large result sets)
 *  2. onViewableItemsChanged wired to MovieCard.isVisible (lazy poster loading)
 *  3. index prop passed for stagger delay
 *  4. Batched result state updates — results are buffered locally and flushed
 *     on a 300 ms interval instead of calling setResults on every folder.
 *     This eliminates O(n²) array spreads and excessive re-renders during search.
 *  5. Minimum 2-char query guard — prevents full-tree crawl on single keystrokes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fetchDirectory } from '../api';
import type { H5aiItem } from '../types';
import MovieCard from '../components/MovieCard';

const COLORS = {
  bg: '#0D0D0D',
  surface: '#181818',
  border: '#2A2A2A',
  red: '#E50914',
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
};

// Start searching from these root directories
const ROOT_DIRS = [
  '/DHAKA-FLIX-7/English Movies/',
  '/DHAKA-FLIX-14/Hindi Movies/',
  '/DHAKA-FLIX-7/Animation Movies/',
];

/** Minimum characters before a search is triggered */
const MIN_QUERY_LENGTH = 2;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<H5aiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scannedFolders, setScannedFolders] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Fix 2: Visibility tracking ────────────────────────────────────────────
  const [visibleHrefs, setVisibleHrefs] = useState<Set<string>>(new Set());
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: H5aiItem }> }) => {
      setVisibleHrefs((prev) => {
        const next = new Set(prev);
        viewableItems.forEach(({ item }) => next.add(item.href));
        return next;
      });
    }
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 20 }).current;

  const startSearch = useCallback(async (searchQuery: string) => {
    // ── Fix 5: Minimum query length guard ─────────────────────────────────
    if (searchQuery.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setScannedFolders(0);
      return;
    }

    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setIsSearching(true);
    setResults([]);
    setScannedFolders(0);
    // Reset visible hrefs when results reset
    setVisibleHrefs(new Set());

    const lowerQuery = searchQuery.toLowerCase();
    const foundItems = new Set<string>();

    // ── Fix 4: Batched result updates ─────────────────────────────────────
    // Instead of spreading a new array on every folder resolved, we buffer
    // new results locally and flush them to React state on a 300 ms interval.
    let resultBuffer: H5aiItem[] = [];
    const flushInterval = setInterval(() => {
      if (resultBuffer.length > 0) {
        const toFlush = resultBuffer;
        resultBuffer = [];
        setResults((prev) => [...prev, ...toFlush]);
      }
    }, 300);

    let queue: string[] = [...ROOT_DIRS];
    let activeRequests = 0;
    const MAX_CONCURRENT = 3;

    await new Promise<void>((resolve) => {
      const processQueue = async () => {
        if (signal.aborted) {
          resolve();
          return;
        }

        if (queue.length === 0 && activeRequests === 0) {
          resolve();
          return;
        }

        while (queue.length > 0 && activeRequests < MAX_CONCURRENT && !signal.aborted) {
          const currentDir = queue.shift()!;
          activeRequests++;

          fetchDirectory(currentDir, signal, false)
            .then((items) => {
              if (signal.aborted) return;

              setScannedFolders((prev) => prev + 1);

              const newFolders: string[] = [];

              for (const item of items) {
                const name = decodeURIComponent(
                  item.href.split('/').filter(Boolean).pop() || ''
                );

                if (item.size === null) {
                  const depth = item.href.split('/').filter(Boolean).length;
                  if (depth <= 4) {
                    newFolders.push(item.href);
                  }

                  if (name.toLowerCase().includes(lowerQuery) && !foundItems.has(item.href)) {
                    foundItems.add(item.href);
                    resultBuffer.push(item);
                  }
                } else {
                  if (name.toLowerCase().includes(lowerQuery) && !foundItems.has(item.href)) {
                    foundItems.add(item.href);
                    resultBuffer.push(item);
                  }
                }
              }

              // DFS-ish: prepend new subfolders for faster perceived results
              queue.unshift(...newFolders);
            })
            .catch(() => {
              // Ignore individual folder errors (404s, timeouts, aborts)
            })
            .finally(() => {
              activeRequests--;
              if (!signal.aborted) {
                processQueue();
              }
            });
        }
      };

      for (let i = 0; i < MAX_CONCURRENT; i++) {
        processQueue();
      }
    }).then(() => {
      // Final flush of any remaining buffered items
      clearInterval(flushInterval);
      if (!signal.aborted) {
        if (resultBuffer.length > 0) {
          setResults((prev) => [...prev, ...resultBuffer]);
        }
        setIsSearching(false);
      }
    });
  }, []);

  // Debounce the search input (600 ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      startSearch(query);
    }, 600);
    return () => clearTimeout(timer);
  }, [query, startSearch]);

  const handleItemPress = useCallback((item: H5aiItem) => {
    if (item.size === null) {
      const parts = item.href.split('/').filter(Boolean);
      router.push((`/browse/${parts.join('/')}`) as any);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search movies (min ${MIN_QUERY_LENGTH} chars)...`}
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress / Status */}
      {query.length >= MIN_QUERY_LENGTH && (
        <View style={styles.statusContainer}>
          {isSearching ? (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={COLORS.red} />
              <Text style={styles.statusText}>
                Searching… ({scannedFolders} folders scanned)
              </Text>
            </View>
          ) : (
            <Text style={styles.statusText}>
              {results.length === 0 ? 'No results found' : `${results.length} results`}
            </Text>
          )}
        </View>
      )}

      {/* Results — FlashList for virtualized rendering */}
      <FlashList
        data={results}
        keyExtractor={(item) => item.href}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => {
          const name = decodeURIComponent(item.href.split('/').filter(Boolean).pop() || '');
          if (item.size === null) {
            return (
              <View style={styles.listItemWrapper}>
                <MovieCard
                  href={item.href}
                  title={name}
                  onPress={() => handleItemPress(item)}
                  width="100%"
                  height={100}
                  layout="list"
                  isVisible={visibleHrefs.has(item.href)}
                  index={index}
                />
              </View>
            );
          }
          // File result
          return (
            <View style={styles.fileItem}>
              <MaterialCommunityIcons name="file-video" size={24} color="#29B6F6" />
              <Text style={styles.fileText} numberOfLines={1}>{name}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    marginLeft: 8,
    height: '100%',
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  listItemWrapper: {
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  fileText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});
