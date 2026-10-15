import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottleIllustration } from '@/components/bottle-illustration';
import { BrandMark } from '@/components/brand-mark';
import { PrimaryButton } from '@/components/primary-button';
import { WaveLines } from '@/components/wave-lines';
import { chooseAndStorePhoto, CameraPermissionError, openDeviceSettings } from '@/services/photo-input';
import { getActiveProject, type ActiveProject } from '@/state/project-storage';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [busySource, setBusySource] = useState<'camera' | 'library' | null>(null);

  useEffect(() => {
    getActiveProject()
      .then(setActiveProject)
      .catch(() => setActiveProject(null));
  }, []);

  async function selectPhoto(source: 'camera' | 'library') {
    setBusySource(source);
    try {
      const photo = await chooseAndStorePhoto(source);
      if (photo) {
        router.push({ pathname: './preview', params: { uri: photo.uri } });
      }
    } catch (error) {
      if (error instanceof CameraPermissionError) {
        Alert.alert(
          'Akses kamera diperlukan',
          error.canAskAgain
            ? 'Izinkan akses kamera untuk memotret barang bekas.'
            : 'Aktifkan akses kamera di setelan perangkat untuk memotret barang.',
          error.canAskAgain
            ? [{ text: 'Mengerti', style: 'default' }]
            : [
                { text: 'Nanti', style: 'cancel' },
                { text: 'Buka setelan', onPress: () => void openDeviceSettings() },
              ],
        );
      } else {
        Alert.alert(
          source === 'camera' ? 'Kamera tidak dapat dibuka' : 'Galeri tidak dapat dibuka',
          error instanceof Error ? error.message : 'Coba lagi atau pilih foto lain.',
        );
      }
    } finally {
      setBusySource(null);
    }
  }

  function resumeProject() {
    if (activeProject) {
      router.push({ pathname: './result', params: { id: activeProject.id } });
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <WaveLines />
          <View style={styles.brandRow}>
            <BrandMark />
            <View style={styles.noAccount}>
              <View style={styles.onlineDot} />
              <Text style={styles.noAccountText}>Tanpa akun</Text>
            </View>
          </View>
          <Text style={styles.headline}>Barang lama,{'\n'}awal baru.</Text>
          <Text style={styles.intro}>
            Temukan cara sederhana untuk mengubah botol dan wadah plastik menjadi sesuatu yang berguna.
          </Text>
          <View pointerEvents="none" style={styles.bottleArt}>
            <BottleIllustration width={142} height={164} />
          </View>
          <Text style={styles.heroFootnote}>Mulai dengan satu barang yang bersih.</Text>
        </View>

        <View style={styles.actions}>
          <Text style={styles.sectionTitle}>Apa yang ingin kamu pakai?</Text>
          <Text style={styles.sectionCopy}>Pilih satu foto dengan barang terlihat utuh.</Text>

          <View style={styles.buttonStack}>
            <PrimaryButton
              title="Foto barang"
              icon="camera-outline"
              variant="lime"
              loading={busySource === 'camera'}
              disabled={busySource !== null && busySource !== 'camera'}
              accessibilityHint="Membuka kamera untuk memotret satu barang bekas"
              onPress={() => void selectPhoto('camera')}
            />
            <PrimaryButton
              title="Pilih dari galeri"
              icon="image-outline"
              variant="outline"
              loading={busySource === 'library'}
              disabled={busySource !== null && busySource !== 'library'}
              accessibilityHint="Memilih satu foto barang dari galeri perangkat"
              onPress={() => void selectPhoto('library')}
            />
          </View>

          {activeProject ? (
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Membuka kembali proyek terakhir"
              onPress={resumeProject}
              style={({ pressed }) => [styles.resume, pressed && styles.pressed]}
            >
              <View style={styles.resumeThumb}>
                <MaterialCommunityIcons name="recycle" size={22} color={colors.forest} />
              </View>
              <View style={styles.resumeCopy}>
                <Text style={styles.resumeTitle}>Lanjutkan proyek terakhir</Text>
                <Text style={styles.resumeSub}>Ide dan kemajuanmu tersimpan di perangkat</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={23} color={colors.forest} />
            </Pressable>
          ) : (
            <View style={styles.tip}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color={colors.forest} />
              <Text style={styles.tipText}>
                Hasil terbaik dimulai dari satu objek, latar sederhana, dan cahaya yang cukup.
              </Text>
            </View>
          )}

          <Text style={styles.scope}>Saat ini: botol plastik dan wadah plastik kaku.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: {
    backgroundColor: colors.forest,
    minHeight: 376,
    overflow: 'hidden',
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    position: 'relative',
  },
  brandRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  noAccount: {
    alignItems: 'center',
    borderColor: '#FFFFFF35',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  onlineDot: { backgroundColor: colors.lime, borderRadius: 4, height: 7, width: 7 },
  noAccountText: { color: '#E4F0E8', fontFamily: fontFamily.medium, fontSize: 12 },
  headline: {
    color: colors.white,
    fontFamily: fontFamily.displayBold,
    fontSize: 37,
    lineHeight: 41,
    marginTop: 34,
    maxWidth: 280,
  },
  intro: {
    color: '#DFEAE4',
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 210,
  },
  bottleArt: { bottom: 8, opacity: 0.96, position: 'absolute', right: -24 },
  heroFootnote: {
    color: '#C5D8CE',
    fontFamily: fontFamily.medium,
    fontSize: 12,
    marginTop: 31,
    maxWidth: 190,
  },
  actions: {
    backgroundColor: colors.paper,
    flex: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: 28,
  },
  sectionTitle: { color: colors.ink, fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28 },
  sectionCopy: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 14, marginTop: 5 },
  buttonStack: { gap: 11, marginTop: 22 },
  resume: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    padding: 13,
  },
  resumeThumb: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  resumeCopy: { flex: 1, gap: 3 },
  resumeTitle: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: 14 },
  resumeSub: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  tip: {
    alignItems: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    padding: 14,
  },
  tipText: { color: colors.ink, flex: 1, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19 },
  scope: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 17,
    textAlign: 'center',
  },
  pressed: { opacity: 0.8 },
});
