import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { Check, Flag, Gift, Lock, Plus } from 'lucide-react-native';
import { Fragment, useCallback, useState, type ComponentType } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Pill } from '@/components/Card';
import { GreenHeader } from '@/components/GreenHeader';
import { HeaderBadges } from '@/components/HeaderBadges';
import { TagLabel } from '@/components/shapes';
import { HouseGroup, PlantPot, Rope, type IlluProps } from '@/components/illustrations';
import { UPCYCLE_POINTS } from '@/lib/api';
import { fetchRewards, fetchWallet } from '@/lib/rewards';
import { getActiveProject, getDoneSteps } from '@/lib/storage';
import { useProject } from '@/lib/useProject';
import { icon3d, mascot } from '@/theme/assets';
import { extraCopy } from '@/theme/statusCopy';
import { chunkyDepth, colors, illu, radius, space, type } from '@/theme/tokens';

type Node =
  | { kind: 'done'; key: string; label: string }
  | { kind: 'current'; key: string; label: string; onPress: () => void }
  | { kind: 'locked'; key: string }
  | { kind: 'gift'; key: string; label: string; caption: string };

const ROW = 112;
const SWING = [0, 64, 0, -64]; // zig-zag seperti jalur referensi
// Campuran ikon 3D (PNG) dan ilustrasi kit (SVG) supaya peta tidak sepi.
const DECOR: (ImageSourcePropType | ComponentType<IlluProps>)[] = [icon3d.tanamanListrik, PlantPot, icon3d.rumah, HouseGroup, icon3d.tongBio, Rope];
const MAX_DONE = 3;
const MAX_LOCKED = 4;

