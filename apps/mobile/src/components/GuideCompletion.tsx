import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { Image, StyleSheet, Text } from 'react-native';

import { clearActiveProject } from '@/lib/storage';
import type { GuideResult, ProjectView } from '@/types/contracts';
import { mascot } from '@/theme/assets';
import { colors, space, type } from '@/theme/tokens';
import { Card } from './Card';
import { ChunkyButton } from './ChunkyButton';
import { VerifyPanel } from './VerifyPanel';

export function GuideCompletion({ project, guide }: { project: ProjectView; guide: GuideResult }) {
  return (
    <Card style={styles.card}>
      <Image source={mascot.senang} style={styles.mascot} resizeMode="contain" accessible={false} />
      <Text style={[type.h2, styles.center]}>Kerajinanmu jadi!</Text>
      <Text style={[type.body, styles.center, { color: colors.muted }]}>
        Semua {guide.steps.length} langkah {guide.title.toLowerCase()} sudah kamu centang.
      </Text>
      <VerifyPanel project={project} />
      <ChunkyButton
        label="Foto barang lain"
        variant="secondary"
        icon={<Camera size={22} color={colors.green700} strokeWidth={2.5} />}
        onPress={async () => {
          await clearActiveProject();
          router.dismissTo('/');
        }}
        style={{ alignSelf: 'stretch' }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: space.md },
  mascot: { width: 140, height: 170 },
  center: { textAlign: 'center' },
});
