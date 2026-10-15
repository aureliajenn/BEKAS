import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FixtureBanner } from '@/components/fixture-banner';
import { GlbViewer } from '@/components/glb-viewer';
import { TopBar } from '@/components/top-bar';
import { useActiveProject } from '@/hooks/use-active-project';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';
import type { CraftIdea } from '@/types/contracts';

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const projectId = typeof params.id === 'string' ? params.id : undefined;
  const { project, loading } = useActiveProject(projectId);

  if (loading) return <LoadingScreen />;

  if (!project) {
    return (
      <EmptyProjectScreen
        title="Proyek tidak ditemukan"
        body="Buka beranda untuk memilih foto dan memulai lagi."
        onPress={() => router.replace('/')}
      />
    );
  }

  const needsNewPhoto = project.result.input_status === 'needs_new_photo';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <TopBar title="Hasil barang" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FixtureBanner />

        <View style={styles.photoSummary}>
          <Image source={{ uri: project.photoUri }} contentFit="cover" style={styles.photoThumb} />
          <View style={styles.photoCopy}>
            <Text style={styles.photoLabel}>Foto yang dipilih</Text>
            <Text style={styles.objectLabel}>Contoh objek: botol plastik</Text>
          </View>
          <MaterialCommunityIcons name="image-check-outline" size={22} color={colors.forest} />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Bentuk 3D</Text>
          <Text style={styles.sectionHint}>Status model</Text>
        </View>
        <GlbViewer status="unavailable" />

        {needsNewPhoto ? (
          <View style={styles.invalidPhoto}>
            <MaterialCommunityIcons name="image-off-outline" size={25} color={colors.danger} />
            <Text style={styles.invalidTitle}>Foto perlu diganti</Text>
            <Text style={styles.invalidBody}>
              Coba foto satu barang secara utuh, dengan cahaya merata dan latar sederhana.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/')}>
              <Text style={styles.retryText}>Pilih foto baru</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.sectionHeading, styles.ideasHeading]}>
              <View>
                <Text style={styles.sectionTitle}>Pilih satu ide</Text>
                <Text style={styles.sectionHint}>Tiga kemungkinan untuk contoh botol</Text>
              </View>
              <View style={styles.ideaCount}>
                <Text style={styles.ideaCountText}>{project.result.ideas.length}</Text>
              </View>
            </View>

            <View style={styles.ideaList}>
              {project.result.ideas.map((idea, index) => (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  last={index === project.result.ideas.length - 1}
                  onPress={() =>
                    router.push({ pathname: './idea', params: { id: project.id, ideaId: idea.id } })
                  }
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function IdeaRow({ idea, last, onPress }: { idea: CraftIdea; last: boolean; onPress: () => void }) {
  const icon =
    idea.id === 'seedling-pot'
      ? 'sprout'
      : idea.id === 'hanging-caddy'
        ? 'hanger'
        : 'pencil-ruler';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={`Buka detail ide ${idea.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.ideaRow, last && styles.lastIdeaRow, pressed && styles.pressed]}
    >
      <View style={styles.ideaIconBox}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.forest} />
      </View>
      <View style={styles.ideaCopy}>
        <Text style={styles.ideaTitle}>{idea.title}</Text>
        <Text style={styles.ideaPurpose}>{idea.purpose}</Text>
        <View style={styles.ideaMeta}>
          <Text style={styles.ideaDifficulty}>{idea.difficulty}</Text>
          <View style={styles.metaDot} />
          <MaterialCommunityIcons name="clock-outline" size={14} color={colors.muted} />
          <Text style={styles.ideaMinutes}>{idea.estimated_minutes} menit</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <Text style={styles.loadingText}>Membuka proyek tersimpan</Text>
      </View>
    </SafeAreaView>
  );
}

function EmptyProjectScreen({
  title,
  body,
  onPress,
}: {
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.empty}>
        <MaterialCommunityIcons name="folder-question-outline" size={40} color={colors.forest} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{body}</Text>
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Kembali ke beranda</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  content: { paddingBottom: 28, paddingHorizontal: spacing.lg },
  photoSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  photoThumb: { backgroundColor: colors.mint, borderRadius: 14, height: 56, width: 56 },
  photoCopy: { flex: 1, gap: 3 },
  photoLabel: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 12 },
  objectLabel: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: 14 },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
    marginTop: 25,
  },
  sectionTitle: { color: colors.ink, fontFamily: fontFamily.display, fontSize: 21 },
  sectionHint: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 13, marginTop: 3 },
  ideasHeading: { alignItems: 'center', marginTop: 27 },
  ideaCount: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 31,
    justifyContent: 'center',
    width: 31,
  },
  ideaCountText: { color: colors.forest, fontFamily: fontFamily.bold, fontSize: 14 },
  ideaList: { backgroundColor: colors.white, borderRadius: radii.md, paddingHorizontal: 14 },
  ideaRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 105,
    paddingVertical: 15,
  },
  lastIdeaRow: { borderBottomWidth: 0 },
  ideaIconBox: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 13,
    height: 43,
    justifyContent: 'center',
    width: 43,
  },
  ideaCopy: { flex: 1, gap: 3 },
  ideaTitle: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: 15 },
  ideaPurpose: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 17 },
  ideaMeta: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 3 },
  ideaDifficulty: { color: colors.forest, fontFamily: fontFamily.medium, fontSize: 11 },
  metaDot: { backgroundColor: colors.muted, borderRadius: 2, height: 3, width: 3 },
  ideaMinutes: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 11 },
  invalidPhoto: {
    alignItems: 'center',
    backgroundColor: colors.dangerWash,
    borderRadius: radii.md,
    marginTop: 24,
    padding: 20,
  },
  invalidTitle: { color: colors.danger, fontFamily: fontFamily.semibold, fontSize: 16, marginTop: 8 },
  invalidBody: { color: colors.ink, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center' },
  retryText: { color: colors.forest, fontFamily: fontFamily.semibold, fontSize: 14, marginTop: 15 },
  pressed: { opacity: 0.78 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  loadingText: { color: colors.muted, fontFamily: fontFamily.medium },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontFamily: fontFamily.display, fontSize: 22, marginTop: 16 },
  emptyBody: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  homeButton: { backgroundColor: colors.forest, borderRadius: radii.md, marginTop: 20, paddingHorizontal: 19, paddingVertical: 14 },
  homeButtonText: { color: colors.white, fontFamily: fontFamily.semibold, fontSize: 14 },
});
