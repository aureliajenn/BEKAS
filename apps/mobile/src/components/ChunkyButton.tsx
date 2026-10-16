import React from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, chunkyDepth, touch, type } from '../theme/tokens';

type Variant = 'primary' | 'cta' | 'secondary';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Ikon di kiri label, misalnya <Camera color="#fff" size={22} strokeWidth={2.5} /> */
  icon?: React.ReactNode;
  /** Tombol kotak hanya ikon (wajib isi accessibilityLabel lewat label). */
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
};

const palette: Record<Variant, { face: string; depth: string; text: string; border?: string }> = {
  primary: { face: colors.green500, depth: colors.green700, text: colors.white },
  cta: { face: colors.orange500, depth: colors.orange700, text: colors.white },
  secondary: { face: colors.white, depth: colors.line, text: colors.green700, border: colors.line },
};

/**
 * Tombol "chunky" ala Pidu: muka tombol duduk 5px di atas bayangan padat.
 * Saat ditekan, muka turun menutup bayangan.
 */
export function ChunkyButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconOnly = false,
  style,
}: Props) {
  const inactive = disabled || loading;
  const p = palette[variant];
  const size = iconOnly ? { width: touch.primaryButton } : null;

  if (inactive) {
    return (
      <View
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: true, busy: loading }}
        style={[styles.base, size, { marginTop: chunkyDepth, backgroundColor: colors.line }, style]}
      >
        {loading ? <ActivityIndicator color={colors.iconIdle} /> : null}
        {!iconOnly ? <Text style={[type.button, { color: colors.iconIdle }]}>{label}</Text> : icon}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ marginTop: chunkyDepth, borderRadius: radius.button, backgroundColor: p.depth }, size, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.base,
            {
              backgroundColor: p.face,
              borderWidth: p.border ? 2 : 0,
              borderColor: p.border,
              transform: [{ translateY: pressed ? 0 : -chunkyDepth }],
            },
          ]}
        >
          {icon}
          {!iconOnly ? <Text style={[type.button, { color: p.text }]}>{label}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: touch.primaryButton,
    borderRadius: radius.button,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
