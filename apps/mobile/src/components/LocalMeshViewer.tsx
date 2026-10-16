import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '@/theme/tokens';
import { extraCopy } from '@/theme/statusCopy';
import { meshViewerHtml } from '@/lib/meshViewerHtml';
import { ChunkyButton } from './ChunkyButton';
import { MeshViewer, MODEL_VIEWER_SCRIPT } from './MeshViewer';

/** Loads a bundled GLB for both browser iframe and Android WebView. */
export function LocalMeshViewer({ asset: moduleId, height = 300 }: { asset: number; height?: number }) {
  const [model, setModel] = useState<{ asset: number; url?: string; documentUri?: string; error?: boolean }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const asset = Asset.fromModule(moduleId);
        if (Platform.OS === 'web') {
          // Nested routes need an absolute asset URL inside srcDoc.
          const url = new URL(asset.uri, window.location.href).href;
          if (active) setModel({ asset: moduleId, url });
        } else {
          await asset.downloadAsync();
          const directory = new Directory(Paths.cache, 'bekas-model-viewer');
          directory.create({ idempotent: true, intermediates: true });
          // Only the short file URI crosses the RN/WebView bridge, never 20 MB of HTML.
          const document = new File(directory, `model-${asset.hash ?? moduleId}-v2.html`);
          if (!document.exists || attempt > 0) {
            const base64 = await new File(asset.localUri ?? asset.uri).base64();
            document.write(meshViewerHtml(`data:model/gltf-binary;base64,${base64}`, MODEL_VIEWER_SCRIPT, colors.green50));
          }
          if (active) setModel({ asset: moduleId, documentUri: document.uri });
        }
      } catch {
        if (active) setModel({ asset: moduleId, error: true });
      }
    };
    void load();
    return () => { active = false; };
  }, [moduleId, attempt]);

  const current = model?.asset === moduleId ? model : undefined;
  if (current?.url) return <MeshViewer key={moduleId} url={current.url} height={height} />;
  if (current?.documentUri) return <MeshViewer key={moduleId} documentUri={current.documentUri} height={height} />;

  return (
    <View style={[styles.state, { height }]} accessibilityLiveRegion="polite">
      {current?.error ? <>
        <Text style={styles.caption}>{extraCopy.meshViewerFailed}</Text>
        <ChunkyButton label="Coba lagi" variant="secondary" onPress={() => {
          setModel(undefined);
          setAttempt((value) => value + 1);
        }} />
      </> : <>
        <ActivityIndicator color={colors.green500} />
        <Text style={styles.caption}>{extraCopy.meshWorkerPreparing}</Text>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { padding: space.xl, gap: space.md, alignItems: 'center', justifyContent: 'center' },
  caption: { ...type.caption, textAlign: 'center' },
});
