import type { ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, Sparkles } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { ItemGrid } from '@/components/ItemGrid';
import { Clock, CoinStack, IdeaBulb, PlantPot } from '@/components/illustrations';
import { Card, OfflineBanner, SafetyNote } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { StageStatus } from '@/components/StageStatus';
import { ApiFailure, requestGuide, UPCYCLE_POINTS } from '@/lib/api';
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
      <GreenHeader title={idea.title} eyebrow="Ide kerajinan" onBack={goBack} pose="bawaBotol" mascotSize={130} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {q.isError ? <OfflineBanner /> : null}
        {/* Ringkasan angka penting: Fredoka besar + ilustrasi kecil. */}
        <View style={styles.stats}>
          <Stat bg={colors.tileBlue} art={<Clock size={36} />} value={`±${idea.estimated_minutes}`} label="menit" />
          <Stat bg={colors.tileGreen} art={<PlantPot size={36} />} value={idea.difficulty} label="kesulitan" />
          <Stat bg={colors.tileYellow} art={<CoinStack size={36} />} value={`+${UPCYCLE_POINTS}`} label="poin" />
        </View>

        <Card style={styles.purpose}>
          <View style={styles.purposeArt}>
            <IdeaBulb size={52} />
          </View>
          <View style={{ flex: 1, gap: space.xs }}>
            <Text style={type.h3}>Kegunaan</Text>
            <Text style={type.body}>{idea.purpose}</Text>
          </View>
        </Card>

        <Card style={{ gap: space.md }}>
          <Text style={type.h3}>Alat</Text>
          {idea.tools.length ? <ItemGrid items={idea.tools} /> : <Text style={type.caption}>Tidak perlu alat khusus.</Text>}
        </Card>
        <Card style={{ gap: space.md }}>
          <View>
            <Text style={type.h3}>Bahan tambahan</Text>
            <Text style={type.caption}>Selain barang yang kamu foto.</Text>
          </View>
          {idea.extra_materials.length ? <ItemGrid items={idea.extra_materials} offset={2} /> : <Text style={type.caption}>Tidak perlu bahan tambahan.</Text>}
        </Card>
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

function Stat({ bg, art, value, label }: { bg: string; art: ReactNode; value: string; label: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]} accessible accessibilityLabel={`${value} ${label}`}>
      {art}
      <Text style={[type.h3, { color: colors.ink }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.lg },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, borderRadius: radius.card, padding: space.md, alignItems: 'center', gap: 2 },
  purpose: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  purposeArt: { width: 64, height: 64, borderRadius: radius.tile, backgroundColor: colors.tileYellow, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  footer: { paddingHorizontal: space.screen, paddingTop: space.sm, gap: space.sm, backgroundColor: colors.bg },
});
