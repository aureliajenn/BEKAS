import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { meshViewerHtml } from '@/lib/meshViewerHtml';
import { extraCopy } from '@/theme/statusCopy';
import { colors, space, type } from '@/theme/tokens';
import { ChunkyButton } from './ChunkyButton';

// Versi terkunci. Sebelum demo, host salinan tepercaya di backend lalu isi EXPO_PUBLIC_MODEL_VIEWER_SCRIPT_URL (PRD §9).
export const MODEL_VIEWER_SCRIPT =
  process.env.EXPO_PUBLIC_MODEL_VIEWER_SCRIPT_URL || 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';

/** GLB viewer: putar dan cubit-zoom. Hanya pratinjau bentuk, bukan ukuran nyata. */
export function MeshViewer({ url, documentUri, height = 260 }: { url?: string; documentUri?: string; height?: number }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const iframe = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => documentUri ? undefined : meshViewerHtml(url ?? '', MODEL_VIEWER_SCRIPT, colors.green50), [url, documentUri]);
  const receive = (data: { source?: string; type?: string }) => {
    if (data?.source !== 'bekas-model-viewer') return;
    if (data.type === 'loaded') setStatus('loaded');
    if (data.type === 'error') setStatus('error');
  };
  useEffect(() => {
    setStatus('loading');
    const timeout = setTimeout(() => setStatus((prev) => prev === 'loading' ? 'error' : prev), 60000);
    const onMessage = (event: MessageEvent) => {
      if (event.source === iframe.current?.contentWindow) receive(event.data);
    };
    if (Platform.OS === 'web') window.addEventListener('message', onMessage);
    return () => {
      clearTimeout(timeout);
      if (Platform.OS === 'web') window.removeEventListener('message', onMessage);
    };
  }, [url, documentUri, attempt]);

  return (
    <View style={{ height, overflow: 'hidden' }}>
      {Platform.OS === 'web' ? createElement('iframe', {
        key: attempt, ref: iframe, srcDoc: html, title: 'Model 3D interaktif',
        style: { border: 0, width: '100%', height: '100%' },
      }) : <WebView
        key={attempt}
        source={documentUri ? { uri: documentUri } : { html: html! }}
        originWhitelist={['about:blank', 'file://*']}
        allowFileAccess={!!documentUri}
        allowingReadAccessToURL={documentUri?.slice(0, documentUri.lastIndexOf('/') + 1)}
        onShouldStartLoadWithRequest={(r) => r.url === 'about:blank' || r.url === documentUri}
        onMessage={(event) => {
          try { receive(JSON.parse(event.nativeEvent.data)); } catch { /* Ignore unrelated bridge messages. */ }
        }}
        onError={() => setStatus('error')}
        onContentProcessDidTerminate={() => setStatus('error')}
        onRenderProcessGone={() => setStatus('error')}
        style={{ backgroundColor: colors.green50 }}
        nestedScrollEnabled
      />}
      {status !== 'loaded' ? <View style={styles.state} accessibilityLiveRegion="polite">
        {status === 'loading' ? <ActivityIndicator color={colors.green500} /> : null}
        <Text style={styles.caption}>{status === 'loading' ? extraCopy.meshViewerLoading : extraCopy.meshViewerFailed}</Text>
        {status === 'error' ? <ChunkyButton label={extraCopy.retry} variant="secondary" onPress={() => {
          setStatus('loading');
          setAttempt((value) => value + 1);
        }} /> : null}
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.green50, padding: space.xl, gap: space.md, alignItems: 'center', justifyContent: 'center' },
  caption: { ...type.caption, textAlign: 'center' },
});
