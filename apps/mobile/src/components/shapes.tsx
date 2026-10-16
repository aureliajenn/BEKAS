// Shape dekoratif BEKAS, digambar dengan react-native-svg (tanpa file gambar).
// Pakai untuk koin, api, bintang, kilau, konfeti, garis putus-putus, dan dekor header.
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Line, Rect } from 'react-native-svg';
import { colors, fonts, illu, radius, type } from '../theme/tokens';

type ShapeProps = { size?: number; color?: string; style?: StyleProp<ViewStyle> };

/** Koin kuning dengan cincin dalam. */
export function Coin({ size = 20, style }: ShapeProps) {
  return (
    <View style={style} accessible={false}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} fill={colors.accentYellow} />
        <Circle cx={12} cy={12} r={6.5} fill="none" stroke={illu.coinRing} strokeWidth={2} />
        <Path d="M8.5 8.5a5 5 0 0 1 3.5-2" stroke={colors.white} strokeOpacity={0.7} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

/** Api dua lapis (oranye + kuning). */
export function Flame({ size = 20, style }: ShapeProps) {
  return (
    <View style={style} accessible={false}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill={illu.flameOuter} />
        <Path d="M12 13c1.5 1.5 3 2.5 3 4.5a3 3 0 0 1-6 0c0-1.5 1.5-3 3-4.5z" fill={colors.accentYellow} />
      </Svg>
    </View>
  );
}

/** Bintang lima sudut membulat. */
export function Star({ size = 20, color = colors.accentYellow, style }: ShapeProps) {
  return (
    <View style={style} accessible={false}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
          fill={color}
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/** Kilau empat sudut, untuk aksen di sekitar ikon atau angka hadiah. */
export function Sparkle({ size = 16, color = colors.white, style }: ShapeProps) {
  return (
    <View style={style} accessible={false}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 1c.8 5.5 2.5 7.2 10 11-7.5 3.8-9.2 5.5-10 11-.8-5.5-2.5-7.2-10-11 7.5-3.8 9.2-5.5 10-11z" fill={color} />
      </Svg>
    </View>
  );
}

/** Lingkaran dekor transparan untuk header hijau. Taruh dengan position absolute. */
export function DecorCircle({ size = 240, opacity = 0.07, style }: { size?: number; opacity?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: `rgba(255,255,255,${opacity})` }, style]}
    />
  );
}

/** Sudut bingkai ala scan di atas foto/viewer. Taruh di dalam parent position relative. */
export function ScanCorners({ size, inset, rounded }: { size: number; inset: number; rounded: number }) {
  const edge = { position: 'absolute', width: size, height: size, borderColor: colors.green400, zIndex: 2 } as const;
  return (
    <>
      <View pointerEvents="none" style={[edge, { top: inset, left: inset, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: rounded }]} />
      <View pointerEvents="none" style={[edge, { top: inset, right: inset, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: rounded }]} />
      <View pointerEvents="none" style={[edge, { bottom: inset, left: inset, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: rounded }]} />
      <View pointerEvents="none" style={[edge, { bottom: inset, right: inset, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: rounded }]} />
    </>
  );
}

/** Garis putus-putus horizontal (penanda, pemisah, atau garis panduan di atas gambar). */
export function DashedLine({
  width,
  color = colors.orange500,
  thickness = 4,
  dash = 10,
  gap = 8,
  style,
}: { width: number; color?: string; thickness?: number; dash?: number; gap?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} pointerEvents="none">
      <Svg width={width} height={thickness}>
        <Line x1={0} y1={thickness / 2} x2={width} y2={thickness / 2} stroke={color} strokeWidth={thickness} strokeDasharray={`${dash} ${gap}`} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** Label kecil bergaya pill, untuk ditempel di atas gambar (overlay). */
export function TagLabel({ text, bg = colors.orange500, fg = colors.white, style }: { text: string; bg?: string; fg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      <Text style={[type.pill, { color: fg, fontFamily: fonts.body900 }]}>{text}</Text>
    </View>
  );
}

type ConfettiPiece = { kind: 'star' | 'dot' | 'square' | 'sparkle'; x: number; y: number; size: number; color: string; rotate?: number };

/** Konfeti statis. Koordinat x/y dalam persen terhadap container. */
export function Confetti({ pieces = DEFAULT_CONFETTI }: { pieces?: ConfettiPiece[] }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const pos: ViewStyle = { position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: [{ rotate: `${p.rotate ?? 0}deg` }] };
        if (p.kind === 'star') return <Star key={i} size={p.size} color={p.color} style={pos} />;
        if (p.kind === 'sparkle') return <Sparkle key={i} size={p.size} color={p.color} style={pos} />;
        if (p.kind === 'square')
          return (
            <View key={i} style={pos}>
              <Svg width={p.size} height={p.size}><Rect width={p.size} height={p.size} rx={p.size / 4} fill={p.color} /></Svg>
            </View>
          );
        return <View key={i} style={[pos, { width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: p.color }]} />;
      })}
    </View>
  );
}

const DEFAULT_CONFETTI: ConfettiPiece[] = [
  { kind: 'star', x: 10, y: 12, size: 26, color: colors.accentYellow, rotate: -12 },
  { kind: 'sparkle', x: 82, y: 18, size: 20, color: colors.white },
  { kind: 'dot', x: 72, y: 8, size: 12, color: colors.accentPink },
  { kind: 'square', x: 18, y: 38, size: 12, color: illu.blue.base, rotate: 20 },
  { kind: 'star', x: 86, y: 40, size: 18, color: colors.white, rotate: 15 },
  { kind: 'dot', x: 6, y: 52, size: 9, color: colors.accentYellow },
];

const styles = StyleSheet.create({
  tag: { borderRadius: radius.iconButton - 4, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
});
