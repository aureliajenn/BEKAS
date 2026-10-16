import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { HouseGroup, Medal, TrophyCup } from '@/components/illustrations';
import type { LeaderboardRow } from '@/types/contracts';
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
            <View style={styles.row}>
              <View style={[styles.tile, { backgroundColor: colors.tileBlue }]}>
                <HouseGroup size={54} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.h3}>Pilih RW kamu</Text>
                <Text style={type.caption}>Barang yang kamu olah ikut dihitung untuk RW-mu. Peringkat per RW, bukan per orang.</Text>
              </View>
            </View>
            <ChunkyButton label="Pilih RW" icon={<Users size={22} color={colors.white} strokeWidth={2.5} />} onPress={() => router.push('/rw')} />
          </Card>
        ) : null}

        {b && b.rows.length >= 3 ? <Podium rows={b.rows.slice(0, 3)} myRwId={myRwId} /> : null}

        {b ? (
          <Card style={{ gap: space.sm, backgroundColor: colors.noteYellowBg, borderColor: colors.noteYellowBorder }}>
            <View style={styles.row}>
              <View style={[styles.tile, styles.tilt, { backgroundColor: colors.white }]}>
                <TrophyCup size={54} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.overline}>Tantangan bulan ini</Text>
                <Text style={type.h3}>{b.challenge.title}</Text>
                <Text style={type.caption}>
                  Hadiah bersama: {b.challenge.reward} dari {b.challenge.sponsor}.
                </Text>
              </View>
            </View>
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
          <Card
            key={row.rw_id}
            selected={row.rw_id === myRwId}
            style={[styles.row, row.rw_id === myRwId && { backgroundColor: colors.tilePink }]}
          >
            {row.rank <= 3 ? (
              <Medal rank={row.rank as 1 | 2 | 3} size={44} />
            ) : (
              <View style={styles.rank}>
                <Text style={[type.h3, { color: colors.muted }]}>{row.rank}</Text>
              </View>
            )}
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

// Podium 3 besar: urutan visual 2-1-3, tinggi berbeda, medali emas/perak/perunggu.
const podiumLook = {
  1: { h: 112, bg: colors.tileYellow, border: colors.noteYellowBorder },
  2: { h: 88, bg: colors.tileBlue, border: colors.line },
  3: { h: 72, bg: colors.tilePink, border: colors.line },
} as const;

function Podium({ rows, myRwId }: { rows: LeaderboardRow[]; myRwId?: string | null }) {
  const order = [rows[1], rows[0], rows[2]];
  return (
    <View style={styles.podium}>
      {order.map((row) => {
        const look = podiumLook[row.rank as 1 | 2 | 3];
        return (
          <View key={row.rw_id} style={styles.podiumCol} accessible accessibilityLabel={`Peringkat ${row.rank}: ${row.name} ${row.kelurahan}, ${row.items} barang`}>
            <Medal rank={row.rank as 1 | 2 | 3} size={row.rank === 1 ? 56 : 46} />
            <Text style={[type.bodyL, { textAlign: 'center' }]} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[type.caption, { textAlign: 'center' }]} numberOfLines={1}>
              {row.kelurahan}
            </Text>
            <View style={[styles.podiumBlock, { height: look.h, backgroundColor: look.bg, borderColor: row.rw_id === myRwId ? colors.green400 : look.border }]}>
              <Text style={[type.h2, { color: colors.ink }]}>{row.items}</Text>
              <Text style={type.caption}>barang</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rank: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  tile: { width: 68, height: 68, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  tilt: { transform: [{ rotate: '-4deg' }] },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingTop: space.sm },
  podiumCol: { flex: 1, alignItems: 'center', gap: space.xs },
  podiumBlock: { width: '100%', borderTopLeftRadius: radius.tile, borderTopRightRadius: radius.tile, alignItems: 'center', paddingTop: space.sm, borderWidth: 2 },
});
