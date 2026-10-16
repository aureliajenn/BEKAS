import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin } from 'lucide-react-native';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { Card, OfflineBanner, Pill } from '@/components/Card';
import { ChunkyButton } from '@/components/ChunkyButton';
import { PlainHeader } from '@/components/GreenHeader';
import { USE_FIXTURES } from '@/lib/api';
import { fetchBankSampah } from '@/lib/rewards';
import { extraCopy } from '@/theme/statusCopy';
import { colors, radius, space, type } from '@/theme/tokens';
import type { BankSampah } from '@/types/contracts';

// URL universal: di Android dibuka oleh aplikasi peta bawaan, tanpa SDK peta (PRD §17.1).
const mapsUrl = (b: BankSampah) => `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`;

export default function BankSampahScreen() {
  const { bottom } = useSafeAreaInsets();
  const q = useQuery({ queryKey: ['bank-sampah'], queryFn: fetchBankSampah });

  return (
    <View style={styles.screen}>
      <PlainHeader title="Bank sampah mitra" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + space.xxl }]}>
        <Text style={type.body}>Olah dulu, setor sisanya. Bawa potongan sisa dan plastik yang tidak bisa diolah ke bank sampah terdekat.</Text>
        {USE_FIXTURES ? <Pill label={extraCopy.cachedSample} tone="cached" /> : null}
        {q.isError ? <OfflineBanner /> : null}
        {!q.data && !q.isError ? <ActivityIndicator color={colors.green500} /> : null}

        {q.data?.map((b) => (
          <Card key={b.id} style={{ gap: space.sm }}>
            <Text style={type.h3}>{b.name}</Text>
            <View style={styles.line}>
              <MapPin size={18} color={colors.iconIdle} strokeWidth={2.5} />
              <Text style={[type.body, { flex: 1 }]}>{b.address}</Text>
            </View>
            <View style={styles.line}>
              <Clock size={18} color={colors.iconIdle} strokeWidth={2.5} />
              <Text style={[type.body, { flex: 1 }]}>{b.hours}</Text>
            </View>
            <View style={styles.pills}>
              {b.accepts.map((a) => (
                <Pill key={a} label={a} tone="info" />
              ))}
            </View>
            <View style={styles.prices}>
              {b.prices.map((p) => (
                <View key={p.type} style={styles.priceRow}>
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
  prices: { backgroundColor: colors.green50, borderRadius: radius.iconButton, padding: space.md, gap: space.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
});
