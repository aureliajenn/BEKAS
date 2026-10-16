import { Box, ImageIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { JobStatus } from '@/types/contracts';
import { colors, radius, space, touch, type } from '@/theme/tokens';
import { LocalMeshViewer } from './LocalMeshViewer';
import { StageStatus } from './StageStatus';

type Props = {
  title: string;
  illustrationUrl?: string;
  illustrationAsset?: number;
  modelAsset?: number;
  illustrationStatus?: JobStatus;
  onRetry?: () => void;
};

export function ProcessVisual(props: Props) {
  const [view, setView] = useState<'2d' | '3d'>('2d');
  return (
    <View style={styles.wrap}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(['2d', '3d'] as const).map((mode) => {
          const selected = view === mode;
          const Icon = mode === '2d' ? ImageIcon : Box;
          return (
            <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected }}
              onPress={() => setView(mode)}
              style={({ pressed }) => [styles.tab, selected && styles.selected, { opacity: pressed ? 0.7 : 1 }]}>
              <Icon size={22} strokeWidth={2.5} color={selected ? colors.white : colors.green700} />
              <Text style={[type.bodyL, { color: selected ? colors.white : colors.green700 }]}>
                {mode === '2d' ? 'Ilustrasi 2D' : 'Model 3D'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.frame}>
        {view === '3d' ? (
          props.modelAsset ? <LocalMeshViewer asset={props.modelAsset} /> : (
            <View style={styles.empty}>
              <Box size={32} color={colors.iconIdle} strokeWidth={2.5} />
              <Text style={type.bodyL}>Model 3D proses ini belum tersedia</Text>
              <Text style={styles.caption}>Kamu tetap bisa mengikuti instruksi di bawah.</Text>
            </View>
          )
        ) : props.illustrationAsset || props.illustrationUrl ? (
          <Image source={props.illustrationAsset ?? { uri: props.illustrationUrl }}
            style={styles.image} resizeMode="contain" accessibilityLabel={`Ilustrasi ${props.title}`} />
        ) : !props.illustrationStatus || props.illustrationStatus === 'succeeded' ? (
          <View style={styles.empty}>
            <ImageIcon size={32} color={colors.iconIdle} strokeWidth={2.5} />
            <Text style={styles.caption}>Ilustrasi proses ini belum tersedia.</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <StageStatus items={[{ kind: 'illustration', status: props.illustrationStatus, onRetry: props.onRetry }]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tab: { flex: 1, minHeight: touch.primaryButton, padding: space.md, borderRadius: radius.button,
    backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  selected: { backgroundColor: colors.green500 },
  frame: { minHeight: 300, backgroundColor: colors.green50, borderRadius: radius.tile, overflow: 'hidden' },
  image: { width: '100%', height: 300 },
  empty: { minHeight: 300, padding: space.xl, gap: space.md, alignItems: 'center', justifyContent: 'center' },
  caption: { ...type.caption, textAlign: 'center' },
});
