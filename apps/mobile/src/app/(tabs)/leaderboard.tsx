import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, OfflineBanner, Pill, ProgressBar } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { fetchLeaderboard, getParticipant } from '@/lib/rewards';
import { extraCopy } from '@/theme/statusCopy';
import { colors, radius, space, type } from '@/theme/tokens';

const monthName = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

export default function LeaderboardScreen() {
  const { bottom } = useSafeAreaInsets();
  const board = useQuery({ queryKey: ['leaderboard'], queryFn: fetchLeaderboard });
  const participant = useQuery({ queryKey: ['participant'], queryFn: getParticipant });

  const b = board.data;
  const myRwId = participant.data?.rwId;
  const mine = b?.rows.find((r) => r.rw_id === myRwId);

  return (
    <View style={styles.screen}>
      <GreenHeader title="Leaderboard RW" eyebrow={b ? monthName(b.month) : undefined} pose="senang">
        {b?.is_fixture ? (
          <View style={{ marginTop: space.sm }}>
            <Pill label={extraCopy.cachedSample} tone="cached" />
          </View>
        ) : null}
      </GreenHeader>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
        {board.isError ? <OfflineBanner /> : null}
        {!b ? <ActivityIndicator color={colors.green500} /> : null}

        {participant.data && !myRwId ? (
          <Card style={{ gap: space.md }}>
            <Text style={type.h3}>Pilih RW kamu</Text>
            <Text style={type.body}>Barang yang kamu olah ikut dihitung untuk RW-mu. Peringkat dihitung per RW, bukan per orang.</Text>
            <ChunkyButton label="Pilih RW" icon={<Users size={22} color={colors.white} strokeWidth={2.5} />} onPress={() => router.push('/rw')} />
          </Card>
        ) : null}

        {b ? (
          <Card style={{ gap: space.sm }}>
            <Text style={type.overline}>Tantangan bulan ini</Text>
            <Text style={type.h3}>{b.challenge.title}</Text>
            <Text style={type.body}>
              Hadiah bersama: {b.challenge.reward} dari {b.challenge.sponsor}.
            </Text>
            {mine ? (
              <>
                <ProgressBar value={mine.items} max={b.challenge.target_items} label={`Progres ${mine.name} ${mine.kelurahan}`} />
                <Text style={type.caption}>
                  {mine.name} {mine.kelurahan}: {mine.items} dari {b.challenge.target_items} barang diolah.
                </Text>
              </>
            ) : null}
          </Card>
        ) : null}

        {b?.rows.map((row) => (
          <Card key={row.rw_id} selected={row.rw_id === myRwId} style={styles.row}>
            <View style={[styles.rank, row.rank === 1 && { backgroundColor: colors.green500 }]}>
              <Text style={[type.button, { color: row.rank === 1 ? colors.white : colors.green700 }]}>{row.rank}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.h3}>
                {row.name} {row.kelurahan}
              </Text>
              <Text style={type.caption}>Kapten: {row.captain_name}</Text>
              {row.rw_id === myRwId ? <Pill label="RW kamu" tone="easy" /> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[type.h2, { color: colors.green700 }]}>{row.items}</Text>
              <Text style={type.caption}>barang</Text>
            </View>
          </Card>
        ))}

        {myRwId ? <ChunkyButton label="Ganti RW" variant="secondary" onPress={() => router.push('/rw')} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rank: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.green100, alignItems: 'center', justifyContent: 'center' },
});
