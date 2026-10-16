import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronRight, Play } from 'lucide-react-native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, ProgressBar } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { HeaderBadges } from '@/components/HeaderBadges';
import { CameraBubble, CoinStack, GalleryBubble, MapPin, PlantPot, TrophyCup } from '@/components/illustrations';
import { Sparkle, Star } from '@/components/shapes';
import { StageStatus } from '@/components/StageStatus';
import { pickPhoto } from '@/lib/photo';
import { fetchLeaderboard, fetchWallet, getParticipant } from '@/lib/rewards';
import { getActiveProject, getDoneSteps } from '@/lib/storage';
import { useProject } from '@/lib/useProject';
import { icon3d } from '@/theme/assets';
import { colors, radius, space, type } from '@/theme/tokens';

const OVERLAP = 40;

export default function HomeScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Tombol Scan di navbar mengirim ?denied=camera bila izin kamera ditolak.
  const params = useLocalSearchParams<{ denied?: 'camera' }>();
  const [denied, setDenied] = useState<'camera' | 'library' | null>(params.denied ?? null);
  useEffect(() => {
    if (params.denied) setDenied(params.denied);
  }, [params.denied]);
  const { bottom } = useSafeAreaInsets();
  const qc = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      getActiveProject().then(setActiveId);
      // Saldo, peringkat, dan centang bisa berubah di layar lain.
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['participant'] });
      qc.invalidateQueries({ queryKey: ['done'] });
    }, [qc]),
  );

  const start = async (source: 'camera' | 'library') => {
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
      <ScrollView contentContainerStyle={{ paddingBottom: bottom + space.xxl }}>
        <GreenHeader
          brand
          eyebrow={greeting()}
          title="Barang bekas mau dijadikan apa?"
          pose="menyapa"
          mascotSize={170}
          overlap={OVERLAP}
          topRight={<HeaderBadges />}
        />

        <View style={[styles.body, { marginTop: -OVERLAP }]}>
          <Card style={{ gap: space.md }}>
            <View style={styles.row}>
              <View style={styles.heroArt}>
                <CameraBubble size={84} />
                <Sparkle size={14} color={colors.accentYellow} style={styles.sparkleTR} />
                <Star size={11} color={colors.accentPink} style={styles.sparkleBL} />
              </View>
              <View style={{ flex: 1, gap: space.xs }}>
                <Text style={type.h3}>Foto barang bekasmu</Text>
                <Text style={type.caption}>Lihat bentuk 3D-nya, 3 ide kerajinan, dan panduan langkah demi langkah.</Text>
              </View>
            </View>
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
              icon={<GalleryBubble size={30} />}
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

          <View style={[styles.row, styles.tip]}>
            <View style={[styles.tileSm, styles.tilt, { backgroundColor: colors.white }]}>
              <PlantPot size={44} />
            </View>
            <Text style={[type.body, { flex: 1, color: colors.blue600 }]}>Cocok untuk botol dan wadah plastik kaku. Olah dulu, setor sisanya.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
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
          value={wallet.data ? wallet.data.balance.toLocaleString('id-ID') : '–'}
          caption={wallet.data?.is_fixture ? 'Contoh tersimpan' : '1 poin = Rp1'}
          bg={colors.tileYellow}
          art={
            <View>
              <CoinStack size={60} />
              <Sparkle size={13} color={colors.accentYellow} style={styles.artSparkle} />
            </View>
          }
          onPress={() => router.navigate('/wallet')}
        />
        <Tile
          label="Peringkat RW"
          value={mine ? `#${mine.rank}` : 'Pilih RW'}
          caption={board.data?.is_fixture ? 'Contoh tersimpan' : mine ? `${mine.name} ${mine.kelurahan}` : 'Ikut peringkat'}
          bg={colors.tileBlue}
          valueColor={colors.blue600}
          art={
            <View>
              <TrophyCup size={60} />
              <Star size={12} color={colors.white} style={styles.artSparkle} />
            </View>
          }
          onPress={() => router.navigate('/leaderboard')}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bank sampah mitra"
        onPress={() => router.push('/bank-sampah')}
        style={({ pressed }) => pressed && { opacity: 0.85 }}
      >
        <Card style={styles.row}>
          <View style={[styles.tileSm, styles.tiltR, { backgroundColor: colors.tilePink }]}>
            <MapPin size={46} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Bank sampah mitra</Text>
            <Text style={type.caption}>Setor sisa yang tidak bisa diolah.</Text>
          </View>
          <ChevronRight size={22} color={colors.iconIdle} strokeWidth={2.5} />
        </Card>
      </Pressable>
    </>
  );
}

