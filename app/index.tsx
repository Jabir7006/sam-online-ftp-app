/**
 * index.tsx — SAM FLIX Home Screen
 *
 * Redesigned with:
 *  - Large hero banner featuring the first category
 *  - Animated entrance (fade + slide up) for header and cards
 *  - Featured card (full-width hero) + supporting grid cards
 *  - Rich gradient overlays, category count badges, accent colors
 *  - expo-image with disk caching for all images
 *  - Micro-animations on press (scale + brightness)
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Animated,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#080808',
  surface: '#141414',
  surfaceHigh: '#1E1E1E',
  border: '#272727',
  red: '#E50914',
  redDim: '#9B0610',
  gold: '#F5A623',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#606060',
};

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'english',
    title: 'English Movies',
    subtitle: 'Hollywood Blockbusters',
    href: '/DHAKA-FLIX-7/English%20Movies/',
    accentColor: '#1A6EFF',
    icon: 'movie-open' as const,
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'hindi',
    title: 'Hindi Movies',
    subtitle: 'Bollywood Hits',
    href: '/DHAKA-FLIX-14/Hindi%20Movies/',
    accentColor: '#FF6B35',
    icon: 'filmstrip' as const,
    posterUrl: 'https://images.unsplash.com/photo-1570534279782-b7e2cc4a34b4?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'bangla',
    title: 'Kolkata Bangla',
    subtitle: 'Bengali Cinema',
    href: '/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/',
    accentColor: '#00C9A7',
    icon: 'theater' as const,
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'foreign',
    title: 'Foreign Language',
    subtitle: 'World Cinema',
    href: '/DHAKA-FLIX-7/Foreign%20Language%20Movies/',
    accentColor: '#9B59B6',
    icon: 'earth' as const,
    posterUrl: require('../assets/categories/foreign.jpg'),
  },
  {
    id: '3d',
    title: '3D Movies',
    subtitle: 'Immersive Experience',
    href: '/DHAKA-FLIX-7/3D%20Movies/',
    accentColor: '#00D4FF',
    icon: 'video-3d' as const,
    posterUrl: require('../assets/categories/three_d.jpg'),
  },
  {
    id: 'animation',
    title: 'Animation',
    subtitle: 'Animated Features',
    href: '/DHAKA-FLIX-14/Animation%20Movies/',
    accentColor: '#FFD700',
    icon: 'palette' as const,
    posterUrl: 'https://images.unsplash.com/photo-1580477667995-15608401ed8a?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'south_indian',
    title: 'South Indian',
    subtitle: 'Tollywood & More',
    href: '/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/',
    accentColor: '#FF9F43',
    icon: 'star-four-points' as const,
    posterUrl: require('../assets/categories/south_indian.jpg'),
  },
];

type Category = (typeof CATEGORIES)[0];

// ─── TV Series ────────────────────────────────────────────────────────────────
const TV_SERIES = [
  {
    id: 'tv_web',
    title: 'TV & WEB Series',
    subtitle: 'Binge-worthy Shows',
    href: '/DHAKA-FLIX-12/TV-WEB-Series/',
    accentColor: '#6C63FF',
    icon: 'television-play' as const,
    posterUrl: require('../assets/categories/tv_web.jpg'),
  },
  {
    id: 'korean',
    title: 'Korean TV & WEB',
    subtitle: 'K-Drama & K-Pop',
    href: '/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/',
    accentColor: '#FF6B9D',
    icon: 'heart-pulse' as const,
    posterUrl: require('../assets/categories/korean.jpg'),
  },
  {
    id: 'cartoon',
    title: 'Cartoon TV Series',
    subtitle: 'Animated Adventures',
    href: '/DHAKA-FLIX-7/Cartoon%20TV%20Series/',
    accentColor: '#FFD700',
    icon: 'emoticon-happy' as const,
    posterUrl: require('../assets/categories/cartoon.jpg'),
  },
];

type TvSeries = (typeof TV_SERIES)[0];

// ─── Animated Category Card ───────────────────────────────────────────────────
const CategoryCard = React.memo(
  ({
    item,
    onPress,
    delay,
    variant,
  }: {
    item: Category;
    onPress: (href: string) => void;
    delay: number;
    variant: 'hero' | 'wide' | 'grid';
  }) => {
    const { width } = useWindowDimensions();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const handlePressIn = () =>
      Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    const handlePressOut = () =>
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

    const cardHeight = variant === 'hero' ? 260 : variant === 'wide' ? 150 : 150;
    const cardWidth = variant === 'hero' ? width - 32 : variant === 'wide' ? width - 32 : (width - 48) / 2;

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          width: cardWidth,
          height: cardHeight,
          marginBottom: 12,
        }}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => onPress(item.href)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {/* Background Image */}
          <Image
            source={item.posterUrl}
            style={styles.cardImage}
            contentFit="cover"
            transition={600}
            cachePolicy="memory-disk"
          />

          {/* Dark vignette gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.88)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Accent top-left glow */}
          <View
            style={[
              styles.accentGlow,
              { backgroundColor: item.accentColor + '40', borderColor: item.accentColor + '60' },
            ]}
          >
            <MaterialCommunityIcons name={item.icon} size={16} color={item.accentColor} />
          </View>

          {/* Bottom info */}
          <View style={styles.cardInfo}>
            <View style={[styles.accentBar, { backgroundColor: item.accentColor }]} />
            <Text style={variant === 'hero' ? styles.heroTitle : styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>

          {/* Play chevron */}
          <View style={styles.chevronWrap}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

// ─── TvCard — same as CategoryCard but accepts TvSeries type ───────────────────────────
const TvCard = React.memo(
  ({
    item,
    onPress,
    delay,
    variant,
  }: {
    item: TvSeries;
    onPress: (href: string) => void;
    delay: number;
    variant: 'hero' | 'grid';
  }) => {
    const { width } = useWindowDimensions();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
      ]).start();
    }, []);

    const handlePressIn = () =>
      Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    const handlePressOut = () =>
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

    const cardHeight = variant === 'hero' ? 200 : 148;
    const cardWidth = variant === 'hero' ? width - 32 : (width - 48) / 2;

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          width: cardWidth,
          height: cardHeight,
          marginBottom: 12,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => onPress(item.href)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Image
            source={item.posterUrl}
            style={styles.cardImage}
            contentFit="cover"
            transition={600}
            cachePolicy="memory-disk"
          />

          {/* Purple-toned vignette for TV section */}
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.0)',
              `${item.accentColor}18`,
              'rgba(0,0,0,0.85)',
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Icon badge */}
          <View
            style={[
              styles.accentGlow,
              { backgroundColor: item.accentColor + '35', borderColor: item.accentColor + '55' },
            ]}
          >
            <MaterialCommunityIcons name={item.icon} size={15} color={item.accentColor} />
          </View>

          {/* Bottom info */}
          <View style={styles.cardInfo}>
            <View style={[styles.accentBar, { backgroundColor: item.accentColor }]} />
            <Text
              style={variant === 'hero' ? styles.heroTitle : styles.cardTitle}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>

          <View style={styles.chevronWrap}>
            <MaterialCommunityIcons name="play" size={16} color="rgba(255,255,255,0.75)" />
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

