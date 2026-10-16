import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Smartphone, Ticket, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, OfflineBanner, Pill, ProgressBar } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { Flame } from '@/components/shapes';
import { ApiFailure } from '@/lib/api';
import { fetchRewards, fetchWallet, newRedeemKey, redeem } from '@/lib/rewards';
import { extraCopy } from '@/theme/statusCopy';
import { colors, radius, space, type } from '@/theme/tokens';
import type { Reward } from '@/types/contracts';

const fmt = (n: number) => n.toLocaleString('id-ID');
const date = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const kindIcon = { pulsa: Smartphone, token_listrik: Zap, emas: Coins, voucher: Ticket };

export default function WalletScreen() {
  const qc = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: fetchWallet });
  const rewards = useQuery({ queryKey: ['rewards'], queryFn: fetchRewards });
  // Key dibuat saat sheet dibuka: tap ganda "Ya, tukar" memakai key yang sama.
  const [pending, setPending] = useState<{ reward: Reward; key: string } | null>(null);

  const tukar = useMutation({
    mutationFn: () => redeem(pending!.reward, pending!.key),
    onSuccess: async () => {
      setPending(null);
      await Promise.all([qc.invalidateQueries({ queryKey: ['wallet'] }), qc.invalidateQueries({ queryKey: ['rewards'] })]);
    },
  });

  const w = wallet.data;
  const list = rewards.data ?? [];
  // Target terdekat yang belum terjangkau; kalau semua terjangkau, hadiah termahal yang masih ada stok.
  const inStock = list.filter((r) => r.stock > 0).sort((a, b) => a.price_points - b.price_points);
  const target = w ? (inStock.find((r) => r.price_points > w.balance) ?? inStock.at(-1)) : undefined;

  return (
    <View style={styles.screen}>
      <GreenHeader title="Dompet Poin">
        {w ? (
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Text style={[type.display, { color: colors.white }]} accessibilityLabel={`Saldo ${fmt(w.balance)} poin`}>
              {fmt(w.balance)} poin
            </Text>
            <View style={styles.pills}>
              <Pill label={extraCopy.pointValue} tone="easy" />
              {w.is_fixture ? <Pill label={extraCopy.cachedSample} tone="cached" /> : null}
            </View>
          </View>
        ) : null}
      </GreenHeader>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
        {wallet.isError || rewards.isError ? <OfflineBanner /> : null}
        {!w ? <ActivityIndicator color={colors.green500} /> : null}

        {w && target ? (
          <Card style={{ gap: space.sm }}>
            <Text style={type.overline}>Target berikutnya</Text>
            <Text style={type.h3}>{target.name}</Text>
            <ProgressBar value={w.balance} max={target.price_points} label={`Progres ke ${target.name}`} />
            <Text style={type.caption}>
              {w.balance >= target.price_points
                ? 'Poinmu sudah cukup untuk hadiah ini.'
                : `${fmt(w.balance)} dari ${fmt(target.price_points)} poin. Kurang ${fmt(target.price_points - w.balance)} poin.`}
            </Text>
          </Card>
        ) : null}

        {w ? (
          <Card style={[styles.streak, { backgroundColor: colors.noteYellowBg, borderColor: colors.noteYellowBorder }]}>
            <Flame size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.h3}>{w.weekly_streak ?? 0} minggu berturut-turut</Text>
              <Text style={type.caption}>
                {w.verified_this_week
                  ? 'Minggu ini sudah ada proyek terverifikasi. Lanjutkan minggu depan.'
                  : 'Olah 1 barang minggu ini supaya streak tidak putus.'}
              </Text>
            </View>
          </Card>
        ) : null}

        {w ? (
          <Text style={type.caption}>
            Hari ini {w.verified_today} dari {w.daily_cap} proyek terverifikasi.
          </Text>
        ) : null}

        <Text style={type.h3}>Tukar hadiah</Text>
        {list.map((r) => {
          const Icon = kindIcon[r.kind];
          const short = w ? r.price_points - w.balance : 0;
          const reason = r.stock <= 0 ? 'Stok habis' : short > 0 ? `Kurang ${fmt(short)} poin` : null;
          return (
            <Card key={r.reward_id} style={{ gap: space.md }}>
              <View style={styles.rewardRow}>
                <View style={styles.rewardIcon}>
                  <Icon size={24} color={colors.green700} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.bodyL}>{r.name}</Text>
                  <Text style={type.caption}>{r.partner}</Text>
                </View>
                <Pill label={`${fmt(r.price_points)} poin`} tone="info" />
              </View>
              <ChunkyButton
                label={reason ?? 'Tukar'}
                variant="secondary"
                disabled={!!reason || !w}
                onPress={() => {
                  tukar.reset();
                  setPending({ reward: r, key: newRedeemKey() });
                }}
              />
            </Card>
          );
        })}

        {w?.redemptions.length ? (
          <>
            <Text style={type.h3}>Pengajuan tukar</Text>
            <Card style={{ gap: space.md }}>
              {w.redemptions.map((x) => (
                <View key={x.redemption_id} style={styles.entry}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.body}>{x.reward_name}</Text>
                    <Text style={type.caption}>{date(x.created_at)}</Text>
                  </View>
                  <Pill label={x.status === 'pending' ? 'Diproses mitra' : x.status === 'fulfilled' ? 'Selesai' : 'Ditolak'} tone={x.status === 'rejected' ? 'hard' : 'medium'} />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {w ? (
          <>
            <Text style={type.h3}>Riwayat poin</Text>
            <Card style={{ gap: space.md }}>
              {w.ledger.length === 0 ? <Text style={type.caption}>Belum ada riwayat. Selesaikan satu proyek untuk dapat poin.</Text> : null}
              {w.ledger.map((e) => (
                <View key={e.entry_id} style={styles.entry}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.body}>{e.description}</Text>
                    <Text style={type.caption}>
                      {date(e.created_at)} · {e.source === 'upcycle' ? 'Upcycle' : 'Tukar hadiah'}
                    </Text>
                  </View>
                  <Text style={[type.bodyL, { color: e.amount >= 0 ? colors.green700 : colors.dangerFg }]}>
                    {e.amount >= 0 ? '+' : '−'}
                    {fmt(Math.abs(e.amount))}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <View style={styles.backdrop}>
          <View style={styles.scrim} />
          <View style={styles.sheet}>
            <Text style={type.h2}>Tukar {pending?.reward.name}?</Text>
            <Text style={type.body}>
              {fmt(pending?.reward.price_points ?? 0)} poin akan dipotong dari saldomu. Pengajuan diproses manual oleh {pending?.reward.partner}.
            </Text>
            {tukar.isError ? (
              <View style={styles.danger} accessibilityRole="alert">
                <Text style={[type.body, { color: colors.dangerFg }]}>
                  {tukar.error instanceof ApiFailure ? tukar.error.detail.message : 'Gagal mengajukan. Coba lagi.'}
                </Text>
              </View>
            ) : null}
            <View style={styles.sheetActions}>
              <ChunkyButton label="Batal" variant="secondary" disabled={tukar.isPending} onPress={() => setPending(null)} style={{ flex: 1 }} />
              <ChunkyButton label="Ya, tukar" loading={tukar.isPending} onPress={() => tukar.mutate()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scroll: { padding: space.screen, gap: space.lg },
  streak: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rewardIcon: { width: 48, height: 48, borderRadius: radius.iconButton, backgroundColor: colors.green100, alignItems: 'center', justifyContent: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.ink, opacity: 0.5 },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: space.xxl, gap: space.md },
  danger: { backgroundColor: colors.dangerBg, borderRadius: radius.iconButton, padding: space.md },
  sheetActions: { flexDirection: 'row', gap: space.md },
});
