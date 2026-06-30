/**
 * MovieCard.tsx
 *
 * ARCHITECTURE:
 *   All poster loading is delegated to `posterStore` — a module-level
 *   synchronous cache. This eliminates every class of recycling artifact:
 *
 *   ✅ No blink on recycle  — sync cache lookup gives instant result, no setState(undefined)
 *   ✅ No stale poster      — state initialised from cache on every render of a new href
 *   ✅ No duplicate fetches — posterStore deduplicates concurrent requests for same href
 *   ✅ No cancelled fetches — fetches are global, not tied to component lifetime
 *   ✅ No shimmer for cached items — seen-before items display instantly
 */

import React, { useEffect, useLayoutEffect, useRef, useState, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  getPosterSync,
  subscribePoster,
  ensurePosterFetched,
} from '../utils/posterStore';
import ShimmerPlaceholder from './ShimmerPlaceholder';

interface MovieCardProps {
  href: string;
  title: string;
  onPress: (href: string, title: string) => void;
  width?: number | string;
  height?: number | string;
  layout?: 'grid' | 'list';
  /** Set to true when the card enters the visible viewport. */
  isVisible?: boolean;
  /** Kept for API compatibility — no longer used for stagger delay. */
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
  }: MovieCardProps) => {
    // ── Poster state ─────────────────────────────────────────────────────────
    //
    // Initialised synchronously from the module-level cache.
    // If this href was seen before (even if the component is being recycled),
    // the correct URL is available INSTANTLY — no async, no blink.
    //
    // State values:
    //   undefined → not yet known (show shimmer)
    //   string    → valid image URL
    //   null      → confirmed no poster (show fallback icon)
    const [posterUrl, setPosterUrl] = useState<string | null | undefined>(
      () => getPosterSync(href)
    );

    // Track which href this component is currently rendering.
    // Used to guard stale subscriber callbacks after recycling.
    const activeHref = useRef(href);

    // ── Sync state update on recycle ─────────────────────────────────────────
    //
    // useLayoutEffect fires synchronously BEFORE the browser paints.
    // When FlashList recycles this component with a new href, we immediately
    // read the new href's cached value — so the user sees either the correct
    // poster OR the shimmer in the very first frame. No old-poster flash.
    useLayoutEffect(() => {
      activeHref.current = href;
      // Read synchronously — no async, guaranteed zero-frame delay
      const cached = getPosterSync(href);
      setPosterUrl(cached); // undefined if unknown, string/null if known
    }, [href]);

    // ── Subscribe to store updates + trigger fetch when visible ──────────────
    useEffect(() => {
      const currentHref = href;

      // Subscribe to be notified when this href's poster resolves
      const unsubscribe = subscribePoster(currentHref, () => {
        // Guard: ignore if component was recycled to a different href
        if (activeHref.current !== currentHref) return;
        const url = getPosterSync(currentHref);
        if (url !== undefined) setPosterUrl(url);
      });

      // If already in store, make sure our state is up to date
      const inStore = getPosterSync(currentHref);
      if (inStore !== undefined) {
        setPosterUrl(inStore);
      }

      return unsubscribe;
    }, [href]);

    // ── Trigger fetch when card becomes visible ───────────────────────────────
    useEffect(() => {
      if (!isVisible) return;
      // ensurePosterFetched is a no-op if already cached or already fetching
      ensurePosterFetched(href);
    }, [isVisible, href]);

    // ── Derived display state ─────────────────────────────────────────────────
    const isLoading = posterUrl === undefined;
    const hasImage = typeof posterUrl === 'string';
    const isList = layout === 'list';

    const cleanTitle = title
      .replace(/\s*\(\d{4}\).*$/, '')
      .replace(/\s*\d{3,4}p.*$/, '')
      .replace(/-\s*$/, '')
      .trim();

    return (
      <Pressable
        style={({ pressed }) => [
          isList ? styles.listContainer : styles.gridContainer,
          { width, height } as any,
          pressed && styles.pressed,
        ]}
        onPress={() => onPress(href, cleanTitle)}
      >
        <View style={isList ? styles.listImageContainer : styles.gridImageContainer}>
          {isLoading ? (
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
              transition={250}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.placeholder}>
              <MaterialCommunityIcons name="movie-open" size={32} color="#444" />
            </View>
          )}

          {/* Gradient title overlay — grid mode, image loaded */}
          {!isList && hasImage && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
              locations={[0, 0.45, 1]}
              style={styles.gradientOverlay}
            >
              <Text style={styles.gridTitle} numberOfLines={2}>
                {cleanTitle}
              </Text>
            </LinearGradient>
          )}

          {/* Fallback title — grid mode, no image */}
          {!isList && !hasImage && !isLoading && (
            <View style={styles.gradientOverlay}>
              <Text style={styles.gridTitleDark} numberOfLines={2}>
                {cleanTitle}
              </Text>
            </View>
          )}
        </View>

        {isList && (
          <View style={styles.listTextContainer}>
            <Text style={styles.listTitle} numberOfLines={2}>
              {cleanTitle}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#555"
              style={styles.listChevron}
            />
          </View>
        )}
      </Pressable>
    );
  }
);

MovieCard.displayName = 'MovieCard';
export default MovieCard;

const styles = StyleSheet.create({
  gridContainer: {
    borderRadius: 10,
    backgroundColor: '#181818',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    elevation: 4,
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
