import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

const HEADER_BG = '#0D0D0D';
const HEADER_TINT = '#E50914';
const HEADER_TITLE = '#FFFFFF';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: HEADER_BG },
          headerTintColor: HEADER_TINT,
          headerTitleStyle: {
            color: HEADER_TITLE,
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0D0D0D' },
        }}
      />
    </View>
  );
}
