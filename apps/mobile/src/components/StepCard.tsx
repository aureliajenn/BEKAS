import { Check } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { GuideStep, JobStatus } from '../types/contracts';
import { statusCopy } from '../theme/statusCopy';
import { colors, radius, space, type } from '../theme/tokens';
import { Card } from './Card';
import { ChunkyButton } from './ChunkyButton';
import { CheckBadge, PaintBrush } from './illustrations';
import { StageStatus } from './StageStatus';

type Props = {
  step: GuideStep;
  illustrationStatus: JobStatus;
  illustrationUrl?: string;
  onRetryIllustration?: () => void;
  checked: boolean;
  onToggle: () => void;
};

// Lingkaran nomor pastel bergiliran; angka berwarna (teks putih hanya di atas hijau/oranye).
const numTones = [
  { bg: colors.tileGreen, fg: colors.green700 },
  { bg: colors.tileBlue, fg: colors.blue600 },
  { bg: colors.tileYellow, fg: colors.pillCachedFg },
  { bg: colors.tilePink, fg: colors.pillHardFg },
];

export function StepCard({ step, illustrationStatus, illustrationUrl, onRetryIllustration, checked, onToggle }: Props) {
  const numTone = numTones[(step.order - 1) % numTones.length];
  return (
    <Card selected={checked} style={{ gap: space.md }}>
      <View style={styles.head}>
        <View style={[styles.num, { backgroundColor: numTone.bg, borderColor: numTone.fg }]}>
          <Text style={[type.h3, { color: numTone.fg }]}>{step.order}</Text>
        </View>
        <Text style={[type.h3, { flex: 1 }]}>{step.title}</Text>
        {checked ? <CheckBadge size={36} /> : null}
      </View>

      <View style={styles.ill}>
        {illustrationUrl ? (
          <Image source={{ uri: illustrationUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`Ilustrasi langkah ${step.order}`} />
        ) : illustrationStatus === 'failed' ? (
          <StageStatus items={[{ kind: 'illustration', status: 'failed', onRetry: onRetryIllustration }]} />
        ) : (
          // Skeleton: teks langkah tetap bisa diikuti tanpa menunggu gambar.
          <View style={styles.skeleton} accessibilityLiveRegion="polite">
            <View style={{ opacity: 0.55 }}>
              <PaintBrush size={64} />
            </View>
            <Text style={type.caption}>{statusCopy.illustration[illustrationStatus === 'succeeded' ? 'running' : illustrationStatus]}</Text>
          </View>
        )}
      </View>

      <Text style={type.body}>{step.instruction}</Text>

      <View style={styles.expect}>
        <Text style={type.overline}>Hasil yang diharapkan</Text>
        <Text style={type.body}>{step.expected_result}</Text>
      </View>

      <ChunkyButton
        label={checked ? 'Sudah' : 'Tandai sudah'}
        variant={checked ? 'primary' : 'secondary'}
        icon={<Check size={22} color={checked ? colors.white : colors.green700} strokeWidth={2.5} />}
        onPress={onToggle}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  num: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ill: { aspectRatio: 4 / 3, maxHeight: 320, borderRadius: radius.tile, backgroundColor: colors.green50, overflow: 'hidden', justifyContent: 'center', padding: space.md },
  skeleton: { alignItems: 'center', gap: space.sm },
  expect: { backgroundColor: colors.noteYellowBg, borderWidth: 2, borderColor: colors.noteYellowBorder, borderRadius: radius.tile, padding: space.md, gap: space.xs },
});
