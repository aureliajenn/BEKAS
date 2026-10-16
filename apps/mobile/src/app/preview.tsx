import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { ChunkyButton } from '@/components/ChunkyButton';
import { PlainHeader } from '@/components/GreenHeader';
import { MascotBubble } from '@/components/MascotBubble';
import { StageStatus } from '@/components/StageStatus';
import { GalleryBubble, IdeaBulb } from '@/components/illustrations';
import { ScanCorners } from '@/components/shapes';
import { icon3d } from '@/theme/assets';
import { createProject, type Scenario } from '@/lib/api';
import { setActiveProject } from '@/lib/storage';
import { colors, radius, space, type } from '@/theme/tokens';

// Panduan foto (bukan validasi), masing-masing dengan ilustrasi di tile pastel.
const checklist: { text: string; bg: string; art: ReactNode }[] = [
  { text: 'Satu barang terlihat utuh', bg: colors.tileGreen, art: <Image source={icon3d.botol} style={{ width: 40, height: 40 }} resizeMode="contain" accessible={false} /> },
  { text: 'Latar sederhana', bg: colors.tileBlue, art: <GalleryBubble size={40} /> },
  { text: 'Pencahayaan merata', bg: colors.tileYellow, art: <IdeaBulb size={40} /> },
];

export default function PreviewScreen() {
  const { uri, scenario } = useLocalSearchParams<{ uri: string; scenario?: Scenario }>();
  const { bottom } = useSafeAreaInsets();

  const send = useMutation({
    mutationFn: () => createProject(uri, scenario),
    onSuccess: async (id) => {
      await setActiveProject(id);
      router.replace({ pathname: '/project/[id]', params: { id } });
    },
  });

  return (
    <View style={styles.screen}>
      <PlainHeader title="Pratinjau foto" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.photoCard}>
          <Image source={{ uri }} style={styles.photo} resizeMode="cover" accessibilityLabel="Foto barang yang akan dikirim" />
          <ScanCorners size={30} inset={16} rounded={12} />
        </View>

        <MascotBubble pose="tunjukHp" text="Pastikan barangnya utuh, latarnya polos, dan cahayanya rata." />

        <View style={styles.checkRow}>
          {checklist.map((c, i) => (
            <View key={c.text} style={styles.checkItem}>
              <View style={[styles.checkTile, { backgroundColor: c.bg, transform: [{ rotate: `${(i - 1) * 4}deg` }] }]}>{c.art}</View>
              <Text style={[type.caption, styles.checkText]}>{c.text}</Text>
            </View>
          ))}
        </View>

        {send.isError ? <StageStatus items={[{ kind: 'upload', status: 'failed' }]} /> : null}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: bottom + space.md }]}>
        <ChunkyButton label="Foto ulang" variant="secondary" disabled={send.isPending} onPress={goBack} style={{ flex: 1 }} />
        <ChunkyButton
          label={send.isPending ? 'Mengunggah foto' : send.isError ? 'Coba lagi' : 'Kirim foto'}
          loading={send.isPending}
          icon={<Send size={20} color={colors.white} strokeWidth={2.5} />}
          onPress={() => send.mutate()}
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.lg },
  photoCard: { borderRadius: radius.frame, overflow: 'hidden', borderWidth: 2, borderColor: colors.line, backgroundColor: colors.tileGreen },
  photo: { width: '100%', aspectRatio: 3 / 4, maxHeight: 420 },
  checkRow: { flexDirection: 'row', gap: space.sm },
  checkItem: { flex: 1, alignItems: 'center', gap: space.xs },
  checkTile: { width: 64, height: 64, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: colors.ink, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.screen, paddingTop: space.sm, backgroundColor: colors.bg },
});
