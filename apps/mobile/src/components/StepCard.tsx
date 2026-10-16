import { Check, ImageIcon } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { GuideStep, JobStatus } from '../types/contracts';
import { statusCopy } from '../theme/statusCopy';
import { colors, radius, space, type } from '../theme/tokens';
import { Card } from './Card';
import { ChunkyButton } from './ChunkyButton';
import { StageStatus } from './StageStatus';
import { ProcessVisual } from './ProcessVisual';

type Props = {
  step: GuideStep;
  illustrationStatus: JobStatus;
  illustrationUrl?: string;
  illustrationPlaceholder?: string;
  onRetryIllustration?: () => void;
  checked: boolean;
  onToggle: () => void;
  processVisual?: { illustration?: number; model?: number };
};

export function StepCard({ step, illustrationStatus, illustrationUrl, illustrationPlaceholder, onRetryIllustration, checked, onToggle, processVisual }: Props) {
  return (
    <Card selected={checked} style={{ gap: space.md }}>
      <View style={styles.head}>
        <View style={styles.num}>
          <Text style={[type.button, { color: colors.white }]}>{step.order}</Text>
        </View>
        <Text style={[type.h3, { flex: 1 }]}>{step.title}</Text>
      </View>

      {processVisual ? <ProcessVisual title={step.title} illustrationAsset={processVisual.illustration}
        modelAsset={processVisual.model} illustrationUrl={illustrationUrl} illustrationStatus={illustrationStatus}
        illustrationPlaceholder={illustrationPlaceholder} onRetry={onRetryIllustration} /> : <View style={styles.ill}>
        {illustrationUrl ? (
          <Image source={{ uri: illustrationUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`Ilustrasi langkah ${step.order}`} />
        ) : illustrationPlaceholder ? (
          <View style={styles.skeleton}>
            <ImageIcon size={32} color={colors.iconIdle} strokeWidth={2.5} />
            <Text style={type.caption}>{illustrationPlaceholder}</Text>
          </View>
        ) : illustrationStatus === 'failed' ? (
          <StageStatus items={[{ kind: 'illustration', status: 'failed', onRetry: onRetryIllustration }]} />
        ) : (
          // Skeleton: teks langkah tetap bisa diikuti tanpa menunggu gambar.
          <View style={styles.skeleton} accessibilityLiveRegion="polite">
            <ImageIcon size={32} color={colors.iconIdle} strokeWidth={2.5} />
            <Text style={type.caption}>{statusCopy.illustration[illustrationStatus === 'succeeded' ? 'running' : illustrationStatus]}</Text>
          </View>
        )}
      </View>}

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
  num: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.green500, alignItems: 'center', justifyContent: 'center' },
  ill: { aspectRatio: 4 / 3, maxHeight: 320, borderRadius: radius.tile, backgroundColor: colors.green50, overflow: 'hidden', justifyContent: 'center', padding: space.md },
  skeleton: { alignItems: 'center', gap: space.sm },
  expect: { backgroundColor: colors.green50, borderRadius: radius.tile, padding: space.md, gap: space.xs },
});
