import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BUILD_CHANNEL, prChannel } from '@/channel-surfing/channel';
import { isBusy, runningChannel, useChannelSurf } from '@/channel-surfing/surf';
import { SurfStatus } from '@/channel-surfing/surf-status';
import { previewInfo } from '@/preview-info';
import { type Palette, usePalette, variantColor } from '@/theme';

export default function Home() {
  const palette = usePalette();
  const { state, surf } = useChannelSurf();
  const [prInput, setPrInput] = useState('');
  const busy = isBusy(state);
  const typedChannel = /^\d+$/.test(prInput) ? prChannel(Number(prInput)) : null;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Banner />

      {!Updates.isEnabled && (
        <Card palette={palette}>
          <Text style={[styles.notice, { color: palette.danger }]}>
            expo-updates is disabled in this build. Channel surfing needs a release build, not a dev server or Expo Go.
          </Text>
        </Card>
      )}

      <Card palette={palette}>
        <Detail palette={palette} label="Channel" value={Updates.channel ?? 'none'} />
        <Detail palette={palette} label="Update ID" value={Updates.isEmbeddedLaunch ? 'embedded' : (Updates.updateId ?? 'none')} />
        <Detail palette={palette} label="Created at" value={Updates.createdAt?.toLocaleString() ?? 'unknown'} />
        <Detail palette={palette} label="Runtime version" value={Updates.runtimeVersion ?? 'unknown'} />
        <Detail palette={palette} label="Embedded launch" value={Updates.isEmbeddedLaunch ? 'yes' : 'no'} />
      </Card>

      <View style={styles.actions}>
        {runningChannel !== BUILD_CHANNEL && (
          <Button
            palette={palette}
            label="Back to production"
            color={variantColor('production')}
            disabled={busy}
            onPress={() => surf(BUILD_CHANNEL)}
          />
        )}
        <Button
          palette={palette}
          label="Check for update"
          color={palette.text}
          disabled={busy || runningChannel === null}
          onPress={() => runningChannel && surf(runningChannel)}
        />
        <SurfStatus state={state} />
      </View>

      <Card palette={palette}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Open a PR channel</Text>
        <Text style={{ color: palette.muted }}>Use this when you cannot scan the QR code.</Text>
        <View style={styles.prRow}>
          <TextInput
            value={prInput}
            onChangeText={setPrInput}
            placeholder="PR number"
            placeholderTextColor={palette.muted}
            keyboardType="number-pad"
            returnKeyType="go"
            onSubmitEditing={() => typedChannel && router.push({ pathname: '/surf', params: { channel: typedChannel } })}
            style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          />
          <Button
            palette={palette}
            label="Go"
            color={variantColor('pr')}
            disabled={typedChannel === null}
            onPress={() => typedChannel && router.push({ pathname: '/surf', params: { channel: typedChannel } })}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function Banner() {
  const pr = previewInfo.kind === 'pr' ? previewInfo : null;
  return (
    <View style={[styles.banner, { backgroundColor: variantColor(pr ? 'pr' : 'production') }]}>
      <Text style={styles.bannerTitle}>{pr ? `PR #${pr.prNumber} preview` : 'Production'}</Text>
      <Text style={styles.bannerSubtitle}>
        {pr ? `Commit ${pr.commitSha?.slice(0, 7) ?? 'unknown'}` : 'The build channel'}
      </Text>
      <Text style={styles.bannerTagline}>{"🏄 Surf's up from this PR"}</Text>
    </View>
  );
}

function Card({ palette, children }: { palette: Palette; children: ReactNode }) {
  return <View style={[styles.card, { backgroundColor: palette.card }]}>{children}</View>;
}

function Detail({ palette, label, value }: { palette: Palette; label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={{ color: palette.muted }}>{label}</Text>
      <Text selectable style={[styles.detailValue, { color: palette.text }]}>
        {value}
      </Text>
    </View>
  );
}

function Button({
  palette,
  label,
  color,
  disabled,
  onPress,
}: {
  palette: Palette;
  label: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: color, opacity: disabled ? 0.4 : pressed ? 0.7 : 1, backgroundColor: palette.card },
      ]}>
      <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  banner: { borderRadius: 16, paddingVertical: 28, paddingHorizontal: 20, gap: 4 },
  bannerTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  bannerSubtitle: { color: '#FFFFFF', fontSize: 16, opacity: 0.9, fontVariant: ['tabular-nums'] },
  bannerTagline: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 8 },
  notice: { fontSize: 15, lineHeight: 21 },
  card: { borderRadius: 12, padding: 16, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailValue: { flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
  actions: { gap: 10 },
  button: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  prRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
});
