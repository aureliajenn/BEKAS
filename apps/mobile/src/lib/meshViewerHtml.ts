const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// The document is also written to cache on native, keeping large GLBs out of the RN bridge.
export function meshViewerHtml(src: string, script: string, background: string): string {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:${background}}model-viewer{width:100%;height:100%;--poster-color:transparent}</style>
</head><body>
<model-viewer id="model" src="${escapeAttribute(src)}" camera-controls touch-action="pan-y" shadow-intensity="0.8" exposure="1.05" interaction-prompt="none" alt="Model barang yang dapat diputar dan diperbesar"></model-viewer>
<script>
  const report = (type) => {
    const data = {source: 'bekas-model-viewer', type};
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data));
    else window.parent.postMessage(data, '*');
  };
  const model = document.getElementById('model');
  model.addEventListener('load', () => report('loaded'));
  model.addEventListener('error', () => report('error'));
  window.addEventListener('unhandledrejection', () => report('error'));
  const script = document.createElement('script');
  script.type = 'module';
  script.src = ${JSON.stringify(script).replace(/</g, '\\u003c')};
  script.onerror = () => report('error');
  document.head.appendChild(script);
</script></body></html>`;
}
