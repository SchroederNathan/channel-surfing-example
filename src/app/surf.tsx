import { router, useLocalSearchParams } from 'expo-router';
import { useUpdates } from 'expo-updates';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { INITIAL_LAUNCH_PARAM, parseChannelName } from '@/channel-surfing/channel';
import { useChannelSurf } from '@/channel-surfing/surf';
import { SurfStatus } from '@/channel-surfing/surf-status';
import { usePalette } from '@/theme';

export default function Surf() {
  const palette = usePalette();
  const params = useLocalSearchParams<{ channel?: string; [INITIAL_LAUNCH_PARAM]?: string }>();
  const channel = parseChannelName(params.channel);
  const { state, surf } = useChannelSurf();
  const { restartCount } = useUpdates();
  // The launch link comes back on every reload. Only the first JS run since cold start may act on it.
  const replayed = params[INITIAL_LAUNCH_PARAM] !== undefined && restartCount > 0;

  useEffect(() => {
    if (replayed) router.replace('/');
    else if (channel) surf(channel);
  }, [replayed, channel, surf]);

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
