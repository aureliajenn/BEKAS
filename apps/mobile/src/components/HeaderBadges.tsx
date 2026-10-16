import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchWallet } from '../lib/rewards';
import { colors, radius, space, touch, type } from '../theme/tokens';
import { Coin, Flame } from './shapes';

/** Saldo poin dan streak mingguan untuk pojok GreenHeader (data dompet nyata). */
export function HeaderBadges() {
  const { data: w } = useQuery({ queryKey: ['wallet'], queryFn: fetchWallet });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Saldo ${w?.balance ?? 0} poin, streak ${w?.weekly_streak ?? 0} minggu`}
      onPress={() => router.navigate('/wallet')}
      style={styles.row}
    >
      <View style={styles.badge}>
        <Coin size={22} />
        <Text style={[type.bodyL, { color: colors.ink }]}>{w ? w.balance.toLocaleString('id-ID') : '–'}</Text>
      </View>
      <View style={styles.badge}>
        <Flame size={22} />
        <Text style={[type.bodyL, { color: colors.ink }]}>{w?.weekly_streak ?? 0}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    minHeight: touch.min - 8,
  },
});
