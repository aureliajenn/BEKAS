import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FixtureBanner } from '@/components/fixture-banner';
import { PrimaryButton } from '@/components/primary-button';
import { TopBar } from '@/components/top-bar';
import { useActiveProject } from '@/hooks/use-active-project';
import { getFixtureGuide } from '@/data/fixtures';
import { saveActiveProject } from '@/state/project-storage';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';
import type { CraftIdea } from '@/types/contracts';

export default function IdeaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; ideaId?: string }>();
  const projectId = typeof params.id === 'string' ? params.id : undefined;
  const ideaId = typeof params.ideaId === 'string' ? params.ideaId : undefined;
  const { project, loading } = useActiveProject(projectId);
  const [creating, setCreating] = useState(false);

  if (loading) return <LoadingScreen />;
  const idea = project?.result.ideas.find((item) => item.id === ideaId) ?? null;

  if (!project || !idea) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <TopBar title="Detail ide" />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ide tidak ditemukan</Text>
          <Text style={styles.emptyBody}>Kembali ke hasil untuk memilih ide yang tersedia.</Text>
          <PrimaryButton title="Kembali ke hasil" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const activeProject = project;

  async function createGuide(selectedIdea: CraftIdea) {
    const guide = getFixtureGuide(selectedIdea.id);
    if (!guide) {
      Alert.alert('Panduan belum tersedia', 'Pilih ide lain dari daftar.');
      return;
    }

    setCreating(true);
    try {
      const nextProject = {
        ...activeProject,
        selectedIdeaId: selectedIdea.id,
        guide,
        completedStepIds: [],
      };
      await saveActiveProject(nextProject);
      router.push({ pathname: './guide', params: { id: activeProject.id } });
    } catch {
      Alert.alert('Panduan tidak tersimpan', 'Periksa ruang penyimpanan perangkat, lalu coba lagi.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <TopBar title="Detail ide" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FixtureBanner compact />

        <Text style={styles.objectContext}>Contoh untuk botol plastik</Text>
        <Text style={styles.title}>{idea.title}</Text>
        <Text style={styles.purpose}>{idea.purpose}</Text>

        <View style={styles.metaRow}>
          <MetaItem icon="chart-donut" label="Kesulitan" value={idea.difficulty} />
          <View style={styles.metaDivider} />
          <MetaItem icon="clock-outline" label="Perkiraan" value={`${idea.estimated_minutes} menit`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yang kamu perlukan</Text>
          <Text style={styles.listLabel}>Bahan tambahan</Text>
          <BulletList items={idea.extra_materials.length ? idea.extra_materials : ['Tidak ada bahan tambahan']} />
          <Text style={[styles.listLabel, styles.secondList]}>Alat</Text>
          <BulletList items={idea.tools} />
        </View>

        {idea.safety_notes.length > 0 ? (
          <View style={styles.safety}>
            <Text style={styles.safetyTitle}>Perhatikan keselamatan</Text>
            {idea.safety_notes.map((note) => (
              <Text key={note} style={styles.safetyText}>{note}</Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          title="Buat panduan"
          icon="book-open-page-variant-outline"
          variant="lime"
          loading={creating}
          onPress={() => void createGuide(idea)}
          accessibilityHint="Membuka panduan contoh dengan langkah dan kemajuan lokal"
        />
      </View>
    </SafeAreaView>
  );
}

function MetaItem({ icon, label, value }: { icon: 'chart-donut' | 'clock-outline'; label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.forest} />
      <View style={styles.metaCopy}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.empty}><Text style={styles.emptyBody}>Membuka ide tersimpan</Text></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  content: { paddingBottom: 26, paddingHorizontal: spacing.lg, paddingTop: 12 },
  objectContext: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 13, marginTop: 24 },
  title: { color: colors.ink, fontFamily: fontFamily.displayBold, fontSize: 31, lineHeight: 37, marginTop: 5 },
  purpose: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22, marginTop: 9 },
  metaRow: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.md,
    flexDirection: 'row',
    marginTop: 22,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  metaItem: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10 },
  metaCopy: { gap: 2 },
  metaLabel: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 11 },
  metaValue: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: 13 },
  metaDivider: { backgroundColor: '#AFCABC', height: 34, marginHorizontal: 14, width: StyleSheet.hairlineWidth },
  section: { marginTop: 27 },
  sectionTitle: { color: colors.ink, fontFamily: fontFamily.display, fontSize: 20, marginBottom: 17 },
  listLabel: { color: colors.muted, fontFamily: fontFamily.semibold, fontSize: 13 },
  secondList: { marginTop: 19 },
  bulletList: { gap: 11, marginTop: 9 },
  bulletRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  bullet: { backgroundColor: colors.lime, borderColor: colors.forest, borderRadius: 5, borderWidth: 1, height: 9, marginTop: 5, width: 9 },
  bulletText: { color: colors.ink, flex: 1, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21 },
  safety: { backgroundColor: '#EDEFE8', borderRadius: radii.md, marginTop: 26, padding: 16 },
  safetyTitle: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: 14 },
  safetyText: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 20, marginTop: 7 },
  footer: { backgroundColor: colors.paper, paddingHorizontal: spacing.lg, paddingTop: 12 },
  empty: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontFamily: fontFamily.display, fontSize: 22 },
  emptyBody: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
