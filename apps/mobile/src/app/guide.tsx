import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FixtureBanner } from '@/components/fixture-banner';
import { IllustrationPanel, type IllustrationStatus } from '@/components/illustration-panel';
import { TopBar } from '@/components/top-bar';
import { useActiveProject } from '@/hooks/use-active-project';
import { saveActiveProject } from '@/state/project-storage';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';
import type { GuideStep } from '@/types/contracts';

const stepIcons = [
  'bottle-soda-outline',
  'pencil-outline',
  'content-cut',
  'tape-measure',
] as const;

export default function GuideScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const projectId = typeof params.id === 'string' ? params.id : undefined;
  const { project, setProject, loading } = useActiveProject(projectId);
  const [savingStepId, setSavingStepId] = useState<string | null>(null);
  const currentGuide = project?.guide;

  if (loading) return <LoadingScreen />;

  if (!project || !currentGuide) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <TopBar title="Panduan" />
        <View style={styles.empty}>
          <MaterialCommunityIcons name="book-outline" size={39} color={colors.forest} />
          <Text style={styles.emptyTitle}>Panduan belum tersedia</Text>
          <Text style={styles.emptyBody}>Pilih satu ide untuk membuka panduannya.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.homeButton}>
            <Text style={styles.homeButtonText}>Kembali ke beranda</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const activeProject = project;
  const guide = currentGuide;
  const completed = activeProject.completedStepIds.length;
  const allComplete = completed === guide.steps.length;

  async function toggleStep(stepId: string) {
    const checked = activeProject.completedStepIds.includes(stepId);
    const completedStepIds = checked
      ? activeProject.completedStepIds.filter((id) => id !== stepId)
      : [...activeProject.completedStepIds, stepId];
    const nextProject = { ...activeProject, completedStepIds };

    setProject(nextProject);
    setSavingStepId(stepId);
    try {
      await saveActiveProject(nextProject);
    } catch {
      setProject(activeProject);
      Alert.alert('Kemajuan belum tersimpan', 'Coba centang langkah ini sekali lagi.');
    } finally {
      setSavingStepId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <TopBar title="Panduan" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FixtureBanner compact />

        <Text style={styles.title}>{guide.title}</Text>
        <Text style={styles.intro}>
          Ikuti langkah sesuai urutan. Teks panduan bisa dibaca meski ilustrasi belum tersedia.
        </Text>

        <View style={styles.progress}>
          <View style={styles.progressCopy}>
            <Text style={styles.progressTitle}>Kemajuan di perangkat ini</Text>
            <Text style={styles.progressCount}>{completed} dari {guide.steps.length} langkah selesai</Text>
          </View>
          <View style={styles.progressMarks}>
            {guide.steps.map((step) => (
              <View
                key={step.id}
                style={[styles.progressMark, activeProject.completedStepIds.includes(step.id) && styles.progressMarkDone]}
              />
            ))}
          </View>
        </View>

        <View style={styles.supplies}>
          <Text style={styles.suppliesTitle}>Siapkan dulu</Text>
          <Text style={styles.suppliesText}>{guide.materials.join(' · ')}</Text>
          <Text style={styles.suppliesTools}>Alat: {guide.tools.join(', ')}</Text>
        </View>

        {guide.safety_notes.length ? (
          <View style={styles.safetyNote}>
            <MaterialCommunityIcons name="shield-alert-outline" size={20} color={colors.forest} />
            <Text style={styles.safetyText}>{guide.safety_notes[0]}</Text>
          </View>
        ) : null}

        <View style={styles.stepsHeader}>
          <Text style={styles.stepsTitle}>Langkah kerja</Text>
          <Text style={styles.stepsCount}>{guide.steps.length} langkah</Text>
        </View>

        <View>
          {guide.steps.map((step, index) => (
            <GuideStepRow
              key={step.id}
              step={step}
              index={index}
              last={index === guide.steps.length - 1}
              completed={activeProject.completedStepIds.includes(step.id)}
              saving={savingStepId === step.id}
              onToggle={() => void toggleStep(step.id)}
            />
          ))}
        </View>

        {allComplete ? (
          <View style={styles.doneMessage}>
            <MaterialCommunityIcons name="check-circle-outline" size={23} color={colors.forest} />
            <Text style={styles.doneText}>Semua langkah ditandai selesai di perangkat ini.</Text>
          </View>
        ) : null}

        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backToIdeas}>
          <Text style={styles.backToIdeasText}>Kembali ke detail ide</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function GuideStepRow({
  step,
  index,
  last,
  completed,
  saving,
  onToggle,
}: {
  step: GuideStep;
  index: number;
  last: boolean;
  completed: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  const icon = stepIcons[index % stepIcons.length];
  const illustrationStatus: IllustrationStatus = 'ready';

  return (
    <View style={[styles.step, last && styles.lastStep]}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, completed && styles.stepNumberDone]}>
          <Text style={[styles.stepNumberText, completed && styles.stepNumberTextDone]}>
            {String(step.order).padStart(2, '0')}
          </Text>
        </View>
        <Text style={[styles.stepTitle, completed && styles.stepTitleDone]}>{step.title}</Text>
      </View>
      <Text style={styles.instruction}>{step.instruction}</Text>

      <IllustrationPanel status={illustrationStatus} icon={icon} />

      <View style={styles.expected}>
        <Text style={styles.expectedLabel}>Hasil yang diharapkan</Text>
        <Text style={styles.expectedText}>{step.expected_result}</Text>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled: saving }}
        disabled={saving}
        onPress={onToggle}
        style={styles.stepCheck}
      >
        <MaterialCommunityIcons
          name={completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
          size={23}
          color={completed ? colors.forest : colors.muted}
        />
        <Text style={[styles.checkText, completed && styles.checkTextDone]}>
          {completed ? 'Langkah selesai' : 'Tandai selesai'}
        </Text>
      </Pressable>
    </View>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.empty}><Text style={styles.emptyBody}>Membuka panduan tersimpan</Text></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  content: { paddingBottom: 36, paddingHorizontal: spacing.lg, paddingTop: 12 },
  title: { color: colors.ink, fontFamily: fontFamily.displayBold, fontSize: 29, lineHeight: 36, marginTop: 23 },
  intro: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21, marginTop: 7 },
  progress: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 20,
    padding: 14,
  },
  progressCopy: { flex: 1, gap: 3 },
  progressTitle: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: 13 },
  progressCount: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 12 },
  progressMarks: { flexDirection: 'row', gap: 4 },
  progressMark: { backgroundColor: '#D9E0DA', borderRadius: 4, height: 8, width: 13 },
  progressMarkDone: { backgroundColor: colors.lime },
  supplies: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 17, paddingTop: 22 },
  suppliesTitle: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: 14 },
  suppliesText: { color: colors.ink, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  suppliesTools: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 18, marginTop: 5 },
  safetyNote: { alignItems: 'flex-start', backgroundColor: colors.mint, borderRadius: radii.md, flexDirection: 'row', gap: 10, marginTop: 16, padding: 13 },
  safetyText: { color: colors.ink, flex: 1, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 18 },
  stepsHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, marginTop: 27 },
  stepsTitle: { color: colors.ink, fontFamily: fontFamily.display, fontSize: 21 },
  stepsCount: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 12 },
  step: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 23, paddingTop: 20 },
  lastStep: { borderBottomWidth: 0 },
  stepHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  stepNumber: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 13, height: 38, justifyContent: 'center', width: 38 },
  stepNumberDone: { backgroundColor: colors.lime },
  stepNumberText: { color: colors.forest, fontFamily: fontFamily.display, fontSize: 14 },
  stepNumberTextDone: { color: colors.forest },
  stepTitle: { color: colors.ink, flex: 1, fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  stepTitleDone: { color: colors.forest },
  instruction: { color: colors.ink, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 22, marginBottom: 13, marginTop: 10 },
  expected: { borderLeftColor: colors.lime, borderLeftWidth: 3, marginTop: 13, paddingLeft: 11 },
  expectedLabel: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 11 },
  expectedText: { color: colors.ink, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 18, marginTop: 3 },
  stepCheck: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 15, minHeight: 34 },
  checkText: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 13 },
  checkTextDone: { color: colors.forest, fontFamily: fontFamily.semibold },
  doneMessage: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: radii.md, flexDirection: 'row', gap: 10, marginTop: 8, padding: 14 },
  doneText: { color: colors.forest, flex: 1, fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 19 },
  backToIdeas: { alignItems: 'center', minHeight: 50, justifyContent: 'center', marginTop: 7 },
  backToIdeasText: { color: colors.forest, fontFamily: fontFamily.semibold, fontSize: 14 },
  empty: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontFamily: fontFamily.display, fontSize: 22 },
  emptyBody: { color: colors.muted, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  homeButton: { backgroundColor: colors.forest, borderRadius: radii.md, marginTop: 7, paddingHorizontal: 18, paddingVertical: 14 },
  homeButtonText: { color: colors.white, fontFamily: fontFamily.semibold, fontSize: 14 },
});
