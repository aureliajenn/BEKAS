import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, OfflineBanner, Pill, SafetyNote } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { MascotBubble } from '@/components/MascotBubble';
import { StageStatus } from '@/components/StageStatus';
import { StepCard } from '@/components/StepCard';
import { ProcessVisual } from '@/components/ProcessVisual';
import { VerifyPanel } from '@/components/VerifyPanel';
import { retryJob } from '@/lib/api';
import { clearActiveProject, getDoneSteps, setDoneSteps } from '@/lib/storage';
import { useProject } from '@/lib/useProject';
import { mascot, pencilProcessAssets } from '@/theme/assets';
import pencilDemo from '../../../../assets/demo/tempat-pensil/content.json';
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
  const [done, setDone] = useState<string[]>([]);
  const [openKit, setOpenKit] = useState(true);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let active = true;
    setProgressLoaded(false);
    getDoneSteps(id).then((saved) => {
      if (active) { setDone(saved); setProgressLoaded(true); }
    });
    return () => { active = false; };
  }, [id]);

  const p = q.data;
  const guide = p?.guide?.result;
  const steps = guide?.steps ?? [];
  const allDone = steps.length > 0 && steps.every((s) => done.includes(s.id));
  const isPencil = p?.is_fixture && guide?.idea_id === pencilDemo.idea.id;
  const pages = guide ? [
    { id: 'preparation', title: 'Siapkan barang, alat, dan bahan', step: undefined },
    ...steps.map((step) => ({ id: step.id, title: step.title, step })),
  ] : [];
  const currentIndex = pages.findIndex((page) => page.id === stepId);
  const current = pages[currentIndex];
  const meshState = isPencil ? pencilDemo.mesh_states.find((mesh) => mesh.after_step_id === (current?.step?.id ?? null)) : undefined;
  const visualAssets = meshState ? pencilProcessAssets[meshState.id] : undefined;
  const navigate = (target: string) => router.replace({ pathname: '/project/[id]/guide/step/[stepId]', params: { id, stepId: target } });

  // Entry route resumes the first unfinished process; each process has its own URL.
  if (guide && progressLoaded && (!stepId || (!current && stepId !== 'complete'))) {
    const target = allDone ? 'complete' : done.length ? steps.find((step) => !done.includes(step.id))?.id ?? 'preparation' : 'preparation';
    return <Redirect href={{ pathname: '/project/[id]/guide/step/[stepId]', params: { id, stepId: target } }} />;
  }

  const saveProgress = async (next: string[]) => {
    setSaving(true);
    setSaveError(false);
    try {
      await setDoneSteps(id, next);
      setDone(next);
      return true;
    } catch {
      setSaveError(true);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const toggle = (target: string) => {
    if (!saving && progressLoaded) void saveProgress(done.includes(target) ? done.filter((item) => item !== target) : [...done, target]);
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
            <Pill label={current ? `Proses ${currentIndex + 1} dari ${pages.length}` : `${steps.filter((s) => done.includes(s.id)).length} dari ${steps.length} langkah dicentang`} tone="easy" />
            {p?.is_fixture ? <Pill label={extraCopy.cachedSample} tone="cached" /> : null}
          </View>
        ) : null}
      </GreenHeader>

      <ScrollView key={stepId ?? 'loading'} contentContainerStyle={[styles.scroll, { paddingBottom: (current ? 0 : bottom) + space.xxl }]}>
        {q.isError ? <OfflineBanner /> : null}
        {saveError ? <SafetyNote text="Kemajuan belum tersimpan. Coba tekan tombol sekali lagi." /> : null}

        {!progressLoaded ? <ActivityIndicator color={colors.green500} /> : !guide ? (
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
            <Text accessibilityRole="header" style={type.h2}>{current.title}</Text>
            {!current.step ? <>
            <ProcessVisual title={current.title} illustrationAsset={visualAssets?.illustration} modelAsset={visualAssets?.model}
              illustrationPlaceholder="Ilustrasi persiapan belum tersedia." />
            <Text style={type.body}>{isPencil ? 'Siapkan botol plastik utuh sebagai bahan awal. Periksa alat dan bahan berikut sebelum mulai membentuk wadah.' : 'Siapkan barang bekas serta semua alat dan bahan berikut. Baca catatan keamanan sebelum mulai.'}</Text>
            <Card style={{ gap: space.sm }}>
              <Pressable
                onPress={() => setOpenKit(!openKit)}
                accessibilityRole="button"
                accessibilityState={{ expanded: openKit }}
                style={styles.kitHead}
              >
                <Text style={[type.h3, { flex: 1 }]}>Alat dan bahan</Text>
                {openKit ? <ChevronUp size={22} color={colors.green700} strokeWidth={2.5} /> : <ChevronDown size={22} color={colors.green700} strokeWidth={2.5} />}
              </Pressable>
              {openKit ? (
                <>
                  <Text style={type.body}>Bahan: {guide.materials.join(', ')}</Text>
                  <Text style={type.body}>Alat: {guide.tools.join(', ')}</Text>
                </>
              ) : null}
            </Card>
            {guide.safety_notes.map((n) => (
              <SafetyNote key={n} text={n} />
            ))}
            <MascotBubble pose="tunjukHp" text="Baca instruksi tiap proses. Kamu bisa menukar tampilan ilustrasi 2D dan model 3D lewat tombol." />
            </> : <>
                <StepCard
                  key={current.id}
                  step={current.step}
                  processVisual={visualAssets ?? {}}
                  illustrationStatus={p?.illustrations[current.id]?.job.status ?? 'queued'}
                  illustrationUrl={p?.illustrations[current.id]?.url}
                  illustrationPlaceholder={p?.illustration_placeholder}
                  onRetryIllustration={p?.illustrations[current.id]?.job.error?.retryable !== false && p?.illustrations[current.id] ? () => retry.mutate(p.illustrations[current.id].job.id) : undefined}
                  checked={done.includes(current.id)}
                  onToggle={() => toggle(current.id)}
                />
                {guide.safety_notes.map((note) => <SafetyNote key={note} text={note} />)}
            </>}
          </>
        ) : stepId === 'complete' && allDone ? (
              <Card style={styles.done}>
                <Image source={mascot.senang} style={styles.doneMascot} resizeMode="contain" accessible={false} />
                <Text style={[type.h2, { textAlign: 'center' }]}>Kerajinanmu jadi!</Text>
                <Text style={[type.body, { textAlign: 'center', color: colors.muted }]}>
                  Semua {steps.length} langkah {guide.title.toLowerCase()} sudah kamu centang.
                </Text>
                {p ? <VerifyPanel project={p} /> : null}
                <ChunkyButton
                  label="Foto barang lain"
                  variant="secondary"
                  icon={<Camera size={22} color={colors.green700} strokeWidth={2.5} />}
                  onPress={async () => {
                    await clearActiveProject();
                    router.dismissTo('/');
                  }}
                  style={{ alignSelf: 'stretch' }}
                />
              </Card>
        ) : stepId === 'complete' ? <Card style={{ gap: space.md }}>
          <Text style={type.h3}>Selesaikan langkah panduan dulu</Text>
          <ChunkyButton label="Lanjutkan proses" onPress={() => navigate(steps.find((step) => !done.includes(step.id))?.id ?? 'preparation')} />
        </Card> : null}
      </ScrollView>
      {current ? <View style={[styles.footer, { paddingBottom: bottom + space.md }]}>
        {currentIndex > 0 ? <ChunkyButton label="Sebelumnya" variant="secondary" onPress={() => navigate(pages[currentIndex - 1].id)} /> : null}
        <ChunkyButton label={currentIndex === pages.length - 1 ? 'Selesaikan panduan' : currentIndex === 0 ? 'Mulai proses' : 'Berikutnya'}
           disabled={!progressLoaded || saving}
           onPress={async () => {
             if (current.step && !done.includes(current.id)) {
              if (!await saveProgress([...done, current.id])) return;
            }
            navigate(pages[currentIndex + 1]?.id ?? 'complete');
          }} />
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  footer: { paddingHorizontal: space.screen, paddingTop: space.sm, gap: space.sm, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.lg },
  kitHead: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  done: { alignItems: 'center', gap: space.md },
  doneMascot: { width: 140, height: 170 },
});
