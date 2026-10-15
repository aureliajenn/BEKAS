import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { mascot, type MascotPose } from '../theme/assets';
import { colors, type } from '../theme/tokens';

type Props = {
  pose: MascotPose;
  text: string;
  /** Lebar maskot 64 sampai 84. */
  size?: number;
};

/** Maskot di kiri + bubble biru muda. Maksimal satu maskot per layar. */
export function MascotBubble({ pose, text, size = 72 }: Props) {
  return (
    <View style={styles.row}>
      <Image
        source={mascot[pose]}
        style={{ width: size, height: size * 1.3 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <View style={styles.bubble}>
        <Text style={type.body}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bubble: {
    flex: 1,
    backgroundColor: colors.blue50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
