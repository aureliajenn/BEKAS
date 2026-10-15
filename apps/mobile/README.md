# BEKAS Mobile

Android-first React Native app built with Expo, TypeScript, and Expo Router.

## Commands

```powershell
npm install
npm start
npm run android
npm run typecheck
```

Copy `.env.example` to `.env`. `EXPO_PUBLIC_USE_FIXTURES=true` keeps the app in demo mode; `EXPO_PUBLIC_API_BASE_URL` is reserved for backend integration. For a physical Android device, use the computer's LAN address, not `localhost`. Never put server credentials in `EXPO_PUBLIC_*` variables.

The app follows the PRD golden path: home → photo preview → results → idea detail → guide. Camera/gallery photos are re-encoded as JPEG, resized to at most 1,536 px, capped at 5 MB, and stored in the app's document directory. Active project and checked guide steps persist locally.

While the backend is unavailable, demo ideas and guides come from local fixtures. Every result screen labels them **“Contoh tersimpan”** and states that they were not generated from the selected photo. Mesh status stays “GPU belum tersambung”; no sample mesh is presented as a real reconstruction.

The WebView viewer uses a version-pinned `model-viewer` script. Before a demo with real GLBs, host that exact script on the backend or bundle it, then point `EXPO_PUBLIC_MODEL_VIEWER_SCRIPT_URL` to the trusted copy.
