import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchDirectory } from '../../api';
import type { H5aiItem } from '../../types';
import FileItem from '../../components/FileItem';

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
      // It's a file — show an alert for now (can be expanded to a media player)
      Alert.alert('File Selected', item.href, [{ text: 'OK' }]);
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
      {/* Breadcrumb strip */}
      <View style={styles.breadcrumbBar}>
        <MaterialCommunityIcons name="server-network" size={14} color={COLORS.red} />
        <Text style={styles.breadcrumbText} numberOfLines={1} ellipsizeMode="head">
          {breadcrumb}
        </Text>
        <Text style={styles.countBadge}>{items.length}</Text>
      </View>

      {/* Main list */}
      <FlashList
        data={items}
        keyExtractor={(item) => item.href}
        renderItem={({ item }) => (
          <FileItem item={item} onPress={handleItemPress} />
        )}
        estimatedItemSize={78}
        ListEmptyComponent={renderEmpty}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  // ── List ──
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
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
