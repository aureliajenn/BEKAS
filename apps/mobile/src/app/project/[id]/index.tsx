import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, Camera } from 'lucide-react-native';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, OfflineBanner, Pill } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { PlainHeader } from '@/components/GreenHeader';
import { IdeaCard } from '@/components/IdeaCard';
import { MeshViewerFrame } from '@/components/MeshViewerFrame';
import { StageStatus } from '@/components/StageStatus';
import { retryJob } from '@/lib/api';
import { clearActiveProject } from '@/lib/storage';
import { useProject } from '@/lib/useProject';
import { mascot } from '@/theme/assets';
import { extraCopy } from '@/theme/statusCopy';
import { colors, radius, space, type } from '@/theme/tokens';

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useProject(id);
  const qc = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const retry = useMutation({
    mutationFn: (jobId: string) => retryJob(id, jobId),
    onSettled: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });
  const p = q.data;
  const result = p?.ideas.result;
  const profile = result?.object_profile;
  const badPhoto = result?.input_status === 'needs_new_photo';

  const newPhoto = async () => {
    await clearActiveProject();
    router.dismissTo('/');
  };

  return (
    <View style={styles.screen}>
      <PlainHeader title={profile?.label ?? 'Hasil barang'} onBack={() => router.dismissTo('/')} />
      {!p ? (
        <View style={styles.center}>
          {q.isError ? <OfflineBanner /> : <ActivityIndicator color={colors.green500} size="large" />}
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
            {q.isError ? <OfflineBanner /> : null}
            {p.is_fixture ? <Pill label={extraCopy.cachedSample} tone="cached" /> : null}

            {badPhoto ? (
              <Card style={styles.bad}>
                <Image source={mascot.bingung} style={styles.badMascot} resizeMode="contain" accessible={false} />
                <Text style={[type.h3, { textAlign: 'center' }]}>{extraCopy.needsNewPhoto}</Text>
                {result?.explanation ? <Text style={[type.body, { textAlign: 'center', color: colors.muted }]}>{result.explanation}</Text> : null}
                <ChunkyButton
                  label="Ambil foto baru"
                  variant="cta"
                  icon={<Camera size={22} color={colors.white} strokeWidth={2.5} />}
                  onPress={newPhoto}
                  style={{ alignSelf: 'stretch' }}
                />
              </Card>
            ) : (
              <>
                <MeshViewerFrame
                  status={p.mesh.job.status}
                  meshUrl={p.mesh.url}
                  photoUrl={p.input_url}
                  labelOverride={
                    p.mesh.worker_state === 'unavailable'
                      ? extraCopy.meshWorkerUnavailable
                      : p.mesh.worker_state === 'preparing'
                        ? extraCopy.meshWorkerPreparing
                        : undefined
                  }
                  onRetry={p.mesh.job.error?.retryable ? () => retry.mutate(p.mesh.job.id) : undefined}
                />

                {profile ? (
                  <View style={{ gap: space.md }}>
                    <Text style={type.h3}>Profil barang</Text>
                    <Card style={{ gap: space.sm }}>
                      <Text style={type.bodyL}>{profile.label}</Text>
                      <Text style={type.body}>Terlihat: {profile.visible_parts.join(', ')}</Text>
                      <Text style={type.body}>Material: {profile.material_guess}</Text>
                      {profile.uncertainties.length ? (
                        <View style={styles.info}>
                          {profile.uncertainties.map((u) => (
                            <Text key={u} style={[type.body, { color: colors.blue600 }]}>
                              • {u}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </Card>
                  </View>
                ) : null}

                <View style={{ gap: space.md }}>
                  <Text style={type.h3}>3 ide untukmu</Text>
                  {result ? (
                    result.ideas.map((idea, i) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        index={i}
                        selected={p.selected_idea_id === idea.id}
                        onPress={() => router.push({ pathname: '/project/[id]/idea/[ideaId]', params: { id, ideaId: idea.id } })}
                      />
                    ))
                  ) : (
                    <>
                      <StageStatus
                        items={[
                          {
                            kind: 'ideas',
                            status: p.ideas.job.status,
                            onRetry: p.ideas.job.error?.retryable !== false ? () => retry.mutate(p.ideas.job.id) : undefined,
                          },
                        ]}
                      />
                      {p.ideas.job.status !== 'failed' ? [0, 1, 2].map((i) => <SkeletonIdea key={i} />) : null}
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {p.guide ? (
            <View style={[styles.footer, { paddingBottom: bottom + space.md }]}>
              <ChunkyButton
                label="Lanjutkan panduan"
                icon={<BookOpen size={22} color={colors.white} strokeWidth={2.5} />}
                onPress={() => router.push({ pathname: '/project/[id]/guide', params: { id } })}
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function SkeletonIdea() {
  return (
    <Card style={styles.skel} >
      <View style={styles.skelTile} />
      <View style={{ flex: 1, gap: space.sm }}>
        <View style={[styles.skelLine, { width: '70%' }]} />
        <View style={[styles.skelLine, { width: '45%' }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.screen },
  scroll: { padding: space.screen, gap: space.xl },
  bad: { alignItems: 'center', gap: space.md },
  badMascot: { width: 120, height: 150 },
  info: { backgroundColor: colors.blue50, borderRadius: radius.iconButton, padding: space.md, gap: space.xs },
  skel: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  skelTile: { width: 72, height: 72, borderRadius: radius.tile, backgroundColor: colors.green50 },
  skelLine: { height: 14, borderRadius: radius.pill, backgroundColor: colors.line },
  footer: { paddingHorizontal: space.screen, paddingTop: space.sm, backgroundColor: colors.bg },
});
