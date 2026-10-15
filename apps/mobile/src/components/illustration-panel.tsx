import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

import { colors, fontFamily, radii } from '@/theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export type IllustrationStatus = 'pending' | 'ready' | 'failed';

export function IllustrationPanel({
  status,
  icon,
  onRetry,
}: {
  status: IllustrationStatus;
  icon: IconName;
  onRetry?: () => void;
}) {
  if (status === 'pending') {
    return (
      <View style={[styles.panel, styles.pending]}>
        <MaterialCommunityIcons name="image-outline" size={28} color={colors.muted} />
        <Text style={styles.caption}>Ilustrasi sedang disiapkan</Text>
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={[styles.panel, styles.failed]}>
        <MaterialCommunityIcons name="image-off-outline" size={28} color={colors.danger} />
        <Text style={styles.failedCaption}>Ilustrasi belum tersedia</Text>
        {onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.artCircle}>
        <View style={styles.artOrbit} />
        <MaterialCommunityIcons name={icon} size={38} color={colors.forest} />
        <View style={styles.artDot} />
      </View>
      <Text style={styles.caption}>Contoh ilustrasi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.md,
    height: 148,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  pending: { backgroundColor: '#EDF0EC', gap: 9 },
  failed: { backgroundColor: colors.dangerWash, gap: 8 },
  artCircle: {
    alignItems: 'center',
    backgroundColor: '#C8E8D8',
    borderRadius: 48,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  artOrbit: {
    borderColor: colors.forest,
    borderRadius: 54,
    borderWidth: 1,
    height: 104,
    opacity: 0.25,
    position: 'absolute',
    width: 104,
  },
  artDot: {
    backgroundColor: colors.lime,
    borderColor: colors.mint,
    borderRadius: 9,
    borderWidth: 2,
    height: 17,
    position: 'absolute',
    right: 4,
    top: 6,
    width: 17,
  },
  caption: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 12, marginTop: 8 },
  failedCaption: { color: colors.danger, fontFamily: fontFamily.medium, fontSize: 12 },
  retryText: { color: colors.forest, fontFamily: fontFamily.semibold, fontSize: 12, marginTop: 2 },
});
