import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, Users } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, OfflineBanner } from '@/components/Card';
import { PlainHeader } from '@/components/GreenHeader';
import { StageStatus } from '@/components/StageStatus';
import { ApiFailure } from '@/lib/api';
import { chooseRw, fetchRws, getParticipant } from '@/lib/rewards';
import { colors, radius, space, type } from '@/theme/tokens';

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
      router.back();
    },
  });

  return (
    <View style={styles.screen}>
      <PlainHeader title="Pilih RW kamu" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
        <Text style={type.body}>Barang yang kamu olah ikut menambah angka RW-mu di leaderboard. Poin tetap masuk ke dompetmu sendiri.</Text>
        {rws.isError ? <OfflineBanner /> : null}
        {pick.isError ? (
          <StageStatus
            items={[{ kind: 'upload', status: 'failed', labelOverride: pick.error instanceof ApiFailure ? pick.error.detail.message : 'RW gagal disimpan' }]}
          />
        ) : null}
        {!rws.data ? <ActivityIndicator color={colors.green500} /> : null}
        {rws.data?.map((rw) => {
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
                <View style={styles.icon}>
                  <Users size={22} color={colors.green700} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>
                    {rw.name} {rw.kelurahan}
                  </Text>
                  <Text style={type.caption}>Kapten: {rw.captain_name}</Text>
                </View>
                {chosen ? <Check size={22} color={colors.green500} strokeWidth={2.5} /> : null}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 44, height: 44, borderRadius: radius.iconButton, backgroundColor: colors.green100, alignItems: 'center', justifyContent: 'center' },
});