type TileProps = { label: string; value: string; caption: string; bg: string; art: ReactNode; valueColor?: string; onPress: () => void };

function Tile({ label, value, caption, bg, art, valueColor = colors.green700, onPress }: TileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. ${caption}`}
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.85 }]}
    >
      <Card style={[styles.pastel, { backgroundColor: bg, borderColor: bg }]}>
        {art}
        <Text style={type.overline}>{label}</Text>
        <Text style={[type.h2, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={type.caption} numberOfLines={1}>
          {caption}
        </Text>
      </Card>
    </Pressable>
  );
}

function ResumeCard({ id }: { id: string }) {
  const { data: p } = useProject(id);
  const done = useQuery({ queryKey: ['done', id], queryFn: () => getDoneSteps(id) });
  if (!p) return null;
  const steps = p.guide?.result?.steps ?? [];
  const checked = steps.filter((s) => done.data?.includes(s.id)).length;
  const title = p.guide?.result?.title ?? p.ideas.result?.object_profile?.label ?? 'Barang yang kamu foto';
  const open = () => router.push(p.guide ? { pathname: '/project/[id]/guide', params: { id } } : { pathname: '/project/[id]', params: { id } });

  return (
    <View style={{ gap: space.md }}>
      <Text style={type.h3}>Lanjutkan proyek</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Lanjutkan ${title}`} onPress={open} style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <Card style={{ gap: space.md }}>
          <View style={styles.row}>
            <View style={[styles.tileSm, styles.tilt, { backgroundColor: colors.tileGreen }]}>
              <Image source={icon3d.tanamanListrik} style={styles.tileSmImg} resizeMode="contain" accessible={false} />
            </View>
            <View style={{ flex: 1, gap: space.xs }}>
              <Text style={type.h3} numberOfLines={2}>
                {title}
              </Text>
              {steps.length ? (
                <>
                  <Text style={type.caption}>
                    <Text style={styles.stepNum}>{checked}</Text>/{steps.length} langkah dicentang
                  </Text>
                  <ProgressBar value={checked} max={steps.length} label={`${checked} dari ${steps.length} langkah`} />
                </>
              ) : null}
            </View>
            {/* Dekor chunky; seluruh kartu adalah tombolnya (hindari tombol bersarang). */}
            <View style={styles.playDepth} accessible={false}>
              <View style={styles.play}>
                <Play size={22} color={colors.white} strokeWidth={2.5} fill={colors.white} />
              </View>
            </View>
          </View>
          {/* Belum ada panduan: tampilkan nama tahap ide, bukan progres palsu. */}
          {!steps.length ? <StageStatus items={[{ kind: 'ideas', status: p.ideas.job.status }]} /> : null}
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.screen, gap: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tileSm: { width: 56, height: 56, borderRadius: radius.iconButton + 2, alignItems: 'center', justifyContent: 'center' },
  tileSmImg: { width: 44, height: 44 },
  denied: { backgroundColor: colors.dangerBg, borderRadius: radius.iconButton, padding: space.md },
  tiles: { flexDirection: 'row', gap: space.md },
  pastel: { gap: space.xs, minHeight: 150 },
  playDepth: { width: 52, height: 52, borderRadius: radius.iconButton, backgroundColor: colors.green700 },
  play: { width: 52, height: 47, borderRadius: radius.iconButton, backgroundColor: colors.green500, alignItems: 'center', justifyContent: 'center' },
  tip: { backgroundColor: colors.blue50, borderRadius: radius.card, padding: space.lg },
  heroArt: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sparkleTR: { position: 'absolute', top: 0, right: 2 },
  sparkleBL: { position: 'absolute', bottom: 4, left: 0 },
  artSparkle: { position: 'absolute', top: 2, right: -6 },
  tilt: { transform: [{ rotate: '-4deg' }] },
  tiltR: { transform: [{ rotate: '4deg' }] },
  stepNum: { ...type.h3, color: colors.green700 },
});
