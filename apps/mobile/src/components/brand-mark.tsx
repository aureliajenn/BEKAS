import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily } from '@/theme/tokens';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="recycle" size={compact ? 22 : 25} color={colors.forest} />
      </View>
      <Text style={[styles.wordmark, compact && styles.compactWordmark]}>BEKAS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.lime,
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  wordmark: {
    color: colors.white,
    fontFamily: fontFamily.displayBold,
    fontSize: 23,
    letterSpacing: 0.8,
  },
  compactWordmark: { fontSize: 19 },
});
