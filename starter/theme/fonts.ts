// Pakai di app/_layout.tsx:
//
//   import * as SplashScreen from 'expo-splash-screen';
//   import { useEffect } from 'react';
//   import { Stack } from 'expo-router';
//   import { useBekasFonts } from '@/theme/fonts';
//
//   SplashScreen.preventAutoHideAsync();
//
//   export default function RootLayout() {
//     const [loaded, error] = useBekasFonts();
//     useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);
//     if (!loaded && !error) return null;
//     return <Stack screenOptions={{ headerShown: false }} />;
//   }

import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';

export function useBekasFonts() {
  return useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
}
