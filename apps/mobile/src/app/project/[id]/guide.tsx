import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, OfflineBanner, Pill, SafetyNote } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { MascotBubble } from '@/components/MascotBubble';
import { StageStatus } from '@/components/StageStatus';
import { StepCard } from '@/components/StepCard';
import { retryJob } from '@/lib/api';
import { clearActiveProject, getDoneSteps, setDoneSteps } from '@/lib/storage';
import { useProject } from '@/lib/useProject';
import { mascot } from '@/theme/assets';
import { extraCopy } from '@/theme/statusCopy';
import { colors, space, type } from '@/theme/tokens';

export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useProject(id);
  const qc = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const retry = useMutation({
    mutationFn: (jobId: string) => retryJob(id, jobId),
    onSettled: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });
  const [done, setDone] = useState<string[]>([]);
  const [openKit, setOpenKit] = useState(true);

  useEffect(() => {
    getDoneSteps(id).then(setDone);
  }, [id]);

  const p = q.data;
  const guide = p?.guide?.result;
  const steps = guide?.steps ?? [];
  const allDone = steps.length > 0 && steps.every((s) => done.includes(s.id));

  const toggle = (stepId: string) => {
    setDone((prev) => {
      const next = prev.includes(stepId) ? prev.filter((d) => d !== stepId) : [...prev, stepId];
      setDoneSteps(id, next);
      return next;
    });
  };

  return (
    <View style={styles.screen}>
      <GreenHeader title={guide?.title ?? 'Panduan'} onBack={() => router.back()}>
        {guide ? (
          <View style={styles.pills}>
            <Pill label={`${done.length} dari ${steps.length} langkah dicentang`} tone="easy" />
            {p?.is_fixture ? <Pill label={extraCopy.cachedSample} tone="cached" /> : null}
          </View>
        ) : null}
      </GreenHeader>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
        {q.isError ? <OfflineBanner /> : null}

        {!guide ? (
          <StageStatus
            items={[
              {
                kind: 'guide',
                status: p?.guide?.job.status ?? 'queued',
                onRetry: p?.guide ? () => retry.mutate(p.guide!.job.id) : undefined,
              },
            ]}
          />
        ) : (
          <>
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

            {/* Satu maskot per layar: tips di awal, maskot senang setelah semua dicentang. */}
            {!allDone ? <MascotBubble pose="tunjukHp" text="Ikuti teksnya dulu. Gambar tiap langkah menyusul satu per satu." /> : null}

            {steps.map((step) => {
              const ill = p?.illustrations[step.id];
              return (
                <StepCard
                  key={step.id}
                  step={step}
                  illustrationStatus={ill?.job.status ?? 'queued'}
                  illustrationUrl={ill?.url}
                  onRetryIllustration={ill ? () => retry.mutate(ill.job.id) : undefined}
                  checked={done.includes(step.id)}
                  onToggle={() => toggle(step.id)}
                />
              );
            })}

            {allDone ? (
              <Card style={styles.done}>
                <Image source={mascot.senang} style={styles.doneMascot} resizeMode="contain" accessible={false} />
                <Text style={[type.h2, { textAlign: 'center' }]}>Kerajinanmu jadi!</Text>
                <Text style={[type.body, { textAlign: 'center', color: colors.muted }]}>
                  Semua {steps.length} langkah {guide.title.toLowerCase()} sudah kamu centang.
                </Text>
                <ChunkyButton
                  label="Foto barang lain"
                  variant="cta"
                  icon={<Camera size={22} color={colors.white} strokeWidth={2.5} />}
                  onPress={async () => {
                    await clearActiveProject();
                    router.dismissTo('/');
                  }}
                  style={{ alignSelf: 'stretch' }}
                />
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm },
  scroll: { padding: space.screen, gap: space.lg },
  kitHead: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  done: { alignItems: 'center', gap: space.md },
  doneMascot: { width: 140, height: 170 },
});
