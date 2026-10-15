import { router, useFocusEffect } from 'expo-router';
import { Camera, ChevronRight, Images } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { StageStatus } from '@/components/StageStatus';
import { pickPhoto } from '@/lib/photo';
import { getActiveProject } from '@/lib/storage';
import { useProject } from '@/lib/useProject';
import { icon3d } from '@/theme/assets';
import { colors, radius, space, type } from '@/theme/tokens';

export default function HomeScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState<'camera' | 'library' | null>(null);
  const { bottom } = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      getActiveProject().then(setActiveId);
    }, []),
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
      <GreenHeader brand title="Barang bekas mau dijadikan apa?" pose="menyapa" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
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

        <Card style={styles.tip}>
          <Image source={icon3d.botol} style={styles.tipIcon} resizeMode="contain" accessible={false} />
          <Text style={[type.body, { flex: 1 }]}>Cocok untuk botol dan wadah plastik kaku.</Text>
        </Card>
      </ScrollView>
    </View>
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
});
