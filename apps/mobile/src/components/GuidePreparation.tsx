import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { GuideResult } from '@/types/contracts';
import type { ProcessAssets } from '@/theme/assets';
import { colors, space, touch, type } from '@/theme/tokens';
import { Card } from './Card';
import { MascotBubble } from './MascotBubble';
import { ProcessVisual } from './ProcessVisual';

export function GuidePreparation({ guide, assets }: { guide: GuideResult; assets?: ProcessAssets }) {
  const [openKit, setOpenKit] = useState(true);
  const Chevron = openKit ? ChevronUp : ChevronDown;

  return (
    <>
      <ProcessVisual
        title="Persiapan barang"
        illustrationAsset={assets?.illustration}
        modelAsset={assets?.model}
      />
      <Text style={type.body}>
        {assets
          ? 'Siapkan botol plastik utuh sebagai bahan awal. Periksa alat dan bahan berikut sebelum mulai membentuk wadah.'
          : 'Siapkan barang bekas serta semua alat dan bahan berikut. Baca catatan keamanan sebelum mulai.'}
      </Text>
      <Card style={{ gap: space.sm }}>
        <Pressable
          onPress={() => setOpenKit((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: openKit }}
          style={styles.kitHead}
        >
          <Text style={[type.h3, { flex: 1 }]}>Alat dan bahan</Text>
          <Chevron size={22} color={colors.green700} strokeWidth={2.5} />
        </Pressable>
        {openKit ? <>
          <Text style={type.body}>Bahan: {guide.materials.join(', ')}</Text>
          <Text style={type.body}>Alat: {guide.tools.join(', ')}</Text>
        </> : null}
      </Card>
      <MascotBubble pose="tunjukHp" text="Baca instruksi tiap proses. Kamu bisa menukar tampilan ilustrasi 2D dan model 3D lewat tombol." />
    </>
  );
}

const styles = StyleSheet.create({
  kitHead: { flexDirection: 'row', alignItems: 'center', minHeight: touch.min },
});
