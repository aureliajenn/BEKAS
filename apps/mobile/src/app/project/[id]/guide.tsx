import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { Card, OfflineBanner, Pill, SafetyNote } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { MascotBubble } from '@/components/MascotBubble';
import { StageStatus } from '@/components/StageStatus';
import { StepCard } from '@/components/StepCard';
import { VerifyPanel } from '@/components/VerifyPanel';
import { ItemGrid } from '@/components/ItemGrid';
import { Scissors } from '@/components/illustrations';
import { Confetti, DecorCircle } from '@/components/shapes';
import { retryJob } from '@/lib/api';
import { clearActiveProject, getDoneSteps, setDoneSteps } from '@/lib/storage';
import { useProject } from '@/lib/useProject';
import { mascot } from '@/theme/assets';
import { extraCopy } from '@/theme/statusCopy';
import { colors, radius, space, type } from '@/theme/tokens';

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
      <GreenHeader title={guide?.title ?? 'Panduan'} onBack={goBack}>
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
                <Scissors size={34} />
                <Text style={[type.h3, { flex: 1 }]}>Alat dan bahan</Text>
                {openKit ? <ChevronUp size={22} color={colors.green700} strokeWidth={2.5} /> : <ChevronDown size={22} color={colors.green700} strokeWidth={2.5} />}
              </Pressable>
              {openKit ? (
                <View style={{ gap: space.md }}>
                  <Text style={type.overline}>Bahan</Text>
                  <ItemGrid items={guide.materials} offset={2} />
                  <Text style={type.overline}>Alat</Text>
                  <ItemGrid items={guide.tools} />
                </View>
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
              <View style={{ gap: space.lg }}>
                <View style={styles.celebrate} accessibilityRole="header">
                  <DecorCircle size={280} style={{ top: -110, right: -90 }} />
                  <DecorCircle size={170} style={{ bottom: -70, left: -60 }} />
                  <Confetti />
                  <Text style={[type.overline, { color: colors.white }]}>Proyek selesai</Text>
                  <Text style={[type.h1, styles.celebrateTitle]}>Kerajinanmu jadi!</Text>
                  <Image source={mascot.senang} style={styles.doneMascot} resizeMode="contain" accessible={false} />
                  <Text style={[type.body, styles.celebrateNote]}>
                    Semua {steps.length} langkah {guide.title.toLowerCase()} sudah kamu centang.
                  </Text>
                </View>
                {p ? <VerifyPanel project={p} /> : null}
                <ChunkyButton
                  label="Foto barang lain"
                  variant="secondary"
                  icon={<Camera size={22} color={colors.green700} strokeWidth={2.5} />}
                  onPress={async () => {
                    await clearActiveProject();
                    router.dismissTo('/');
                  }}
                />
              </View>
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
  kitHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  celebrate: { backgroundColor: colors.green500, borderRadius: radius.card, overflow: 'hidden', alignItems: 'center', padding: space.xxl, gap: space.sm },
  celebrateTitle: { color: colors.white, textAlign: 'center' },
  celebrateNote: { color: colors.white, textAlign: 'center' },
  doneMascot: { width: 190, height: 220 },
});