/** Jalur dari data nyata (PRD AC16): proyek terverifikasi → proyek aktif → sisa proyek menuju hadiah target. */
export default function JalurScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: fetchWallet });
  const rewards = useQuery({ queryKey: ['rewards'], queryFn: fetchRewards });
  const project = useProject(activeId ?? '');
  const done = useQuery({ queryKey: ['done', activeId], queryFn: () => getDoneSteps(activeId!), enabled: !!activeId });

  useFocusEffect(
    useCallback(() => {
      getActiveProject().then(setActiveId);
    }, []),
  );

  const w = wallet.data;
  const p = activeId ? project.data : undefined;
  const nodes: Node[] = [];

  // 1. Proyek terverifikasi (terlama di atas), dibatasi supaya jalur tidak terlalu panjang.
  const verified = (w?.ledger ?? []).filter((e) => e.source === 'upcycle').reverse();
  verified.slice(-MAX_DONE).forEach((e) => nodes.push({ kind: 'done', key: e.entry_id, label: e.description }));

  // 2. Proyek aktif yang belum terverifikasi, atau ajakan mulai proyek baru.
  const activePending = !!p && !p.verification?.result?.approved;
  if (activePending && p) {
    const steps = p.guide?.result?.steps ?? [];
    const checked = steps.filter((s) => done.data?.includes(s.id)).length;
    const title = p.guide?.result?.title ?? p.ideas.result?.object_profile?.label ?? 'Proyek aktif';
    nodes.push({
      kind: 'current',
      key: 'current',
      label: steps.length ? `${title} · ${checked}/${steps.length}` : title,
      onPress: () => router.push(p.guide ? { pathname: '/project/[id]/guide', params: { id: p.id } } : { pathname: '/project/[id]', params: { id: p.id } }),
    });
  } else {
    nodes.push({ kind: 'current', key: 'current', label: 'Mulai proyek baru', onPress: () => router.navigate('/') });
  }

  // 3. Sisa proyek menuju hadiah target terdekat: selisih poin ÷ poin per proyek.
  const inStock = (rewards.data ?? []).filter((r) => r.stock > 0).sort((a, b) => a.price_points - b.price_points);
  const target = w ? (inStock.find((r) => r.price_points > w.balance) ?? inStock.at(-1)) : undefined;
  const needed = target && w ? Math.ceil(Math.max(0, target.price_points - w.balance) / UPCYCLE_POINTS) : 0;
  const locked = Math.max(0, needed - (activePending ? 1 : 0));
  for (let i = 0; i < Math.min(locked, MAX_LOCKED); i++) nodes.push({ kind: 'locked', key: `lock-${i}` });
  if (target) {
    nodes.push({
      kind: 'gift',
      key: 'gift',
      label: target.name,
      caption: needed === 0 ? 'Poinmu sudah cukup' : `${needed} proyek lagi`,
    });
  }

  const points = nodes.map((_, i) => ({ x: width / 2 + SWING[i % SWING.length], y: ROW / 2 + i * ROW + space.xxl }));
  const height = nodes.length * ROW + space.xxl * 2;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <GreenHeader
          eyebrow="Perjalanan olah barangmu"
          title="Jalur kreasi botol"
          topLeft={<Pill label="Botol & wadah plastik" tone="easy" />}
          topRight={<HeaderBadges />}
        >
          {w?.is_fixture ? (
            <View style={{ marginTop: space.sm }}>
              <Pill label={extraCopy.cachedSample} tone="cached" />
            </View>
          ) : null}
        </GreenHeader>

        <View style={[styles.map, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? (
            <>
              <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
                <Path d={road(points)} stroke={colors.noteYellowBorder} strokeWidth={34} fill="none" strokeLinecap="round" />
                <Path d={road(points)} stroke={colors.tileYellow} strokeWidth={24} fill="none" strokeLinecap="round" />
                {/* garis putus-putus di tengah jalan, seperti jalur Pidu */}
                <Path d={road(points)} stroke={colors.noteYellowBorder} strokeWidth={3} strokeDasharray="2 9" fill="none" strokeLinecap="round" />
                {/* bunga kecil tersebar di kiri-kanan (posisi tetap per baris) */}
                {points.map((pt, i) => {
                  const fx = i % 2 ? width - 40 : 32;
                  const fy = pt.y + (i % 3) * 14 - 30;
                  return (
                    <Fragment key={i}>
                      {[0, 72, 144, 216, 288].map((deg) => (
                        <Circle key={deg} cx={fx + 5 * Math.cos((deg * Math.PI) / 180)} cy={fy + 5 * Math.sin((deg * Math.PI) / 180)} r={3.4} fill={colors.white} />
                      ))}
                      <Circle cx={fx} cy={fy} r={3} fill={colors.accentYellow} />
                      <Circle cx={width - fx + (i % 2 ? 40 : -40)} cy={fy + 52} r={3} fill={colors.green400} opacity={0.5} />
                    </Fragment>
                  );
                })}
              </Svg>

              {nodes.map((n, i) => {
                const { x, y } = points[i];
                // Dekor di sisi berlawanan dari ayunan; titik tengah bergantian kiri/kanan.
                const swing = SWING[i % SWING.length];
                const left = swing === 0 ? i % 4 === 0 : swing < 0 ? false : true;
                const Decor = DECOR[i % DECOR.length];
                return (
                  <View key={n.key}>
                    {n.kind !== 'current' ? (
                      <View style={[styles.decor, { top: y - 36, left: left ? space.lg : width - 72 - space.lg, transform: [{ rotate: `${left ? -6 : 6}deg` }] }]}>
                        {typeof Decor === 'function' ? (
                          <Decor size={68} />
                        ) : (
                          <Image source={Decor as ImageSourcePropType} style={styles.decorImg} resizeMode="contain" accessible={false} />
                        )}
                      </View>
                    ) : null}
                    <NodeView node={n} x={x} y={y} width={width} />
                  </View>
                );
              })}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function NodeView({ node, x, y, width }: { node: Node; x: number; y: number; width: number }) {
  if (node.kind === 'current') {
    const size = 76;
    return (
      <>
        <View style={[styles.halo, { left: x - 48, top: y - 48 }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={node.label}
          onPress={node.onPress}
          style={[styles.nodeDepth, { width: size, height: size, borderRadius: size / 2, left: x - size / 2, top: y - size / 2 + chunkyDepth / 2, backgroundColor: colors.green700 }]}
        >
          <View style={[styles.nodeFace, { width: size, height: size - chunkyDepth, borderRadius: size / 2, backgroundColor: colors.green500 }]}>
            {node.label === 'Mulai proyek baru' ? (
              <Plus size={30} color={colors.white} strokeWidth={2.5} />
            ) : (
              <Flag size={28} color={colors.white} strokeWidth={2.5} fill={colors.white} />
            )}
          </View>
        </Pressable>
        {/* Label di tengah atas titik, dijaga tetap di dalam layar. */}
        <View style={[styles.tagWrap, { top: y - 82, left: Math.min(Math.max(space.sm, x - 150), width - 300 - space.sm) }]} pointerEvents="none">
          <View style={styles.tagBox}>
            <TagLabel text={node.label} bg={colors.white} fg={colors.ink} />
          </View>
          <View style={[styles.tagTail, { left: x - Math.min(Math.max(space.sm, x - 150), width - 300 - space.sm) - 6 }]} />
        </View>
        <Image source={mascot.tunjukHp} style={[styles.mascot, { top: y - 50, left: Math.min(width - 96, x + 46) }]} resizeMode="contain" accessible={false} />
      </>
    );
  }

  const size = 64;
  const look = {
    done: { face: colors.green500, depth: colors.green700, icon: <Check size={28} color={colors.white} strokeWidth={3} /> },
    // Krem seperti tunggul kayu di referensi, bukan abu datar.
    locked: { face: illu.cream.base, depth: illu.cream.shade, icon: <Lock size={24} color={illu.cream.line} strokeWidth={2.5} /> },
    gift: { face: colors.accentYellow, depth: colors.orange500, icon: <Gift size={28} color={colors.orange700} strokeWidth={2.5} /> },
  }[node.kind];
  const label = node.kind === 'done' ? node.label : node.kind === 'gift' ? `Hadiah target: ${node.label}, ${node.caption}` : 'Proyek berikutnya';
  const shape = node.kind === 'gift' ? radius.tile : size / 2;

  return (
    <>
      <Pressable
        accessibilityRole={node.kind === 'gift' ? 'button' : 'image'}
        accessibilityLabel={label}
        disabled={node.kind !== 'gift'}
        onPress={() => router.navigate('/wallet')}
        style={[styles.nodeDepth, { width: size, height: size, borderRadius: shape, left: x - size / 2, top: y - size / 2 + chunkyDepth / 2, backgroundColor: look.depth }]}
      >
        <View style={[styles.nodeFace, { width: size, height: size - chunkyDepth, borderRadius: shape, backgroundColor: look.face }]}>{look.icon}</View>
      </Pressable>
      {node.kind === 'gift' ? (
        <View style={[styles.giftCaption, { top: y + size / 2 + space.sm, left: x - 90 }]}>
          <Text style={[type.bodyL, { textAlign: 'center' }]} numberOfLines={1}>
            {node.label}
          </Text>
          <Text style={[type.caption, { textAlign: 'center' }]}>{node.caption}</Text>
        </View>
      ) : null}
    </>
  );
}

/** Jalan berliku halus melewati semua titik (kurva kubik dengan kontrol vertikal). */
function road(pts: { x: number; y: number }[]) {
  if (!pts.length) return '';
  let d = `M ${pts[0].x} ${pts[0].y - ROW / 2}`;
  d += ` L ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const my = (a.y + b.y) / 2;
    d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }
  return d;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.green50 },
  map: { backgroundColor: colors.green50, overflow: 'hidden' },
  nodeDepth: { position: 'absolute' },
  nodeFace: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 96, height: 96, borderRadius: radius.pill, backgroundColor: colors.green100 },
  tagWrap: { position: 'absolute', width: 300, alignItems: 'center' },
  tagBox: { borderRadius: radius.iconButton, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  tagTail: { position: 'absolute', bottom: -6, width: 12, height: 12, backgroundColor: colors.white, borderRightWidth: 2, borderBottomWidth: 2, borderColor: colors.line, transform: [{ rotate: '45deg' }] },
  decorImg: { width: 68, height: 68 },
  mascot: { position: 'absolute', width: 84, height: 100 },
  decor: { position: 'absolute', width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  giftCaption: { position: 'absolute', width: 180 },
});
