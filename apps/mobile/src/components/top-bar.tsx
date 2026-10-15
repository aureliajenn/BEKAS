import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, spacing } from '@/theme/tokens';

export function TopBar({ title, dark = false }: { title: string; dark?: boolean }) {
  const router = useRouter();
  const foreground = dark ? colors.white : colors.ink;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        hitSlop={10}
        onPress={() => router.back()}
        style={styles.back}
      >
        <MaterialCommunityIcons name="arrow-left" size={23} color={foreground} />
      </Pressable>
      <Text numberOfLines={1} style={[styles.title, { color: foreground }]}>
        {title}
      </Text>
      <View style={styles.trailing} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  back: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  title: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 17 },
  trailing: { width: 42 },
});
