import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Send } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { Pill } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { PlainHeader } from '@/components/GreenHeader';
import { MascotBubble } from '@/components/MascotBubble';
import { StageStatus } from '@/components/StageStatus';
import { assetUri, createProject, USE_FIXTURES, type Scenario } from '@/lib/api';
import { setActiveProject } from '@/lib/storage';
import { pencilProcessAssets } from '@/theme/assets';
import { extraCopy } from '@/theme/statusCopy';
import { colors, space, type } from '@/theme/tokens';

const checklist = ['Satu barang terlihat utuh', 'Latar sederhana', 'Pencahayaan merata'];

export default function PreviewScreen() {
  const { uri, scenario } = useLocalSearchParams<{ uri: string; scenario?: Scenario }>();
  const { bottom } = useSafeAreaInsets();
  const dummyPhoto = pencilProcessAssets['mesh-01'].illustration;
  const photoUri = USE_FIXTURES && dummyPhoto ? assetUri(dummyPhoto) : uri;

  const send = useMutation({
    mutationFn: () => createProject(photoUri, scenario),
    onSuccess: async (id) => {
      await setActiveProject(id);
      router.replace({ pathname: '/project/[id]', params: { id } });
    },
  });

  return (
    <View style={styles.screen}>
      <PlainHeader title="Pratinjau foto" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {USE_FIXTURES ? <Pill label={extraCopy.cachedSample} tone="cached" /> : null}
        <View style={styles.photoCard}>
          <Image source={USE_FIXTURES && dummyPhoto ? dummyPhoto : { uri: photoUri }} style={styles.photo}
            resizeMode={USE_FIXTURES ? 'contain' : 'cover'}
            accessibilityLabel={USE_FIXTURES ? 'Gambar contoh botol plastik utuh' : 'Foto barang yang akan dikirim'} />
        </View>

        <MascotBubble pose="tunjukHp" text="Pastikan barangnya utuh, latarnya polos, dan cahayanya rata." />

        <View style={{ gap: space.sm }}>
          {checklist.map((c) => (
            <View key={c} style={styles.check}>
              <Check size={18} color={colors.green500} strokeWidth={2.5} />
              <Text style={type.body}>{c}</Text>
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
  photoCard: { borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  photo: { width: '100%', aspectRatio: 3 / 4, maxHeight: 420 },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.screen, paddingTop: space.sm, backgroundColor: colors.bg },
});
