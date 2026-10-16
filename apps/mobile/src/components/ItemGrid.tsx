import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '../theme/tokens';
import { IlluTile } from './Card';
import { GiftBox, GlueTube, IdeaBulb, PaintBrush, PlantPot, Rope, Scissors, type IlluProps } from './illustrations';

/** Pilih ilustrasi dari nama alat/bahan bebas dari backend. Tidak cocok → bohlam (alat lain). */
function artFor(name: string): ComponentType<IlluProps> {
  const n = name.toLowerCase();
  if (/gunting|cutter|pisau|potong/.test(n)) return Scissors;
  if (/lem|perekat|selotip|lakban/.test(n)) return GlueTube;
  if (/kuas|cat|spidol|pensil|marker|warna/.test(n)) return PaintBrush;
  if (/tali|benang|rami|kawat/.test(n)) return Rope;
  if (/tanah|bibit|tanaman|benih/.test(n)) return PlantPot;
  if (/kertas|kain|kado|perca|pita/.test(n)) return GiftBox;
  return IdeaBulb;
}

const tiles = [colors.tileBlue, colors.tileYellow, colors.tilePink, colors.tileGreen];

/** Grid tile ilustrasi untuk alat/bahan (pengganti bullet list). */
export function ItemGrid({ items, offset = 0 }: { items: string[]; offset?: number }) {
  return (
    <View style={styles.grid}>
      {items.map((item, i) => {
        const Art = artFor(item);
        const rot = (i % 3) - 1; // -1, 0, 1 → miring tipis bergantian
        return (
          <View key={item} style={styles.cell} accessible accessibilityLabel={item}>
            <IlluTile bg={tiles[(i + offset) % tiles.length]} size={68} tilt={rot * 4}>
              <Art size={46} />
            </IlluTile>
            <Text style={[type.caption, styles.label]} numberOfLines={2}>
              {item}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md },
  cell: { width: '33.33%', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  label: { color: colors.ink, textAlign: 'center' },
});
