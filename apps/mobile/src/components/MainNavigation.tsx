import { router, usePathname } from 'expo-router';
import { House, Landmark, ScanLine, Trophy, Wallet, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { chunkyDepth, colors, radius, space, touch, type } from '@/theme/tokens';
import { pickPhoto } from '@/lib/photo';

export function MainNavigation() {
  const { bottom } = useSafeAreaInsets();
  const pathname = usePathname();
  const [scanning, setScanning] = useState(false);
  const scan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const photo = await pickPhoto('camera');
      if (photo === 'denied') {
        Alert.alert('Izin kamera diperlukan', 'Izinkan kamera di pengaturan perangkat, atau pilih foto dari galeri di Beranda.');
      } else if (photo) {
        router.push({ pathname: '/preview', params: { uri: photo } });
      }
    } catch {
      Alert.alert('Kamera belum bisa dibuka', 'Coba lagi atau pilih foto dari galeri di Beranda.');
    } finally {
      setScanning(false);
    }
  };
  return (
    <View style={[styles.dock, { paddingBottom: bottom + space.md }]}>
      <View style={styles.bar} accessibilityLabel="Navigasi utama">
      <NavigationItem label="Beranda" icon={House} selected={pathname === '/'} onPress={() => router.navigate('/')} />
      <NavigationItem label="Dompet" icon={Wallet} selected={pathname === '/wallet'} onPress={() => router.navigate('/wallet')} />
      <View style={styles.scannerSlot}>
        <View style={styles.scannerDepth}>
          <Pressable accessibilityRole="button" accessibilityLabel="Scan barang"
            accessibilityState={{ disabled: scanning, busy: scanning }} disabled={scanning} onPress={scan}
            style={({ pressed }) => [styles.scannerFace, {
              backgroundColor: scanning ? colors.line : colors.green500,
              transform: [{ translateY: pressed ? 0 : -chunkyDepth }],
            }]}>
            <ScanLine size={28} color={scanning ? colors.iconIdle : colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
      <NavigationItem label="Peringkat" icon={Trophy} selected={pathname === '/leaderboard' || pathname === '/rw'} onPress={() => router.navigate('/leaderboard')} />
      <NavigationItem label="Bank sampah" icon={Landmark} selected={pathname === '/bank-sampah'} onPress={() => router.navigate('/bank-sampah')} />
      </View>
    </View>
  );
}

function NavigationItem({ label, icon: Icon, selected = false, onPress }: {
  label: string; icon: LucideIcon; selected?: boolean; onPress: () => void;
}) {
  const color = selected ? colors.green700 : colors.iconIdle;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
      onPress={onPress} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}>
      <Icon size={22} color={color} strokeWidth={2.5} />
      <Text style={[type.pill, styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: space.lg, paddingTop: space.xl, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row', alignItems: 'center', minHeight: touch.primaryButton + space.xxl,
    paddingHorizontal: space.xs, backgroundColor: colors.white, borderWidth: 2,
    borderColor: colors.line, borderRadius: radius.sheet,
  },
  item: { flex: 1, minHeight: touch.primaryButton, alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingVertical: space.sm, paddingHorizontal: space.xs },
  label: { textAlign: 'center', flexShrink: 1 },
  scannerSlot: { flex: 1, alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' },
  scannerDepth: { width: touch.primaryButton + space.lg, height: touch.primaryButton + space.lg,
    borderRadius: radius.card, backgroundColor: colors.green700, marginTop: -space.xxl },
  scannerFace: { width: '100%', height: '100%', borderRadius: radius.card,
    borderWidth: space.xs, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
