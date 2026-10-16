import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, Sparkles } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { Card, difficultyTone, OfflineBanner, Pill, SafetyNote } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { StageStatus } from '@/components/StageStatus';
import { ApiFailure, requestGuide } from '@/lib/api';
import { useProject } from '@/lib/useProject';
import { colors, radius, space, type } from '@/theme/tokens';

export default function IdeaDetailScreen() {
  const { id, ideaId } = useLocalSearchParams<{ id: string; ideaId: string }>();
  const q = useProject(id);
  const qc = useQueryClient();
  const { bottom } = useSafeAreaInsets();

  const make = useMutation({
    mutationFn: () => requestGuide(id, ideaId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project', id] });
      router.replace({ pathname: '/project/[id]/guide', params: { id } });
    },
  });

  const p = q.data;
  const idea = p?.ideas.result?.ideas.find((i) => i.id === ideaId);
  if (!p || !idea) {
    return <View style={styles.screen}>{q.isError ? <OfflineBanner /> : null}</View>;
  }

  // Satu panduan per proyek (PRD §10).
  const otherChosen = !!p.selected_idea_id && p.selected_idea_id !== idea.id;
  const thisChosen = p.selected_idea_id === idea.id;

  return (
    <View style={styles.screen}>
      <GreenHeader title={idea.title} onBack={goBack} pose="bawaBotol">
        <View style={styles.pills}>
          <Pill label={idea.difficulty} tone={difficultyTone(idea.difficulty)} />
          <Pill label={`±${idea.estimated_minutes} menit`} />
        </View>
      </GreenHeader>

      <ScrollView contentContainerStyle={styles.scroll}>
        {q.isError ? <OfflineBanner /> : null}
        <Card style={{ gap: space.sm }}>
          <Text style={type.h3}>Kegunaan</Text>
          <Text style={type.body}>{idea.purpose}</Text>
        </Card>
        <BulletCard title="Alat" items={idea.tools} />
        <BulletCard title="Bahan tambahan" note="Selain barang yang kamu foto." items={idea.extra_materials} />
        {idea.safety_notes.map((n) => (
          <SafetyNote key={n} text={n} />
        ))}
        {make.isError ? (
          <StageStatus
            items={[{ kind: 'guide', status: 'failed', labelOverride: make.error instanceof ApiFailure ? make.error.detail.message : undefined, onRetry: () => make.mutate() }]}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + space.md }]}>
        {otherChosen ? <Text style={[type.caption, { textAlign: 'center' }]}>Panduan sudah dibuat untuk ide lain di proyek ini.</Text> : null}
        {thisChosen ? (
          <ChunkyButton
            label="Buka panduan"
            icon={<BookOpen size={22} color={colors.white} strokeWidth={2.5} />}
            onPress={() => router.push({ pathname: '/project/[id]/guide', params: { id } })}
          />
        ) : (
          <ChunkyButton
            label="Buat panduan"
            variant="cta"
            // Idempoten: terkunci setelah ditekan sampai request selesai.
            disabled={otherChosen || make.isSuccess}
            loading={make.isPending}
            icon={<Sparkles size={22} color={colors.white} strokeWidth={2.5} />}
            onPress={() => make.mutate()}
          />
        )}
      </View>
    </View>
  );
}

function BulletCard({ title, note, items }: { title: string; note?: string; items: string[] }) {
  return (
    <Card style={{ gap: space.sm }}>
      <Text style={type.h3}>{title}</Text>
      {note ? <Text style={type.caption}>{note}</Text> : null}
      {items.length ? (
        items.map((it) => (
          <View key={it} style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={[type.body, { flex: 1 }]}>{it}</Text>
          </View>
        ))
      ) : (
        <Text style={type.caption}>Tidak perlu.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm },
  scroll: { padding: space.screen, gap: space.lg },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bullet: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.green500 },
  footer: { paddingHorizontal: space.screen, paddingTop: space.sm, gap: space.sm, backgroundColor: colors.bg },
});
