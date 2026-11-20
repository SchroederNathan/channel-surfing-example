import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { describeSurf, isBusy, type SurfState } from '@/channel-surfing/surf';
import { usePalette } from '@/theme';

export function SurfStatus({ state }: { state: SurfState }) {
  const palette = usePalette();
  const text = describeSurf(state);
  if (text === null) return null;
  const failed = state.phase === 'error' || state.phase === 'no-update';
  return (
    <View style={styles.row}>
      {isBusy(state) && <ActivityIndicator color={palette.muted} />}
      <Text style={[styles.text, { color: failed ? palette.danger : palette.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flexShrink: 1, fontSize: 15, lineHeight: 21 },
});