// ─── Home Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePress = useCallback((href: string) => {
    let navPath = href.startsWith('/') ? href.slice(1) : href;
    navPath = navPath.replace(/\/$/, '');
    router.push({ pathname: `/browse/${navPath}`, params: { rawHref: href } });
  }, []);

  const [hero, ...rest] = CATEGORIES;
  // rest split: first item wide, remainder as grid pairs
  const [wide, ...grid] = rest;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + 12 },
          { opacity: headerFade, transform: [{ translateY: headerSlide }] },
        ]}
      >
        <View style={styles.logoRow}>
          {/* Logo mark */}
          <View style={styles.logoMark}>
            <MaterialCommunityIcons name="play-circle" size={28} color={C.red} />
          </View>
          <View style={styles.logoTextWrap}>
            <Text style={styles.logoText}>
              SAM<Text style={styles.logoAccent}>FLIX</Text>
            </Text>
            <Text style={styles.logoTagline}>Your Local Cinema</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/search')}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="magnify" size={24} color={C.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section label */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionLabelText}>Browse Categories</Text>
        </View>
      </Animated.View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 }]}
      >
        {/* Hero Card */}
        <CategoryCard item={hero} onPress={handlePress} delay={100} variant="hero" />

        {/* Wide Secondary Card */}
        <CategoryCard item={wide} onPress={handlePress} delay={180} variant="wide" />

        {/* Grid rows */}
        {grid.reduce<Category[][]>((rows, item, i) => {
          if (i % 2 === 0) rows.push([item]);
          else rows[rows.length - 1].push(item);
          return rows;
        }, []).map((row, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {row.map((item, colIdx) => (
              <CategoryCard
                key={item.id}
                item={item}
                onPress={handlePress}
                delay={260 + rowIdx * 80 + colIdx * 40}
                variant="grid"
              />
            ))}
          </View>
        ))}

        {/* ── TV Series Section ──────────────────────────────────────── */}
        <View style={styles.tvSection}>
          {/* Section header */}
          <View style={styles.tvSectionHeader}>
            <View style={styles.tvIconWrap}>
              <MaterialCommunityIcons name="television-classic" size={18} color="#6C63FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tvSectionTitle}>TV Series</Text>
              <Text style={styles.tvSectionSub}>Streaming & Web Originals</Text>
            </View>
            <View style={styles.tvLiveBadge}>
              <View style={styles.tvLiveDot} />
              <Text style={styles.tvLiveText}>3 Genres</Text>
            </View>
          </View>

          {/* Hero TV card (full width) */}
          <TvCard item={TV_SERIES[0]} onPress={handlePress} delay={0} variant="hero" />

          {/* Side-by-side pair */}
          <View style={styles.gridRow}>
            <TvCard item={TV_SERIES[1]} onPress={handlePress} delay={60} variant="grid" />
            <TvCard item={TV_SERIES[2]} onPress={handlePress} delay={120} variant="grid" />
          </View>
        </View>

        {/* Footer tag */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>SAM<Text style={{ color: C.red }}>FLIX</Text> · Local Network</Text>
          <View style={styles.footerDivider} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoTextWrap: {
    flex: 1,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: C.textPrimary,
    letterSpacing: 2,
  },
  logoAccent: {
    color: C.red,
  },
  logoTagline: {
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionDot: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: C.red,
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  cardImage: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
  },
  accentGlow: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
  },
  accentBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: C.textPrimary,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  chevronWrap: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Grid ─────────────────────────────────────────────────────────────────
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  // ── TV Series Section ──────────────────────────────────────────────────────
  tvSection: {
    marginTop: 8,
    marginBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(108,99,255,0.2)',
    paddingTop: 20,
  },
  tvSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  tvIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 0.3,
  },
  tvSectionSub: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
    letterSpacing: 0.3,
  },
  tvLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
  },
  tvLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C63FF',
  },
  tvLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C63FF',
    letterSpacing: 0.5,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  footerDivider: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 0.8,
  },
});


