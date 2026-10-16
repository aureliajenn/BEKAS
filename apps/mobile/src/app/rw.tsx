import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { Card, IlluTile, OfflineBanner } from '@/components/Card';
import { PlainHeader } from '@/components/GreenHeader';
import { StageStatus } from '@/components/StageStatus';
import { CheckBadge, HouseGroup, TrophyCup } from '@/components/illustrations';
import { ApiFailure } from '@/lib/api';
import { chooseRw, fetchRws, getParticipant } from '@/lib/rewards';
import { colors, radius, space, type } from '@/theme/tokens';

const tiles = [colors.tileGreen, colors.tilePink, colors.tileYellow, colors.tileBlue];

export default function RwScreen() {
  const qc = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const rws = useQuery({ queryKey: ['rws'], queryFn: fetchRws });
  const participant = useQuery({ queryKey: ['participant'], queryFn: getParticipant });

  const pick = useMutation({
    mutationFn: chooseRw,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['participant'] });
      await qc.invalidateQueries({ queryKey: ['leaderboard'] });
      goBack();
    },
  });

  return (
    <View style={styles.screen}>
      <PlainHeader title="Pilih RW kamu" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
        <View style={styles.banner}>
          <View style={{ flex: 1, gap: space.xs }}>
            <Text style={type.h2}>Ikut tim RW-mu</Text>
            <Text style={type.body}>Barang yang kamu olah menambah angka RW-mu di peringkat. Poin tetap masuk ke dompetmu sendiri.</Text>
          </View>
          <View style={styles.bannerArt}>
            <HouseGroup size={92} />
          </View>
        </View>
        {rws.isError ? <OfflineBanner /> : null}
        {pick.isError ? (
          <StageStatus
            items={[{ kind: 'upload', status: 'failed', labelOverride: pick.error instanceof ApiFailure ? pick.error.detail.message : 'RW gagal disimpan' }]}
          />
        ) : null}
        {!rws.data ? <ActivityIndicator color={colors.green500} /> : null}
        {rws.data?.map((rw, i) => {
          const chosen = participant.data?.rwId === rw.rw_id;
          return (
            <Pressable
              key={rw.rw_id}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen, disabled: pick.isPending }}
              accessibilityLabel={`${rw.name} ${rw.kelurahan}`}
              disabled={pick.isPending}
              onPress={() => pick.mutate(rw.rw_id)}
            >
              <Card selected={chosen} style={styles.row}>
                <IlluTile bg={tiles[i % tiles.length]} size={60} tilt={i % 2 ? 4 : -4}>
                  <HouseGroup size={48} />
                </IlluTile>
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>
                    {rw.name} {rw.kelurahan}
                  </Text>
                  <Text style={type.caption}>Kapten: {rw.captain_name}</Text>
                </View>
                {chosen ? <CheckBadge size={38} /> : null}
              </Card>
            </Pressable>
          );
        })}

        {rws.data ? (
          <View style={styles.note}>
            <TrophyCup size={52} />
            <Text style={[type.body, { flex: 1, color: colors.blue600 }]}>
              Peringkat dihitung per RW dari jumlah proyek terverifikasi bulan ini, bukan per orang.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.tileBlue, borderRadius: radius.card, padding: space.lg, marginBottom: space.sm },
  bannerArt: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.blue50, borderRadius: radius.card, padding: space.lg, marginTop: space.sm },
});
