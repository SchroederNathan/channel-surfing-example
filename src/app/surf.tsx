import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { parseChannelName } from '@/channel-surfing/channel';
import { useChannelSurf } from '@/channel-surfing/surf';
import { SurfStatus } from '@/channel-surfing/surf-status';
import { usePalette } from '@/theme';

export default function Surf() {
  const palette = usePalette();
  const params = useLocalSearchParams<{ channel?: string }>();
  const channel = parseChannelName(params.channel);
  const { state, surf } = useChannelSurf();

  useEffect(() => {
    if (channel) surf(channel);
  }, [channel, surf]);

  useEffect(() => {
    if (state.phase === 'up-to-date') router.replace('/');
  }, [state.phase]);

  const stuck = channel === null || state.phase === 'error' || state.phase === 'no-update';

  return (
    <View style={styles.container}>
      {channel === null ? (
        <Text style={[styles.text, { color: palette.danger }]}>
          {`"${params.channel ?? ''}" is not a channel this app can switch to. Use production or pr-<number>.`}
        </Text>
      ) : (
        <>
          <Text style={[styles.title, { color: palette.text }]}>{channel}</Text>
          <SurfStatus state={state} />
        </>
      )}
      {stuck && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.button, { borderColor: palette.border, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.buttonLabel, { color: palette.text }]}>Back home</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  text: { fontSize: 16, lineHeight: 22 },
  button: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
