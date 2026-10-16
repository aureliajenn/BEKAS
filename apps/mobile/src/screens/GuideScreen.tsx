import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, OfflineBanner, Pill, SafetyNote } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { GuideCompletion } from '@/components/GuideCompletion';
import { GuidePreparation } from '@/components/GuidePreparation';
import { StageStatus } from '@/components/StageStatus';
import { StepCard } from '@/components/StepCard';
import { retryJob } from '@/lib/api';
import { pencilAssetsForStep, pencilIdeaId } from '@/lib/fixtures';
import { useGuideProgress } from '@/lib/useGuideProgress';
import { useProject } from '@/lib/useProject';
import { extraCopy } from '@/theme/statusCopy';
import { colors, space, type } from '@/theme/tokens';

export default function GuideScreen() {
  const { id, stepId } = useLocalSearchParams<{ id: string; stepId?: string }>();
  const q = useProject(id);
  const qc = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const retry = useMutation({
    mutationFn: (jobId: string) => retryJob(id, jobId),
    onSettled: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });
  const progress = useGuideProgress(id);
  const { done } = progress;

  const p = q.data;
  const guide = p?.guide?.result;
  const steps = guide?.steps ?? [];
  const allDone = steps.length > 0 && steps.every((s) => done.includes(s.id));
  const isPencil = p?.is_fixture && guide?.idea_id === pencilIdeaId;
  const pages = guide ? [
    { id: 'preparation', title: 'Siapkan barang, alat, dan bahan', step: undefined },
    ...steps.map((step) => ({ id: step.id, title: step.title, step })),
  ] : [];
  const currentIndex = pages.findIndex((page) => page.id === stepId);
  const current = pages[currentIndex];
  const visualAssets = isPencil ? pencilAssetsForStep(current?.step?.id) : undefined;
  const illustration = current ? p?.illustrations[current.id] : undefined;
  const firstUnfinished = steps.find((step) => !done.includes(step.id))?.id ?? 'preparation';
  const resumeTarget = allDone ? 'complete' : done.length ? firstUnfinished : 'preparation';
  const progressLabel = current
    ? `Proses ${currentIndex + 1} dari ${pages.length}`
    : `${steps.filter((step) => done.includes(step.id)).length} dari ${steps.length} langkah dicentang`;
  const nextLabel = currentIndex === pages.length - 1 ? 'Selesaikan panduan' : currentIndex === 0 ? 'Mulai proses' : 'Berikutnya';
  const navigate = (target: string) => router.replace({ pathname: '/project/[id]/guide/step/[stepId]', params: { id, stepId: target } });

  // Entry route resumes the first unfinished process; each process has its own URL.
  if (guide && !progress.loading && !progress.loadError && (!stepId || (!current && stepId !== 'complete'))) {
    return <Redirect href={{ pathname: '/project/[id]/guide/step/[stepId]', params: { id, stepId: resumeTarget } }} />;
  }

  const toggle = (target: string) => {
    void progress.save(done.includes(target) ? done.filter((item) => item !== target) : [...done, target]);
  };
  const nextPage = async () => {
    if (!current) return;
    if (current.step && !done.includes(current.id) && !await progress.save([...done, current.id])) return;
    navigate(pages[currentIndex + 1]?.id ?? 'complete');
  };

  return (
    <View style={styles.screen}>
      <GreenHeader title={guide?.title ?? 'Panduan'} onBack={() => {
        if (currentIndex > 0) navigate(pages[currentIndex - 1].id);
        else if (stepId === 'complete' && pages.length) navigate(pages[pages.length - 1].id);
        else router.replace({ pathname: '/project/[id]', params: { id } });
      }}>
        {guide ? (
          <View style={styles.pills}>
            <Pill label={progressLabel} tone="easy" />
            {p?.is_fixture ? <Pill label={extraCopy.cachedSample} tone="cached" /> : null}
          </View>
        ) : null}
      </GreenHeader>

      <ScrollView key={stepId ?? 'loading'} contentContainerStyle={[styles.scroll, { paddingBottom: (current ? 0 : bottom) + space.xxl }]}>
        {q.isError ? <OfflineBanner /> : null}
        {progress.saveError ? <SafetyNote text="Kemajuan belum tersimpan. Coba tekan tombol sekali lagi." /> : null}

        {progress.loadError ? (
          <Card style={{ gap: space.md }}>
            <Text style={type.body}>Kemajuan belum bisa dibaca.</Text>
            <ChunkyButton label={extraCopy.retry} onPress={() => { void progress.reload(); }} />
          </Card>
        ) : progress.loading ? <ActivityIndicator color={colors.green500} /> : !guide ? (
          <StageStatus
            items={[
              {
                kind: 'guide',
                status: p?.guide?.job.status ?? 'queued',
                onRetry: p?.guide ? () => retry.mutate(p.guide!.job.id) : undefined,
              },
            ]}
          />
        ) : current ? (
          <>
            {!current.step ? <Text accessibilityRole="header" style={type.h2}>{current.title}</Text> : null}
            {!current.step ? (
              <GuidePreparation guide={guide} assets={visualAssets} />
            ) : (
              <StepCard
                key={current.id}
                step={current.step}
                processVisual={visualAssets}
                illustrationStatus={illustration?.job.status ?? 'queued'}
                illustrationUrl={illustration?.url}
                onRetryIllustration={illustration && illustration.job.error?.retryable !== false ? () => retry.mutate(illustration.job.id) : undefined}
                checked={done.includes(current.id)}
                onToggle={() => toggle(current.id)}
                disabled={progress.saving}
              />
            )}
            {guide.safety_notes.map((note) => <SafetyNote key={note} text={note} />)}
          </>
        ) : stepId === 'complete' && allDone && p ? (
          <GuideCompletion project={p} guide={guide} />
        ) : stepId === 'complete' ? (
          <Card style={{ gap: space.md }}>
            <Text style={type.h3}>Selesaikan langkah panduan dulu</Text>
            <ChunkyButton label="Lanjutkan proses" onPress={() => navigate(firstUnfinished)} />
          </Card>
        ) : null}
      </ScrollView>
      {current ? (
        <View style={[styles.footer, { paddingBottom: bottom + space.md }]}>
          {currentIndex > 0 ? <ChunkyButton label="Sebelumnya" variant="secondary" onPress={() => navigate(pages[currentIndex - 1].id)} /> : null}
          <ChunkyButton
            label={nextLabel}
            disabled={progress.loading || progress.loadError || progress.saving}
            onPress={nextPage}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  footer: { paddingHorizontal: space.screen, paddingTop: space.sm, gap: space.sm, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.lg },
});
