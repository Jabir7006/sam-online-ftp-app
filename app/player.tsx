import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import * as NavigationBar from 'expo-navigation-bar';
import { getBaseUrlForPath } from '../api';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const COLORS = {
  bg: '#000000',
};

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ rawHref: string; title: string }>();
  const navigation = useNavigation();
  
  const rawHref = params.rawHref ?? '';
  const title = params.title ?? 'Movie Player';

  const baseUrl = getBaseUrlForPath(rawHref);
  const videoUrl = `${baseUrl}${rawHref}`;
  
  const [brightness, setBrightness] = useState(0.5);

  useEffect(() => {
    (async () => {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        const current = await Brightness.getBrightnessAsync();
        setBrightness(current);
      }
    })();
  }, []);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    
    // Hide Android bottom navigation bar
    NavigationBar.setVisibilityAsync("hidden");

    return () => {
      NavigationBar.setVisibilityAsync("visible");
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [navigation]);

  // Unified Double Tap Gesture
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart((e) => {
      const width = Dimensions.get('window').width;
      if (e.x < width / 2) {
        player.currentTime = Math.max(0, player.currentTime - 10);
      } else {
        player.currentTime = player.currentTime + 10;
      }
    });

  // Unified Pan Gesture for Brightness/Volume
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const width = Dimensions.get('window').width;
      if (e.x < width / 2) {
        // Left side: Brightness
        let newBrightness = brightness - (e.velocityY / 10000);
        newBrightness = Math.max(0, Math.min(1, newBrightness));
        setBrightness(newBrightness);
        Brightness.setBrightnessAsync(newBrightness);
      } else {
        // Right side: Volume
        let newVolume = player.volume - (e.velocityY / 10000);
        newVolume = Math.max(0, Math.min(1, newVolume));
        player.volume = newVolume;
      }
    });

  const composedGestures = Gesture.Simultaneous(doubleTap, panGesture);

  return (
    <GestureDetector gesture={composedGestures}>
      <View style={styles.container}>
        <StatusBar hidden />
        <VideoView 
          style={styles.video} 
          player={player} 
          allowsFullscreen 
          allowsPictureInPicture
          startsPictureInPictureAutomatically
          contentFit="contain"
          onFullscreenEnter={() => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          }}
          onFullscreenExit={() => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  video: {
    flex: 1,
  },
});
