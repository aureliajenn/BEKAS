import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logo, mascot, type MascotPose } from '../theme/assets';
import { colors, radius, space, touch, type } from '../theme/tokens';

type Props = {
  title: string;
  /** Logo kecil + "BEKAS" di atas judul (Beranda). */
  brand?: boolean;
  /** Teks kecil di atas judul, misalnya "Selamat datang". */
  eyebrow?: string;
  onBack?: () => void;
  /** Maskot "nongol" di kanan bawah. Satu per layar. */
  pose?: MascotPose;
  /** Lebar maskot (DESIGN: header 150–200). Default 110 untuk layar sekunder. */
  mascotSize?: number;
  /** Slot pojok kanan atas, misalnya saldo koin. */
  topRight?: ReactNode;
  /** Ruang ekstra di bawah agar kartu berikutnya bisa menumpuk ke header. */
  overlap?: number;
  /** Slot di bawah judul: logo, pill, dsb. */
  children?: ReactNode;
};

export function GreenHeader({ title, brand, eyebrow, onBack, pose, mascotSize = 110, topRight, overlap = 0, children }: Props) {
  const { top } = useSafeAreaInsets();
  const mascotH = mascotSize * 1.18;
  return (
    <View
      style={[
        styles.header,
        { paddingTop: top + space.lg, paddingBottom: space.xxl + overlap },
        // Ruang baris atas (logo/saldo) supaya maskot tidak menabrak badge.
        pose && { minHeight: top + mascotH + overlap + (topRight ? 56 : space.lg) },
      ]}
    >
      <View style={[styles.circle, { width: 220, height: 220, top: -80, right: -60 }]} />
      <View style={[styles.circle, { width: 120, height: 120, bottom: -40, left: -30 }]} />

      {topRight ? <View style={[styles.topRight, { top: top + space.lg }]}>{topRight}</View> : null}

      <View style={[styles.row, pose && { paddingRight: mascotSize * 0.8 }]}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={8} style={styles.back}>
            <ChevronLeft size={24} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, gap: space.xs }}>
          {brand ? (
            <View style={styles.brand}>
              <Image source={logo.main} style={styles.logo} accessible={false} />
              <Text style={[type.bodyL, { color: colors.white, letterSpacing: 1.2 }]}>BEKAS</Text>
            </View>
          ) : null}
          {eyebrow ? <Text style={[type.body, { color: colors.white, opacity: 0.85 }]}>{eyebrow}</Text> : null}
          <Text style={[onBack ? type.h2 : type.h1, { color: colors.white }]} accessibilityRole="header">
            {title}
          </Text>
          {children}
        </View>
      </View>

      {pose ? (
        <Image
          source={mascot[pose]}
          style={[styles.mascot, { width: mascotSize, height: mascotH, bottom: overlap - 6 }]}
          resizeMode="contain"
          accessible={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.green500,
    borderBottomLeftRadius: radius.header,
    borderBottomRightRadius: radius.header,
    paddingHorizontal: space.screen,
    overflow: 'hidden',
  },
  circle: { position: 'absolute', borderRadius: radius.pill, backgroundColor: colors.white, opacity: 0.07 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  back: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.iconButton,
    backgroundColor: colors.green700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  logo: { width: 32, height: 32, borderRadius: 10 },
  mascot: { position: 'absolute', right: space.sm },
  topRight: { position: 'absolute', right: space.screen, zIndex: 1 },
});

/** Header putih sederhana: tombol kembali + judul. */
export function PlainHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[plain.bar, { paddingTop: top + space.sm }]}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={8} style={plain.back}>
        <ChevronLeft size={24} color={colors.green700} strokeWidth={2.5} />
      </Pressable>
      <Text style={[type.h3, { flex: 1 }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

const plain = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.screen, paddingBottom: space.sm, backgroundColor: colors.white, borderBottomWidth: 2, borderBottomColor: colors.line },
  back: { width: touch.min, height: touch.min, borderRadius: radius.iconButton, backgroundColor: colors.green50, alignItems: 'center', justifyContent: 'center' },
});
