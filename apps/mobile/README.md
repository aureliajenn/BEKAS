# BEKAS Mobile

Android-first React Native app built with Expo, TypeScript, and Expo Router.

## Commands

```powershell
npm install
npm start
npm run android
npm run typecheck
```

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the API address reachable from the Android device. Never put server credentials in `EXPO_PUBLIC_*` variables.

Image picker, image manipulation, WebView, AsyncStorage, and TanStack Query are installed for the MVP path. The first route is only a launch check; product screens will follow the PRD golden path.
