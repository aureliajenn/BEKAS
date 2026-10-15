// Halaman sementara untuk cek komponen di HP. Hapus sebelum rilis demo.
import { Camera, Images } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card, OfflineBanner, Pill, SafetyNote } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { GreenHeader } from '@/components/GreenHeader';
import { IdeaCard } from '@/components/IdeaCard';
import { MascotBubble } from '@/components/MascotBubble';
import { MeshViewerFrame } from '@/components/MeshViewerFrame';
import { StageStatus } from '@/components/StageStatus';
import { StepCard } from '@/components/StepCard';
import { assetUri, scenarios, type Scenario } from '@/lib/api';
import { SAMPLE_GLB, sampleGuide, sampleIdeas } from '@/lib/fixtures';
import { icon3d } from '@/theme/assets';
import { extraCopy } from '@/theme/statusCopy';
import { colors, space, type } from '@/theme/tokens';

const noop = () => {};
const step = sampleGuide('idea-pot').steps[2];

export default function DevComponents() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GreenHeader eyebrow="Halaman sementara" title="Komponen BEKAS" pose="menyapa" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: space.screen, gap: space.lg, paddingBottom: 48 }}>

        <Text style={type.overline}>Skenario fixture (DESIGN.md §7)</Text>
        {(Object.keys(scenarios) as Scenario[]).map((sc) => (
          <ChunkyButton
            key={sc}
            label={scenarios[sc]}
            variant="secondary"
            onPress={() => router.push({ pathname: '/preview', params: { uri: assetUri(icon3d.botol), scenario: sc } })}
          />
        ))}

        <Text style={type.overline}>ChunkyButton</Text>
        <ChunkyButton label="Kirim foto" onPress={noop} />
        <ChunkyButton label="Foto barang" variant="cta" icon={<Camera color={colors.white} size={22} strokeWidth={2.5} />} onPress={noop} />
        <ChunkyButton label="Pilih dari galeri" variant="secondary" icon={<Images color={colors.green700} size={22} strokeWidth={2.5} />} onPress={noop} />
        <ChunkyButton label="Buat panduan" disabled />
        <ChunkyButton label="Mengunggah foto" loading />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <ChunkyButton label="Kamera" iconOnly variant="secondary" icon={<Camera color={colors.green700} size={22} strokeWidth={2.5} />} onPress={noop} />
          <ChunkyButton label="Lanjut" style={{ flex: 1 }} onPress={noop} />
        </View>

        <Text style={type.overline}>StageStatus</Text>
        <StageStatus
          items={[
            { kind: 'upload', status: 'succeeded' },
            { kind: 'mesh', status: 'queued' },
            { kind: 'ideas', status: 'running' },
            { kind: 'guide', status: 'retry_wait' },
            { kind: 'illustration', status: 'failed', onRetry: noop },
          ]}
        />
        <StageStatus items={[{ kind: 'mesh', status: 'queued', labelOverride: extraCopy.meshWorkerUnavailable }]} />

        <Text style={type.overline}>Card + Pill</Text>
        <Card style={{ gap: space.sm }}>
          <Text style={type.h3}>Profil barang</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pill label="Mudah" tone="easy" />
            <Pill label="Sedang" tone="medium" />
            <Pill label="Sulit" tone="hard" />
            <Pill label="Kemungkinan PET" tone="info" />
            <Pill label={extraCopy.cachedSample} tone="cached" />
            <Pill label="±20 menit" />
          </View>
        </Card>
        <Card selected>
          <Text style={type.body}>Kartu terpilih</Text>
        </Card>

        <Text style={type.overline}>IdeaCard</Text>
        {sampleIdeas.ideas.map((idea, i) => (
          <IdeaCard key={idea.id} idea={idea} index={i} selected={i === 0} onPress={noop} />
        ))}

        <Text style={type.overline}>SafetyNote + OfflineBanner</Text>
        <SafetyNote text="Tepi potongan tajam. Ampelas atau tutup dengan selotip." />
        <OfflineBanner />

        <Text style={type.overline}>MeshViewerFrame</Text>
        <MeshViewerFrame status="succeeded" meshUrl={SAMPLE_GLB} />
        <MeshViewerFrame status="queued" labelOverride={extraCopy.meshWorkerUnavailable} />
        <MeshViewerFrame status="failed" onRetry={noop} />

        <Text style={type.overline}>StepCard</Text>
        <StepCard step={step} illustrationStatus="running" checked={false} onToggle={noop} />
        <StepCard step={step} illustrationStatus="failed" onRetryIllustration={noop} checked onToggle={noop} />

        <Text style={type.overline}>MascotBubble</Text>
        <MascotBubble pose="tunjukHp" text="Pastikan barangnya utuh, latarnya polos, dan cahayanya rata." />
        <MascotBubble pose="bingung" size={64} text={extraCopy.needsNewPhoto} />
        <MascotBubble pose="senang" size={84} text="Kerajinanmu jadi!" />
      </ScrollView>
    </View>
  );
}
