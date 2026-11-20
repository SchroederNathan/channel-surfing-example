import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { usePalette } from '@/theme';

export default function RootLayout() {
  const palette = usePalette();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
          contentStyle: { backgroundColor: palette.background },
        }}>
        <Stack.Screen name="index" options={{ title: 'Channel Surfing' }} />
        <Stack.Screen name="surf" options={{ title: 'Switching channel' }} />
        <Stack.Screen name="remote" options={{ title: 'Remote' }} />
      </Stack>
    </>
  );
}
