// Galeri kit ilustrasi untuk dicek visual. Hanya dev.
import { Redirect } from 'expo-router';
import type { ComponentType } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlainHeader } from '@/components/GreenHeader';
import * as I from '@/components/illustrations';
import type { IlluProps } from '@/components/illustrations';
import { goBack } from '@/lib/nav';
import { colors, radius, space, type } from '@/theme/tokens';

const bgs = [colors.tileGreen, colors.tileBlue, colors.tilePink, colors.tileYellow];

const items: [string, ComponentType<IlluProps>][] = [
  ['CoinStack', I.CoinStack],
  ['TrophyCup', I.TrophyCup],
  ['Medal 1', (p) => <I.Medal rank={1} {...p} />],
  ['Medal 2', (p) => <I.Medal rank={2} {...p} />],
  ['Medal 3', (p) => <I.Medal rank={3} {...p} />],
  ['GiftBox', I.GiftBox],
  ['CameraBubble', I.CameraBubble],
  ['GalleryBubble', I.GalleryBubble],
  ['IdeaBulb', I.IdeaBulb],
  ['Scissors', I.Scissors],
  ['GlueTube', I.GlueTube],
  ['PaintBrush', I.PaintBrush],
  ['Rope', I.Rope],
  ['PlantPot', I.PlantPot],
  ['MapPin', I.MapPin],
  ['HouseGroup', I.HouseGroup],
  ['CheckBadge', I.CheckBadge],
  ['ShieldWarning', I.ShieldWarning],
  ['FlameBig', I.FlameBig],
  ['Clock', I.Clock],
];

export default function IllustrationsGallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={styles.screen}>
      <PlainHeader title={`Kit ilustrasi (${items.length})`} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.grid}>
        {items.map(([name, Comp], i) => (
          <View key={name} style={styles.cell}>
            <View style={[styles.tile, { backgroundColor: bgs[i % bgs.length] }]}>
              <Comp size={72} />
            </View>
            <View style={styles.small}>
              <Comp size={32} />
            </View>
            <Text style={[type.caption, { color: colors.ink }]} numberOfLines={1}>
              {name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: space.lg, gap: space.md },
  cell: { width: '30%', alignItems: 'center', gap: space.xs },
  tile: { width: 96, height: 96, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  small: { position: 'absolute', top: 4, right: 4 },
});
