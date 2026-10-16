import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { Flag, Home, ScanLine, Trophy, Wallet, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickPhoto } from '../lib/photo';
import { chunkyDepth, colors, radius, space, type } from '../theme/tokens';

const tabs: Record<string, { label: string; Icon: LucideIcon }> = {
  index: { label: 'Beranda', Icon: Home },
  jalur: { label: 'Jalur', Icon: Flag },
  wallet: { label: 'Dompet', Icon: Wallet },
  leaderboard: { label: 'Peringkat', Icon: Trophy },
};

/** Navigasi bawah ala referensi: 4 tab + tombol Scan menonjol di tengah (PRD 1.4). */
export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const scan = async () => {
    setBusy(true);
    try {
      const res = await pickPhoto('camera');
      // Izin ditolak: arahkan ke Beranda yang punya pesan + tombol galeri.
      if (res === 'denied') router.navigate({ pathname: '/', params: { denied: 'camera' } });
      else if (res) router.push({ pathname: '/preview', params: { uri: res } });
    } finally {
      setBusy(false);
    }
  };

  const item = (index: number) => {
    const route = state.routes[index];
    const meta = tabs[route.name];
    if (!meta) return null;
    const focused = state.index === index;
    const color = focused ? colors.green700 : colors.iconIdle;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        aria-selected={focused}
        accessibilityLabel={meta.label}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.item}
      >
        <meta.Icon size={24} color={color} strokeWidth={2.5} />
        <Text style={[type.pill, { color }]}>{meta.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: bottom + space.sm }]}>
      {item(0)}
      {item(1)}
      <View style={styles.scanSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Foto barang"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={scan}
          style={styles.scanDepth}
        >
          {({ pressed }) => (
            <View style={[styles.scanFace, { transform: [{ translateY: pressed ? 0 : -chunkyDepth }] }]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <ScanLine size={30} color={colors.white} strokeWidth={2.5} />}
            </View>
          )}
        </Pressable>
      </View>
      {item(2)}
      {item(3)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.frame,
    borderTopRightRadius: radius.frame,
    borderTopWidth: 2,
    borderColor: colors.line,
    paddingTop: space.sm,
    paddingHorizontal: space.sm,
  },
  item: { flex: 1, alignItems: 'center', gap: space.xs, minHeight: 52, justifyContent: 'center' },
  scanSlot: { flex: 1.2, alignItems: 'center' },
  scanDepth: { width: 68, height: 64, marginTop: -30, borderRadius: radius.tile, backgroundColor: colors.green700 },
  scanFace: { width: 68, height: 64, borderRadius: radius.tile, backgroundColor: colors.green500, alignItems: 'center', justifyContent: 'center' },
});
