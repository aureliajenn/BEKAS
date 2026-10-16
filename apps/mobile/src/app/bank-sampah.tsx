import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin } from 'lucide-react-native';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { Card, IlluTile, OfflineBanner, Pill } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { PlainHeader } from '@/components/GreenHeader';
import { USE_FIXTURES } from '@/lib/api';
import { MapPin as MapPinArt } from '@/components/illustrations';
import { Coin, Sparkle } from '@/components/shapes';
import { fetchBankSampah } from '@/lib/rewards';
import { extraCopy } from '@/theme/statusCopy';
import { colors, radius, space, type } from '@/theme/tokens';
import type { BankSampah } from '@/types/contracts';

// URL universal: di Android dibuka oleh aplikasi peta bawaan, tanpa SDK peta (PRD §17.1).
const tiles = [colors.tileBlue, colors.tileGreen, colors.tileYellow];

const mapsUrl = (b: BankSampah) => `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`;

export default function BankSampahScreen() {
  const { bottom } = useSafeAreaInsets();
  const q = useQuery({ queryKey: ['bank-sampah'], queryFn: fetchBankSampah });

  return (
    <View style={styles.screen}>
      <PlainHeader title="Bank sampah mitra" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
        {/* Momen visual utama: banner pastel dengan pin besar. */}
        <View style={styles.banner}>
          <View style={{ flex: 1, gap: space.xs }}>
            <Text style={type.h2}>Olah dulu, setor sisanya</Text>
            <Text style={type.body}>Bawa potongan sisa dan plastik yang tidak bisa diolah ke bank sampah terdekat.</Text>
            {USE_FIXTURES ? <Pill label={extraCopy.cachedSample} tone="cached" /> : null}
          </View>
          <View style={styles.bannerArt}>
            <MapPinArt size={88} />
            <Sparkle size={14} color={colors.accentYellow} style={styles.spark} />
          </View>
        </View>
        {q.isError ? <OfflineBanner /> : null}
        {!q.data && !q.isError ? <ActivityIndicator color={colors.green500} /> : null}

        {q.data?.map((b, i) => (
          <Card key={b.id} style={{ gap: space.sm }}>
            <View style={styles.head}>
              <IlluTile bg={tiles[i % tiles.length]} size={56} tilt={i % 2 ? 4 : -4}>
                <MapPinArt size={44} />
              </IlluTile>
              <Text style={[type.h3, { flex: 1 }]}>{b.name}</Text>
            </View>
            <View style={styles.line}>
              <MapPin size={18} color={colors.iconIdle} strokeWidth={2.5} />
              <Text style={[type.body, { flex: 1 }]}>{b.address}</Text>
            </View>
            <View style={styles.line}>
              <Clock size={18} color={colors.iconIdle} strokeWidth={2.5} />
              <Text style={[type.body, { flex: 1 }]}>{b.hours}</Text>
            </View>
            <View style={styles.pills}>
              {b.accepts.map((a, j) => (
                <Pill key={a} label={a} tone={(['info', 'easy', 'cached'] as const)[j % 3]} />
              ))}
            </View>
            <View style={styles.prices}>
              {b.prices.map((p) => (
                <View key={p.type} style={styles.priceRow}>
                  <Coin size={16} />
                  <Text style={[type.body, { flex: 1 }]}>{p.type}</Text>
                  <Text style={type.bodyL}>Rp{p.price_per_kg.toLocaleString('id-ID')}/kg</Text>
                </View>
              ))}
            </View>
            <ChunkyButton
              label="Buka di peta"
              variant="secondary"
              icon={<MapPin size={22} color={colors.green700} strokeWidth={2.5} />}
              onPress={() => Linking.openURL(mapsUrl(b))}
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.screen, gap: space.lg },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  prices: { backgroundColor: colors.noteYellowBg, borderRadius: radius.iconButton, padding: space.md, gap: space.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.tilePink, borderRadius: radius.card, padding: space.lg },
  bannerArt: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '6deg' }] },
  spark: { position: 'absolute', top: 2, left: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
