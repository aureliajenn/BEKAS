import { router } from 'expo-router';

/** Kembali bila ada riwayat; kalau layar dibuka langsung (deep link/reload), ke Beranda. */
export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
