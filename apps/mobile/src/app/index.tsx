import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { Camera, ChevronRight, Images } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { StageStatus } from '@/components/StageStatus';
import { pickPhoto } from '@/lib/photo';
import { fetchLeaderboard, fetchWallet, getParticipant } from '@/lib/rewards';
import { getActiveProject } from '@/lib/storage';
import { useProject } from '@/lib/useProject';
import { icon3d } from '@/theme/assets';
import { colors, radius, space, type } from '@/theme/tokens';

export default function HomeScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState<'camera' | 'library' | null>(null);
  const qc = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      getActiveProject().then(setActiveId);
      // Saldo dan peringkat bisa berubah setelah verifikasi/tukar di layar lain.
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['participant'] });
    }, [qc]),
  );

  const start = async (source: 'camera' | 'library') => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await pickPhoto(source);
      setDenied(res === 'denied' ? source : null);
      if (res && res !== 'denied') router.push({ pathname: '/preview', params: { uri: res } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <GreenHeader brand title="Barang bekas mau dijadikan apa?" pose="menyapa" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxxl }]}>
        <Card style={{ gap: space.sm }}>
          <Text style={type.h3}>Foto satu barang bekasmu</Text>
          <Text style={type.caption}>Kami tunjukkan bentuk 3D-nya, 3 ide kerajinan, dan panduan langkah demi langkah.</Text>
          <ChunkyButton
            label="Foto barang"
            variant="cta"
            disabled={busy}
            icon={<Camera color={colors.white} size={22} strokeWidth={2.5} />}
            onPress={() => start('camera')}
          />
          <ChunkyButton
            label="Pilih dari galeri"
            variant="secondary"
            disabled={busy}
            icon={<Images color={colors.green700} size={22} strokeWidth={2.5} />}
            onPress={() => start('library')}
          />
          {denied ? (
            <View style={styles.denied} accessibilityRole="alert">
              <Text style={[type.body, { color: colors.dangerFg }]}>
                {denied === 'camera'
                  ? 'Izin kamera ditolak. Kamu tetap bisa pilih foto dari galeri, atau izinkan kamera di pengaturan HP.'
                  : 'Izin galeri ditolak. Izinkan akses foto di pengaturan HP.'}
              </Text>
            </View>
          ) : null}
        </Card>

        {activeId ? <ResumeCard id={activeId} /> : null}

        <RewardCards />

        <Card style={styles.tip}>
          <Image source={icon3d.botol} style={styles.tipIcon} resizeMode="contain" accessible={false} />
          <Text style={[type.body, { flex: 1 }]}>Cocok untuk botol dan wadah plastik kaku.</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function RewardCards() {
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: fetchWallet });
  const board = useQuery({ queryKey: ['leaderboard'], queryFn: fetchLeaderboard });
  const participant = useQuery({ queryKey: ['participant'], queryFn: getParticipant });
  const mine = board.data?.rows.find((r) => r.rw_id === participant.data?.rwId);

  return (
    <>
      <View style={styles.tiles}>
        <Tile
          label="Dompet poin"
          value={wallet.data ? `${wallet.data.balance.toLocaleString('id-ID')}` : '–'}
          caption={wallet.data?.is_fixture ? 'Contoh tersimpan' : 'poin · 1 poin = Rp1'}
          icon={icon3d.labelEco}
          onPress={() => router.push('/wallet')}
        />
        <Tile
          label="Leaderboard RW"
          value={mine ? `#${mine.rank}` : 'Pilih'}
          caption={board.data?.is_fixture ? 'Contoh tersimpan' : mine ? `${mine.name} ${mine.kelurahan}` : 'RW kamu'}
          icon={icon3d.tanganBumi}
          onPress={() => router.push('/leaderboard')}
        />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Bank sampah mitra" onPress={() => router.push('/bank-sampah')} style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <Card style={styles.tip}>
          <Image source={icon3d.tongSampah} style={styles.tipIcon} resizeMode="contain" accessible={false} />
          <View style={{ flex: 1 }}>
            <Text style={type.bodyL}>Bank sampah mitra</Text>
            <Text style={type.caption}>Setor sisa yang tidak bisa diolah.</Text>
          </View>
          <ChevronRight size={22} color={colors.iconIdle} strokeWidth={2.5} />
        </Card>
      </Pressable>
    </>
  );
}

function Tile({ label, value, caption, icon, onPress }: { label: string; value: string; caption: string; icon: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value} ${caption}`} onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.85 }]}>
      <Card style={{ gap: space.xs }}>
        <Image source={icon} style={styles.tileIcon} resizeMode="contain" accessible={false} />
        <Text style={type.overline}>{label}</Text>
        <Text style={[type.h2, { color: colors.green700 }]}>{value}</Text>
        <Text style={type.caption} numberOfLines={1}>{caption}</Text>
      </Card>
    </Pressable>
  );
}

function ResumeCard({ id }: { id: string }) {
  const { data: p } = useProject(id);
  if (!p) return null;
  // Satu baris tahap terakhir: panduan bila sudah diminta, kalau belum ide.
  const last = p.guide ? { kind: 'guide' as const, status: p.guide.job.status } : { kind: 'ideas' as const, status: p.ideas.job.status };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Lanjutkan proyek terakhir"
      onPress={() => router.push(p.guide ? { pathname: '/project/[id]/guide', params: { id } } : { pathname: '/project/[id]', params: { id } })}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <Card style={{ gap: space.md }}>
        <View style={styles.resumeHead}>
          {p.input_url ? <Image source={{ uri: p.input_url }} style={styles.thumb} accessible={false} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={type.overline}>Lanjutkan proyek</Text>
            <Text style={type.h3}>{p.ideas.result?.object_profile?.label ?? 'Barang yang kamu foto'}</Text>
          </View>
          <ChevronRight size={22} color={colors.iconIdle} strokeWidth={2.5} />
        </View>
        <StageStatus items={[last]} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.lg },
  denied: { backgroundColor: colors.dangerBg, borderRadius: radius.iconButton, padding: space.md },
  resumeHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 56, height: 56, borderRadius: radius.iconButton, backgroundColor: colors.green50 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tipIcon: { width: 48, height: 48 },
  tiles: { flexDirection: 'row', gap: space.md },
  tileIcon: { width: 40, height: 40 },
});
