import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, fontFamily, radii } from '@/theme/tokens';

export type MeshStatus = 'queued' | 'running' | 'ready' | 'failed' | 'unavailable';

const MODEL_VIEWER_SCRIPT =
  process.env.EXPO_PUBLIC_MODEL_VIEWER_SCRIPT_URL ??
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js';
const TRUSTED_PAGE_ORIGIN = getTrustedPageOrigin();

export function GlbViewer({
  status,
  modelUrl,
  onRetry,
}: {
  status: MeshStatus;
  modelUrl?: string | null;
  onRetry?: () => void;
}) {
  const hasSecureModelUrl = typeof modelUrl === 'string' && /^https:\/\//i.test(modelUrl);
  if (status === 'ready' && hasSecureModelUrl && modelUrl) {
    const safeModelUrl = escapeAttribute(modelUrl);
    const html = `<!doctype html>
      <html lang="id">
        <head>
          <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
          <style>
            html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#DDF3EC}
            model-viewer{width:100%;height:100%;--poster-color:transparent;background:transparent}
          </style>
          <script type="module" src="${MODEL_VIEWER_SCRIPT}"></script>
        </head>
        <body><model-viewer src="${safeModelUrl}" camera-controls touch-action="pan-y" interaction-prompt="none" shadow-intensity="0.3"></model-viewer></body>
      </html>`;

    return (
      <View style={styles.viewerFrame}>
        <WebView
          source={{ html, baseUrl: TRUSTED_PAGE_ORIGIN }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled={false}
          scrollEnabled={false}
          allowsBackForwardNavigationGestures={false}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(request) => {
            if (request.isTopFrame === false) return true;
            if (request.url === 'about:blank') return true;
            try {
              return new URL(request.url).origin === TRUSTED_PAGE_ORIGIN;
            } catch {
              return false;
            }
          }}
          style={styles.webView}
          accessibilityLabel="Pratinjau model 3D; geser untuk memutar dan cubit untuk memperbesar"
        />
      </View>
    );
  }

  const copy = statusCopy[status];
  return (
    <View style={[styles.placeholder, status === 'failed' && styles.failed]}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={copy.icon} size={30} color={status === 'failed' ? colors.danger : colors.forest} />
      </View>
      <View style={styles.copy}>
        <View style={styles.statusLine}>
          <View style={[styles.statusDot, status === 'failed' && styles.failedDot]} />
          <Text style={styles.status}>{copy.label}</Text>
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
      </View>
      {status === 'failed' && onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Coba lagi</Text>
        </Pressable>
      ) : null}
      {status === 'unavailable' ? (
        <Text style={styles.disclaimer}>Pratinjau bukan ukuran nyata.</Text>
      ) : null}
    </View>
  );
}

function getTrustedPageOrigin(): string {
  const configuredApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!configuredApiUrl) return 'https://bekas.app';

  try {
    return new URL(configuredApiUrl).origin;
  } catch {
    return 'https://bekas.app';
  }
}

const statusCopy: Record<MeshStatus, { label: string; title: string; body: string; icon: 'cube-outline' | 'progress-clock' | 'cube-scan' | 'cube-off-outline' }> = {
  queued: {
    label: 'Menunggu pemrosesan',
    title: 'Model 3D masuk antrean',
    body: 'Kamu tetap bisa melihat ide sambil menunggu.',
    icon: 'progress-clock',
  },
  running: {
    label: 'Sedang diproses',
    title: 'Membuat bentuk 3D',
    body: 'Proses ini dapat berjalan terpisah dari rekomendasi.',
    icon: 'cube-scan',
  },
  ready: {
    label: 'Siap',
    title: 'Model 3D siap',
    body: 'Geser untuk memutar dan cubit untuk memperbesar.',
    icon: 'cube-outline',
  },
  failed: {
    label: 'Belum tersedia',
    title: 'Model 3D gagal dibuat',
    body: 'Ide tetap dapat dipakai. Kamu bisa mencoba mesh lagi.',
    icon: 'cube-off-outline',
  },
  unavailable: {
    label: 'GPU belum tersambung',
    title: 'Model 3D belum tersedia',
    body: 'Ide di bawah tetap bisa digunakan.',
    icon: 'cube-outline',
  },
};

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 13,
    padding: 15,
  },
  failed: { backgroundColor: '#FFF9F7' },
  iconBox: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 14, height: 52, justifyContent: 'center', width: 52 },
  copy: { flex: 1, gap: 4, minWidth: 180 },
  statusLine: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  statusDot: { backgroundColor: '#C9892B', borderRadius: 4, height: 7, width: 7 },
  failedDot: { backgroundColor: colors.danger },
  status: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 12 },
  title: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: 15 },
  body: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 18 },
  retry: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, width: '100%' },
  retryText: { color: colors.forest, fontFamily: fontFamily.semibold, fontSize: 13 },
  disclaimer: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 11, width: '100%' },
  viewerFrame: { backgroundColor: colors.mint, borderRadius: radii.md, height: 230, overflow: 'hidden' },
  webView: { backgroundColor: 'transparent', flex: 1 },
});
