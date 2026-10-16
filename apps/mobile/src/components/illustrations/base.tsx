// Fondasi ilustrasi BEKAS: viewBox 48×48, bentuk gemuk, 3 tone (base, shade, highlight putih).
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';

import { illu } from '../../theme/tokens';

export type IlluProps = { size?: number; style?: StyleProp<ViewStyle> };
/** Tiga tone satu warna ilustrasi. */
export type Tone = { base: string; shade: string; line: string };

/** Bungkus SVG 48×48; ilustrasi bersifat dekoratif (disembunyikan dari pembaca layar). */
export function Illu({ size = 48, style, children }: IlluProps & { children: ReactNode }) {
  return (
    <View style={style} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 48 48">
        {children}
      </Svg>
    </View>
  );
}

/** Bayangan elips di bawah objek berdiri (trofi, pot, kado). */
export const Ground = ({ rx = 14, cy = 44.5 }: { rx?: number; cy?: number }) => (
  <Ellipse cx={24} cy={cy} rx={rx} ry={2.6} fill={illu.ground} />
);

/** Opacity highlight kiri atas. */
export const HI = 0.45;
