import { createElement } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/theme/tokens';

// Versi terkunci. Sebelum demo, host salinan tepercaya di backend lalu isi EXPO_PUBLIC_MODEL_VIEWER_SCRIPT_URL (PRD §9).
const SCRIPT =
  process.env.EXPO_PUBLIC_MODEL_VIEWER_SCRIPT_URL || 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';

const html = (src: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<script type="module" src="${SCRIPT}"></script>
<style>html,body{margin:0;height:100%;background:${colors.green50}}model-viewer{width:100%;height:100%;--poster-color:transparent}</style>
</head><body><model-viewer src="${encodeURI(src)}" camera-controls touch-action="pan-y" auto-rotate shadow-intensity="0.8" exposure="1.05" interaction-prompt="none"></model-viewer></body></html>`;

/** GLB viewer: putar dan cubit-zoom. Hanya pratinjau bentuk, bukan ukuran nyata. */
export function MeshViewer({ url, height = 260 }: { url: string; height?: number }) {
  if (Platform.OS === 'web') {
    return <View style={{ height }}>{createElement('iframe', { srcDoc: html(url), style: { border: 0, width: '100%', height: '100%' } })}</View>;
  }
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <WebView
        source={{ html: html(url) }}
        originWhitelist={['about:blank']}
        onShouldStartLoadWithRequest={(r) => r.url === 'about:blank'}
        style={{ backgroundColor: colors.green50 }}
        nestedScrollEnabled
      />
    </View>
  );
}
