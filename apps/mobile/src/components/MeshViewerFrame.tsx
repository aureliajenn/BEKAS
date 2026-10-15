import { Image, StyleSheet, Text, View } from 'react-native';

import { mascot } from '../theme/assets';
import { extraCopy, type JobStatus } from '../theme/statusCopy';
import { colors, radius, space, type } from '../theme/tokens';
import { MeshViewer } from './MeshViewer';
import { StageStatus } from './StageStatus';

const HEIGHT = 300;

type Props = {
  status: JobStatus;
  /** GLB siap tampil. */
  meshUrl?: string;
  /** Foto asli, ditampilkan redup selama mesh belum siap. */
  photoUrl?: string;
  /** Misalnya extraCopy.meshWorkerUnavailable. */
  labelOverride?: string;
  onRetry?: () => void;
};

export function MeshViewerFrame({ status, meshUrl, photoUrl, labelOverride, onRetry }: Props) {
  const ready = status === 'succeeded' && !!meshUrl;
  const failed = status === 'failed' || (status === 'succeeded' && !meshUrl);

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.frame}>
        {ready ? (
          <MeshViewer url={meshUrl} height={HEIGHT} />
        ) : failed ? (
          <View style={styles.center}>
            <Image source={mascot.bingung} style={styles.mascot} resizeMode="contain" accessible={false} />
            <View style={{ alignSelf: 'stretch' }}>
              <StageStatus items={[{ kind: 'mesh', status: 'failed', labelOverride, onRetry }]} />
            </View>
          </View>
        ) : (
          <>
            {photoUrl ? <Image source={{ uri: photoUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} resizeMode="cover" accessible={false} /> : null}
            <View style={styles.statusDock}>
              <StageStatus items={[{ kind: 'mesh', status, labelOverride }]} />
            </View>
          </>
        )}
      </View>
      <Text style={[type.caption, { textAlign: 'center' }]}>{extraCopy.meshDisclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: HEIGHT, borderRadius: 28, backgroundColor: colors.green50, overflow: 'hidden', justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  mascot: { width: 96, height: 120 },
  statusDock: { padding: space.md },
});
