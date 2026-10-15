import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radii } from '@/theme/tokens';

export function FixtureBanner({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.banner, compact && styles.compact]}>
      <MaterialCommunityIcons name="information-outline" color={colors.forest} size={20} />
      <View style={styles.copy}>
        <Text style={styles.title}>Contoh tersimpan</Text>
        <Text style={[styles.body, compact && styles.compactBody]}>
          {compact ? 'Bukan hasil analisis foto ini.' : 'Ide dan panduan berikut memakai data contoh, bukan hasil analisis foto ini.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  compact: { alignItems: 'center', paddingVertical: 11 },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.forest, fontFamily: fontFamily.semibold, fontSize: 14 },
  body: { color: colors.ink, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  compactBody: { fontSize: 12, lineHeight: 16 },
});
