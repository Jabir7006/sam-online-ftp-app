/**
 * MovieCard.tsx
 *
 * Optimizations applied:
 *  1. Visibility-based lazy loading — poster is only fetched when the card
 *     scrolls into view (`isVisible` prop). Off-screen cards do nothing.
 *  2. Concurrency limiter — at most 5 poster requests run simultaneously
 *     (via posterLimiter), preventing server floods on large folders.
 *  3. Persistent disk cache — resolved poster URLs are stored in AsyncStorage
 *     with a 7-day TTL. Negative results (no poster found) are also cached
 *     so we never re-probe the same folder.
 *  4. Stagger delay — each card waits `index * 40 ms` before starting its
 *     fetch, smoothing out the initial burst.
 *  5. Shimmer skeleton — replaces the per-card ActivityIndicator with a
 *     smooth pulsing placeholder for a far better loading UX.
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { fetchDirectory, getBaseUrlForPath } from '../api';
import { posterLimiter } from '../utils/posterLimiter';
import { getCachedPosterUrl, cachePosterUrl } from '../utils/posterCache';
import ShimmerPlaceholder from './ShimmerPlaceholder';

interface MovieCardProps {
  href: string;
  title: string;
  onPress: (href: string, title: string) => void;
  width?: number | string;
  height?: number | string;
  layout?: 'grid' | 'list';
  /** Whether this card is currently in the visible viewport */
  isVisible?: boolean;
  /** Card index in the list — used for stagger delay */
  index?: number;
}

const MovieCard = memo(
  ({
    href,
    title,
    onPress,
    width = 120,
    height = 180,
    layout = 'grid',
    isVisible = false,
    index = 0,
  }: MovieCardProps) => {
    /**
     * posterUrl state:
     *  - undefined  → not yet resolved (show shimmer)
     *  - string     → valid URL (show image)
     *  - null       → confirmed no poster (show fallback icon)
     */
    const [posterUrl, setPosterUrl] = useState<string | null | undefined>(undefined);
    const hasFetched = useRef(false);

    // Clean up the title (remove year suffix, resolution tags, trailing dashes)
    const cleanTitle = title
      .replace(/\s*\(\d{4}\).*$/, '')
      .replace(/\s*\d{3,4}p.*$/, '')
      .replace(/-\s*$/, '')
      .trim();

    const isList = layout === 'list';

    useEffect(() => {
      // Only start loading once the card is visible AND we haven't fetched yet
      if (!isVisible || hasFetched.current) return;
      hasFetched.current = true;

      const controller = new AbortController();
      let isMounted = true;

      const loadPoster = async () => {
        // ── Fix 3: Check persistent cache first ──────────────────────────────
        const cached = await getCachedPosterUrl(href);
        if (!isMounted || controller.signal.aborted) return;

        if (cached !== undefined) {
          // Cache hit (string URL or null negative-cache)
          setPosterUrl(cached);
          return;
        }

        // ── Fix 4: Stagger delay ─────────────────────────────────────────────
        const staggerMs = Math.min(index * 40, 1200); // cap at 1.2 s
        if (staggerMs > 0) {
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, staggerMs);
            controller.signal.addEventListener('abort', () => clearTimeout(t));
          });
        }
        if (!isMounted || controller.signal.aborted) return;

        // ── Fix 2: Rate-limited fetch ────────────────────────────────────────
        try {
          const items = await posterLimiter.run(() =>
            fetchDirectory(href, controller.signal)
          );

          if (!isMounted || controller.signal.aborted) return;

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

          setPosterUrl(resolvedUrl);

          // ── Fix 3: Persist result to disk (including null = no poster) ────
          cachePosterUrl(href, resolvedUrl);
        } catch (err: any) {
          if (!controller.signal.aborted) {
            console.warn(`[MovieCard] Failed to load poster for "${title}":`, err?.message);
            setPosterUrl(null);
            // Cache the failure so we don't retry on next render
            cachePosterUrl(href, null);
          }
        }
      };

      loadPoster();

      return () => {
        isMounted = false;
        controller.abort();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, href]);

    // ── Derived display state ────────────────────────────────────────────────
    const isLoading = posterUrl === undefined; // still unknown
    const hasImage = typeof posterUrl === 'string';

    return (
      <Pressable
        style={({ pressed }) => [
          isList ? styles.listContainer : styles.gridContainer,
          { width, height } as any,
          pressed && styles.pressed,
        ]}
        onPress={() => onPress(href, cleanTitle)}
      >
        {/* Image / Skeleton / Fallback */}
        <View style={isList ? styles.listImageContainer : styles.gridImageContainer}>
          {isLoading ? (
            // ── Fix 5: Shimmer skeleton ──────────────────────────────────────
            <ShimmerPlaceholder
              width="100%"
              height="100%"
              borderRadius={isList ? 6 : 0}
            />
          ) : hasImage ? (
            <Image
              source={posterUrl!}
              style={styles.image}
              contentFit="cover"
              transition={300}
              cachePolicy="disk"
            />
          ) : (
            <View style={styles.placeholder}>
              <MaterialCommunityIcons name="movie-open" size={32} color="#444" />
            </View>
          )}

          {/* Gradient title overlay (grid mode only, shown when image loaded) */}
          {!isList && hasImage && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
              locations={[0, 0.4, 1]}
              style={styles.gradientOverlay}
            >
              <Text style={styles.gridTitle} numberOfLines={2}>
                {cleanTitle}
              </Text>
            </LinearGradient>
          )}

          {/* Show title over shimmer / fallback in grid mode too */}
          {!isList && !hasImage && !isLoading && (
            <View style={styles.gradientOverlay}>
              <Text style={styles.gridTitleDark} numberOfLines={2}>
                {cleanTitle}
              </Text>
            </View>
          )}
        </View>

        {/* List-mode text row */}
        {isList && (
          <View style={styles.listTextContainer}>
            <Text style={styles.listTitle} numberOfLines={2}>
              {cleanTitle}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#555" style={styles.listChevron} />
          </View>
        )}
      </Pressable>
    );
  }
);

export default MovieCard;

const styles = StyleSheet.create({
  // ── Grid Layout ──────────────────────────────────────────────────────────
  gridContainer: {
    borderRadius: 10,
    backgroundColor: '#181818',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  gridImageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    justifyContent: 'flex-end',
    padding: 10,
  },
  gridTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridTitleDark: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },

  // ── List Layout ──────────────────────────────────────────────────────────
  listContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#181818',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    padding: 8,
  },
  listImageContainer: {
    width: 60,
    height: 85,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  listTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
  },
  listTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  listChevron: {
    marginLeft: 8,
  },

  // ── Shared ───────────────────────────────────────────────────────────────
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
