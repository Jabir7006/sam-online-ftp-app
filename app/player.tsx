import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useNavigation } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';
import { getBaseUrlForPath } from '../api';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  bg: '#000000',
};

const FULLSCREEN_OPTIONS = {
  enable: true,
  orientation: 'landscape',
  autoExitOnRotate: false,
} as const;

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ rawHref: string; title: string }>();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  const rawHref = params.rawHref ?? '';

  const baseUrl = getBaseUrlForPath(rawHref);
  const videoUrl = `${baseUrl}${rawHref}`;
  const videoSource = useMemo(() => ({ uri: videoUrl, useCaching: false }), [videoUrl]);

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.keepScreenOnWhilePlaying = true;
    p.staysActiveInBackground = false;
    p.play();
  });

  useEffect(() => {
    navigation.setOptions({ headerShown: false });

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {isFocused ? <NavigationBar hidden style="light" /> : null}
      <VideoView 
        key={videoUrl}
        style={styles.video} 
        player={player} 
        nativeControls
        fullscreenOptions={FULLSCREEN_OPTIONS}
        allowsPictureInPicture
        contentFit="contain"
        onFullscreenEnter={() => {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        }}
        onFullscreenExit={() => {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
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
  video: {
    flex: 1,
  },
});
