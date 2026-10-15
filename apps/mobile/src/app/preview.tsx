import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TopBar } from '@/components/top-bar';
import { createFixtureProject, FIXTURES_ENABLED } from '@/services/local-projects';
import { saveActiveProject } from '@/state/project-storage';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

export default function PhotoPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ uri?: string }>();
  const photoUri = typeof params.uri === 'string' ? params.uri : null;
  const [submitting, setSubmitting] = useState(false);

  async function continueWithPhoto() {
    if (!photoUri) {
      Alert.alert('Foto tidak tersedia', 'Kembali dan pilih foto barang sekali lagi.');
      return;
    }

    if (!FIXTURES_ENABLED) {
      Alert.alert('Backend belum tersambung', 'Aktifkan mode contoh untuk menjelajahi alur frontend.');
      return;
    }

    setSubmitting(true);
    try {
      const project = createFixtureProject(photoUri);
      await saveActiveProject(project);
      router.replace({ pathname: './result', params: { id: project.id } });
    } catch {
      Alert.alert('Proyek tidak tersimpan', 'Pastikan ruang penyimpanan perangkat tersedia, lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View>
          <TopBar title="Periksa foto" />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Pastikan barang terlihat jelas.</Text>
          <Text style={styles.description}>
            Gunakan satu objek utuh dengan cahaya merata. Kamu bisa memilih ulang kapan saja.
          </Text>

          <View style={styles.photoFrame}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} contentFit="cover" style={styles.photo} />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.fallbackText}>Foto tidak ditemukan</Text>
              </View>
            )}
            <View style={styles.photoTag}>
              <View style={styles.tagDot} />
              <Text style={styles.photoTagText}>Foto tersimpan di perangkat</Text>
            </View>
          </View>

          <View style={styles.checks}>
            <PhotoCheck text="Satu barang" />
            <PhotoCheck text="Tidak terpotong" />
            <PhotoCheck text="Latar sederhana" />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <PrimaryButton
            title="Lanjutkan ke contoh ide"
            icon="arrow-right"
            variant="lime"
            loading={submitting}
            onPress={() => void continueWithPhoto()}
            accessibilityHint="Menyimpan foto lokal dan membuka hasil contoh yang diberi label"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.changePhoto}
          >
            <Text style={styles.changePhotoText}>Pilih foto lain</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PhotoCheck({ text }: { text: string }) {
  return (
    <View style={styles.checkItem}>
      <View style={styles.checkIcon}>
        <Text style={styles.checkMark}>✓</Text>
      </View>
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 22, paddingHorizontal: spacing.lg, paddingTop: 14 },
  title: { color: colors.ink, fontFamily: fontFamily.display, fontSize: 27, lineHeight: 33 },
  description: {
    color: colors.muted,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  photoFrame: {
    aspectRatio: 0.92,
    backgroundColor: colors.mint,
    borderRadius: radii.lg,
    marginTop: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: { height: '100%', width: '100%' },
  photoFallback: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  fallbackText: { color: colors.muted, fontFamily: fontFamily.medium },
  photoTag: {
    alignItems: 'center',
    backgroundColor: '#0B2925E8',
    borderRadius: radii.pill,
    bottom: 14,
    flexDirection: 'row',
    gap: 8,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
  },
  tagDot: { backgroundColor: colors.lime, borderRadius: 4, height: 7, width: 7 },
  photoTagText: { color: colors.white, fontFamily: fontFamily.medium, fontSize: 12 },
  checks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 17,
  },
  checkItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  checkIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 9,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkMark: { color: colors.forest, fontFamily: fontFamily.bold, fontSize: 12 },
  checkText: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 12 },
  footer: {
    backgroundColor: colors.paper,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
  },
  changePhoto: { alignItems: 'center', minHeight: 38, justifyContent: 'center' },
  changePhotoText: { color: colors.muted, fontFamily: fontFamily.semibold, fontSize: 14 },
});
