import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { LINEUP, stepChannel, toggleFavorite, tuneTo } from '@/remote/lineup';
import { type Palette, usePalette, variantColor } from '@/theme';

export default function Remote() {
  const palette = usePalette();
  const [index, setIndex] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [tuneInput, setTuneInput] = useState('');
  const [tuneMessage, setTuneMessage] = useState<string | null>(null);

  const show = LINEUP[index];
  const isFavorite = favorites.includes(show.number);

  function surfTo(next: number) {
    setIndex(next);
    setTuneMessage(null);
  }

  function tune() {
    const result = tuneTo(tuneInput);
    if (result.ok) {
      surfTo(result.index);
      setTuneInput('');
    } else {
      setTuneMessage(result.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.screen, { backgroundColor: variantColor('production') }]}>
        <Text testID="now-playing-channel" style={styles.channel}>{`CH ${show.number}`}</Text>
        <Text testID="now-playing-show" style={styles.show}>
          {show.name}
        </Text>
      </View>

      <View style={styles.row}>
        <RemoteButton palette={palette} label="Channel down" onPress={() => surfTo(stepChannel(index, -1))} />
        <RemoteButton palette={palette} label="Channel up" onPress={() => surfTo(stepChannel(index, 1))} />
      </View>

      <RemoteButton
        palette={palette}
        label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onPress={() => setFavorites((current) => toggleFavorite(current, show.number))}
      />

      <View style={[styles.card, { backgroundColor: palette.card }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Tune to a channel</Text>
        <View style={styles.row}>
          <TextInput
            testID="tune-input"
            value={tuneInput}
            onChangeText={setTuneInput}
            placeholder="Channel number"
            placeholderTextColor={palette.muted}
            keyboardType="number-pad"
            returnKeyType="go"
            onSubmitEditing={tune}
            style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          />
          <RemoteButton palette={palette} label="Tune" onPress={tune} grow={false} />
        </View>
        {tuneMessage !== null && (
          <Text testID="tune-message" style={{ color: palette.danger }}>
            {tuneMessage}
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Favorites</Text>
        {favorites.length === 0 ? (
          <Text style={{ color: palette.muted }}>No favorites yet.</Text>
        ) : (
          favorites.map((number) => (
            <Text key={number} testID={`favorite-${number}`} style={{ color: palette.text }}>
              {`CH ${number} · ${LINEUP.find((entry) => entry.number === number)?.name ?? ''}`}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function RemoteButton({
  palette,
  label,
  onPress,
  grow = true,
}: {
  palette: Palette;
  label: string;
  onPress: () => void;
  grow?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        grow && styles.grow,
        { borderColor: palette.border, backgroundColor: palette.card, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  screen: { borderRadius: 16, paddingVertical: 32, paddingHorizontal: 20, gap: 6, alignItems: 'center' },
  channel: { color: '#FFFFFF', fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  show: { color: '#FFFFFF', fontSize: 18, opacity: 0.9 },
  row: { flexDirection: 'row', gap: 10 },
  card: { borderRadius: 12, padding: 16, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  grow: { flexGrow: 1 },
  button: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
});
