/**
 * ShimmerPlaceholder.tsx
 *
 * Uses a single shared Animated.Value (globalShimmerAnim) driven by ONE loop
 * at module level. All shimmer instances subscribe to this single animation
 * instead of running their own loop — eliminates the N×animation overhead
 * that made the list feel sluggish with many cards loading simultaneously.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

// ─── Single shared animation loop ─────────────────────────────────────────────
// One Animated.Value drives ALL ShimmerPlaceholder instances in the app.
// This cuts the animation overhead from O(n) to O(1).
const globalShimmerAnim = new Animated.Value(0);
let loopRef: Animated.CompositeAnimation | null = null;
let subscriberCount = 0;

function startGlobalLoop() {
  if (loopRef) return; // already running
  loopRef = Animated.loop(
    Animated.sequence([
      Animated.timing(globalShimmerAnim, {
        toValue: 1,
        duration: 950,
        useNativeDriver: true,
      }),
      Animated.timing(globalShimmerAnim, {
        toValue: 0,
        duration: 950,
        useNativeDriver: true,
      }),
    ])
  );
  loopRef.start();
}

function stopGlobalLoop() {
  loopRef?.stop();
  loopRef = null;
  globalShimmerAnim.setValue(0);
}

// ─── Component ────────────────────────────────────────────────────────────────
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
  useEffect(() => {
    subscriberCount++;
    startGlobalLoop();
    return () => {
      subscriberCount--;
      if (subscriberCount === 0) {
        stopGlobalLoop();
      }
    };
  }, []);

  const opacity = globalShimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.65],
  });

  return (
    <View style={[styles.base, { width, height, borderRadius } as ViewStyle, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.shimmer, { opacity, borderRadius }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  shimmer: {
    backgroundColor: '#2E2E2E',
  },
});

export default ShimmerPlaceholder;
