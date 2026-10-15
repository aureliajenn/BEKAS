import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';

import { colors, fontFamily, radii } from '@/theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'dark' | 'lime' | 'outline';
  accessibilityHint?: string;
  right?: ReactNode;
}

export function PrimaryButton({
  title,
  onPress,
  icon,
  loading = false,
  disabled = false,
  variant = 'dark',
  accessibilityHint,
  right,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const foreground = variant === 'lime' ? colors.forest : variant === 'outline' ? colors.forest : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'lime' && styles.lime,
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <MaterialCommunityIcons name={icon} size={21} color={foreground} /> : null}
          <Text style={[styles.title, { color: foreground }]}>{title}</Text>
          {right}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.forest,
    borderColor: colors.forest,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 20,
  },
  lime: { backgroundColor: colors.lime, borderColor: colors.lime },
  outline: { backgroundColor: 'transparent', borderColor: colors.line },
  disabled: { opacity: 0.58 },
  pressed: { transform: [{ scale: 0.985 }] },
  content: { alignItems: 'center', flexDirection: 'row', gap: 11, justifyContent: 'center' },
  title: { fontFamily: fontFamily.semibold, fontSize: 16 },
});
