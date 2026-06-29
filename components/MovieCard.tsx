import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchDirectory, getBaseUrlForPath } from '../api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MovieCardProps {
  href: string;
  title: string;
  onPress: (href: string, title: string) => void;
  width?: number;
  height?: number;
}

const MovieCard = memo(({ href, title, onPress, width = 120, height = 180 }: MovieCardProps) => {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadPoster = async () => {
      try {
        const items = await fetchDirectory(href, controller.signal);
        if (!isMounted) return;

        // Find first image file
        const imageFile = items.find(i => 
          i.size !== null && 
          (i.href.toLowerCase().endsWith('.jpg') || 
           i.href.toLowerCase().endsWith('.jpeg') || 
           i.href.toLowerCase().endsWith('.png'))
        );

        if (imageFile) {
          const baseUrl = getBaseUrlForPath(imageFile.href);
          setPosterUrl(`${baseUrl}${imageFile.href}`);
        } else {
          setError(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn(`Failed to load poster for ${title}`, err);
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPoster();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [href, title]);

  // Clean up the title (remove years, 720p, etc if we want, or keep it)
  const cleanTitle = title.replace(/\s*\(\d{4}\).*$/, '').replace(/\s*\d{3,4}p.*$/, '').replace(/-\s*$/, '').trim();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { width, height },
        pressed && styles.pressed
      ]}
      onPress={() => onPress(href, cleanTitle)}
    >
      <View style={styles.imageContainer}>
        {loading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator color="#E50914" />
          </View>
        ) : posterUrl && !error ? (
          <Image
            source={posterUrl}
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
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.4, 1]}
          style={styles.gradientOverlay}
        >
          <Text style={styles.title} numberOfLines={2}>{cleanTitle}</Text>
        </LinearGradient>
      </View>
    </Pressable>
  );
});

export default MovieCard;

const styles = StyleSheet.create({
  container: {
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
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
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
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    justifyContent: 'flex-end',
    padding: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  }
});
