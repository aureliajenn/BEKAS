import { WifiOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { extraCopy } from '../theme/statusCopy';
import { ShieldWarning } from './illustrations';
import { Coin } from './shapes';
import { chunkyDepth, colors, radius, space, type } from '../theme/tokens';

/** Kartu putih dengan bayangan padat 5px (teknik sama dengan ChunkyButton). */
export function Card({ children, selected, style }: { children: ReactNode; selected?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.cardDepth, selected && { backgroundColor: colors.selectedShadow }]}>
      <View style={[styles.card, selected && { borderColor: colors.green400 }, style]}>{children}</View>
    </View>
  );
}

const pillTones = {
  easy: [colors.pillEasyBg, colors.pillEasyFg],
  medium: [colors.pillMediumBg, colors.pillMediumFg],
  hard: [colors.pillHardBg, colors.pillHardFg],
  info: [colors.blue50, colors.blue600],
  cached: [colors.pillCachedBg, colors.pillCachedFg],
  neutral: [colors.bg, colors.muted],
} as const;

export type PillTone = keyof typeof pillTones;

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: PillTone; icon?: ReactNode }) {
  const [bg, fg] = pillTones[tone];
  return (
    <View style={[styles.pill, icon ? styles.pillIcon : null, { backgroundColor: bg }]}>
      {icon}
      <Text style={[type.pill, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Pill poin kuning dengan koin (DESIGN 2b: aksen hadiah). */
export function PointsPill({ points }: { points: number }) {
  return (
    <View style={[styles.pill, styles.points]}>
      <Coin size={14} />
      <Text style={[type.pill, { color: colors.pillCachedFg }]}>+{points.toLocaleString('id-ID')} poin</Text>
    </View>
  );
}

/** Kesulitan dari backend berupa teks bebas; cocokkan kata kuncinya. */
export const difficultyTone = (d: string): PillTone => (/mudah/i.test(d) ? 'easy' : /sulit/i.test(d) ? 'hard' : 'medium');

export function SafetyNote({ text }: { text: string }) {
  return (
    <View style={[styles.banner, { borderRadius: radius.tile }]} accessibilityRole="alert">
      <ShieldWarning size={36} />
      <Text style={[type.body, styles.flex]}>{text}</Text>
    </View>
  );
}

export function OfflineBanner() {
  return (
    <View style={[styles.banner, { borderRadius: radius.iconButton }]} accessibilityLiveRegion="polite">
      <WifiOff size={18} color={colors.warnFg} strokeWidth={2.5} />
      <Text style={[type.body, styles.flex, { color: colors.warnFg }]}>{extraCopy.offline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardDepth: { backgroundColor: colors.cardShadow, borderRadius: radius.card, paddingBottom: chunkyDepth },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 2, borderColor: colors.line, padding: space.lg },
  pill: { borderRadius: radius.pill, paddingVertical: space.xs, paddingHorizontal: 10, alignSelf: 'flex-start' },
  pillIcon: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  points: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: colors.tileYellow },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.warnBg, padding: space.md },
  flex: { flex: 1 },
});

/** Progres data nyata (saldo, jumlah barang). Jangan dipakai untuk proses backend. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View
      style={progress.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: Math.min(value, max) }}
    >
      <View style={[progress.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const progress = StyleSheet.create({
  track: { height: 12, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.green500 },
});
