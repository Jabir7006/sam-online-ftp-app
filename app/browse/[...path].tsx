import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchDirectory } from '../../api';
import type { H5aiItem } from '../../types';
import FileItem from '../../components/FileItem';
import MovieCard from '../../components/MovieCard';

// ─────────────────────────────────────────────
// Colour palette
// ─────────────────────────────────────────────
const COLORS = {
  bg: '#0D0D0D',
  surface: '#181818',
  red: '#E50914',
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
  border: '#2A2A2A',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Build the h5ai-style path string from expo-router's catch-all segments.
 * e.g. ["DHAKA-FLIX-7", "Movies"] → "/DHAKA-FLIX-7/Movies/"
 */
function buildPath(segments: string | string[]): string {
  const parts = Array.isArray(segments) ? segments : [segments];
  return '/' + parts.join('/') + '/';
}

/**
 * Derive a human-readable title from the last path segment.
 */
function titleFromSegments(segments: string | string[]): string {
  const parts = Array.isArray(segments) ? segments : [segments];
  const title = parts[parts.length - 1] ?? 'Browse';
  try {
    return decodeURIComponent(title);
  } catch {
    return title;
  }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function FolderViewerScreen() {
  const params = useLocalSearchParams<{ path: string[]; rawHref?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const pathSegments = params.path ?? ['DHAKA-FLIX-7'];
  const currentPath = params.rawHref ?? buildPath(pathSegments);
  const title = titleFromSegments(pathSegments);

  const [items, setItems] = useState<H5aiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // ── Fix 1: Visibility tracking for lazy poster loading ──
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

  // Update the stack header title to the folder name
  useEffect(() => {
    navigation.setOptions({
      title,
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="folder-open" size={18} color={COLORS.red} />
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ),
    });
  }, [navigation, title]);

  const loadData = useCallback(
    async (isRefresh = false, signal?: AbortSignal) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const data = await fetchDirectory(currentPath, signal, isRefresh);
        if (signal?.aborted) return; // Prevent setting state if aborted during parsing
        setItems(data);
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Ignore aborted requests entirely
        const msg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(msg);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentPath]
  );

  useEffect(() => {
    const controller = new AbortController();
    
    // Delay loading data until screen transition animation is complete
    // The slide_from_right animation takes about 350ms.
    // This prevents the screen from freezing while sliding in.
    const timeoutId = setTimeout(() => {
      loadData(false, controller.signal);
    }, 350);
    
    // Cleanup function aborts the API call if the component unmounts (e.g., user hits back button)
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadData]);

  // ── Navigate into a subfolder ──
  const handleItemPress = useCallback((item: H5aiItem) => {
    if (item.size !== null) {
      // It's a file — extract the filename to pass to the player
      const fileName = item.href.split('/').filter(Boolean).pop() || 'Unknown Video';
      const decodedName = decodeURIComponent(fileName);
      
      // Delay navigation slightly to prevent JS thread locking
      requestAnimationFrame(() => {
        router.push({
          pathname: '/player',
          params: { rawHref: item.href, title: decodedName }
        });
      });
      return;
    }
    // It's a folder
    // item.href is like "/DHAKA-FLIX-7/Movies%202024/"
    let navPath = item.href;
    if (navPath.startsWith('/')) {
      navPath = navPath.slice(1);
    }
    navPath = navPath.replace(/\/$/, ''); // remove trailing slash for building route

    router.push({
      pathname: `/browse/${navPath}`,
      params: { rawHref: item.href }
    });
  }, []);

  // ── Empty state ──
  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="folder-open-outline" size={64} color={COLORS.border} />
        <Text style={styles.emptyTitle}>Empty Folder</Text>
        <Text style={styles.emptySubtitle}>No items found.</Text>
      </View>
    );
  }, [loading]);

  const [gridColumns, setGridColumns] = useState<1 | 2 | 3>(3);
  const [searchQuery, setSearchQuery] = useState('');
  const { width: screenWidth } = useWindowDimensions();

  // ── Auto-detect if this is a Movie Grid or a standard Folder/File List ──
  const isMovieGrid = useMemo(() => {
    if (items.length === 0) return false;
    
    let yearFolderCount = 0;
    let regularFolderCount = 0;
    let fileCount = 0;

    items.forEach(item => {
      if (item.size !== null) {
        fileCount++;
      } else {
        const name = decodeURIComponent(item.href.split('/').filter(Boolean).pop() || '');
        if (name.match(/^\(\d{4}(?:-\d{4})?\)$/)) {
          yearFolderCount++;
        } else {
          regularFolderCount++;
        }
      }
    });

    if (yearFolderCount > 0 && yearFolderCount >= regularFolderCount) return false;
    if (fileCount > regularFolderCount) return false;
    return regularFolderCount > 0;
  }, [items]);

  // ── Local Filter ──
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const lowerQuery = searchQuery.toLowerCase();
    return items.filter(item => {
      const name = decodeURIComponent(item.href.split('/').filter(Boolean).pop() || '').toLowerCase();
      return name.includes(lowerQuery);
    });
  }, [items, searchQuery]);

  // ── Error state ──
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={COLORS.red} />
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.red} />
        <Text style={styles.loadingText}>Loading {title}…</Text>
      </View>
    );
  }

  // ── Path breadcrumb header ──
  const breadcrumb = currentPath;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* Search & Breadcrumb Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search this folder..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.breadcrumbBar}>
        <MaterialCommunityIcons name="server-network" size={14} color={COLORS.red} />
        <Text style={styles.breadcrumbText} numberOfLines={1} ellipsizeMode="head">
          {breadcrumb}
        </Text>
        <Text style={styles.countBadge}>{filteredItems.length}</Text>
        
        {isMovieGrid && (
          <View style={styles.gridToggles}>
             <TouchableOpacity onPress={() => setGridColumns(1)} style={styles.toggleBtn}>
                <MaterialCommunityIcons name="view-list" size={22} color={gridColumns === 1 ? COLORS.red : COLORS.textSecondary} />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setGridColumns(2)} style={styles.toggleBtn}>
                <MaterialCommunityIcons name="view-grid-outline" size={22} color={gridColumns === 2 ? COLORS.red : COLORS.textSecondary} />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setGridColumns(3)} style={styles.toggleBtn}>
                <MaterialCommunityIcons name="view-grid" size={22} color={gridColumns === 3 ? COLORS.red : COLORS.textSecondary} />
             </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main list */}
      <FlashList
        // FlashList requires a unique key if numColumns changes, so we force a remount
        key={isMovieGrid ? `grid-${gridColumns}` : 'list'}
        data={filteredItems}
        keyExtractor={(item) => item.href}
        numColumns={isMovieGrid ? gridColumns : 1}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={renderEmpty}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
        contentContainerStyle={isMovieGrid ? styles.gridContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          if (isMovieGrid && item.size === null) {
            const fileName = item.href.split('/').filter(Boolean).pop() || 'Unknown';
            const decodedName = decodeURIComponent(fileName);
            
            // Calculate dynamic sizing based on grid columns
            let cardWidth: number | string = 110;
            let cardHeight: number | string = 160;
            const isList = gridColumns === 1;
            
            if (gridColumns === 3) {
              cardWidth = (screenWidth - 16) / 3 - 8;
              cardHeight = (cardWidth as number) * 1.5;
            } else if (gridColumns === 2) {
              cardWidth = (screenWidth - 16) / 2 - 12;
              cardHeight = (cardWidth as number) * 1.5;
            } else if (gridColumns === 1) {
              cardWidth = '100%';
              cardHeight = 101; // 85 (image) + 16 (padding)
            }

            return (
              <View style={isList ? styles.listItemWrapper : styles.gridItemWrapper}>
                <MovieCard 
                  href={item.href}
                  title={decodedName}
                  onPress={(href) => handleItemPress(item)}
                  width={cardWidth}
                  height={cardHeight}
                  layout={isList ? 'list' : 'grid'}
                  isVisible={visibleHrefs.has(item.href)}
                  index={index}
                />
              </View>
            );
          }
          // Default list item rendering
          return <FileItem item={item} onPress={handleItemPress} />;
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // ── Header ──
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 220,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    flexShrink: 1,
  },
  // ── Search Bar ──
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111111',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    marginLeft: 8,
    height: '100%',
  },
  // ── Breadcrumb ──
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breadcrumbText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.red,
    backgroundColor: '#2A0A0A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  gridToggles: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  // ── List ──
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  gridContent: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 8,
  },
  gridItemWrapper: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  listItemWrapper: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  // ── States ──
  centeredContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  errorTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  errorSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
