/**
 * ShimmerPlaceholder.tsx
 *
 * A looping shimmer animation used as a skeleton placeholder
 * while movie poster images are loading. Replaces the per-card
 * ActivityIndicator spinner for a much smoother perceived performance.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface ShimmerPlaceholderProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

const ShimmerPlaceholder: React.FC<ShimmerPlaceholderProps> = ({
  width,
  height,
  borderRadius = 0,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <View style={[styles.base, { width, height, borderRadius } as ViewStyle, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.shimmer, { opacity, borderRadius }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  shimmer: {
    backgroundColor: '#333333',
  },
});

export default ShimmerPlaceholder;
