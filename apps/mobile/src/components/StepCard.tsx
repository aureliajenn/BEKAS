import { Check } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { GuideStep, JobStatus } from '../types/contracts';
import type { ProcessAssets } from '../theme/assets';
import { colors, radius, space, type } from '../theme/tokens';
import { Card } from './Card';
import { ChunkyButton } from './ChunkyButton';
import { ProcessVisual } from './ProcessVisual';

type Props = {
  step: GuideStep;
  illustrationStatus: JobStatus;
  illustrationUrl?: string;
  onRetryIllustration?: () => void;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  processVisual?: ProcessAssets;
};

export function StepCard({ step, illustrationStatus, illustrationUrl, onRetryIllustration, checked, onToggle, disabled, processVisual }: Props) {
  return (
    <Card selected={checked} style={{ gap: space.md }}>
      <View style={styles.head}>
        <View style={styles.num}>
          <Text style={[type.button, { color: colors.white }]}>{step.order}</Text>
        </View>
        <Text accessibilityRole="header" style={[type.h3, { flex: 1 }]}>{step.title}</Text>
      </View>

      <ProcessVisual
        title={step.title}
        illustrationAsset={processVisual?.illustration}
        modelAsset={processVisual?.model}
        illustrationUrl={illustrationUrl}
        illustrationStatus={illustrationStatus}
        onRetry={onRetryIllustration}
      />

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
        disabled={disabled}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  num: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.green500, alignItems: 'center', justifyContent: 'center' },
  expect: { backgroundColor: colors.green50, borderRadius: radius.tile, padding: space.md, gap: space.xs },
});
