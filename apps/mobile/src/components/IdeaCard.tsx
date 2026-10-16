import { ChevronRight } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { UPCYCLE_POINTS } from '../lib/api';
import type { CraftIdea } from '../types/contracts';
import { ideaTiles } from '../theme/assets';
import { colors, space, type } from '../theme/tokens';
import { Card, difficultyTone, IlluTile, Pill, PointsPill } from './Card';
import { Clock } from './illustrations';

type Props = { idea: CraftIdea; index: number; selected?: boolean; onPress: () => void };

export function IdeaCard({ idea, index, selected, onPress }: Props) {
  const tile = ideaTiles[index % ideaTiles.length];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${idea.title}. ${idea.difficulty}, sekitar ${idea.estimated_minutes} menit`}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <Card selected={selected} style={styles.row}>
        <IlluTile bg={tile.bg} size={72}>
          <Image source={tile.icon} style={styles.icon} resizeMode="contain" accessible={false} />
        </IlluTile>
        <View style={styles.body}>
          <Text style={type.h3}>{idea.title}</Text>
          <Text style={type.caption} numberOfLines={2}>
            {idea.purpose}
          </Text>
          <View style={styles.pills}>
            <Pill label={idea.difficulty} tone={difficultyTone(idea.difficulty)} />
            <Pill label={`±${idea.estimated_minutes} menit`} tone="info" icon={<Clock size={16} />} />
            {/* Poin upcycle diberikan setelah hasil diverifikasi (PRD 17.2), sama untuk setiap ide. */}
            <PointsPill points={UPCYCLE_POINTS} />
          </View>
        </View>
        <ChevronRight size={22} color={colors.iconIdle} strokeWidth={2.5} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 56, height: 56 },
  body: { flex: 1, gap: space.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
