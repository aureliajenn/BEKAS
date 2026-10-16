import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { illu } from '../../theme/tokens';
import { Ground, HI, Illu, type IlluProps } from './base';

/** Gunting: gagang oranye, bilah perak. */
export function Scissors(p: IlluProps) {
  const S = illu.silver;
  const O = illu.orange;
  return (
    <Illu {...p}>
      <Path d="M20.5 30 L27 5.5 C27.6 3.6 30.5 4.3 30 6.3 L24.5 31 Z" fill={S.base} stroke={S.line} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M27.5 30 L21 5.5 C20.4 3.6 17.5 4.3 18 6.3 L23.5 31 Z" fill={S.shade} stroke={S.line} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={24} cy={22.5} r={2.2} fill={S.line} />
      <Circle cx={15.5} cy={36} r={7} fill="none" stroke={O.line} strokeWidth={7.5} />
      <Circle cx={15.5} cy={36} r={7} fill="none" stroke={O.base} strokeWidth={4.5} />
      <Circle cx={32.5} cy={36} r={7} fill="none" stroke={O.line} strokeWidth={7.5} />
      <Circle cx={32.5} cy={36} r={7} fill="none" stroke={O.shade} strokeWidth={4.5} />
      <Path d="M10.5 33.5 A5.5 5.5 0 0 1 13.5 30.3" stroke={illu.highlight} strokeOpacity={0.6} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Illu>
  );
}

/** Tube lem biru dengan tutup oranye. */
export function GlueTube(p: IlluProps) {
  const B = illu.blue;
  return (
    <Illu {...p}>
      <Ground rx={10} />
      <Rect x={19} y={4} width={10} height={9} rx={2.5} fill={illu.orange.base} stroke={illu.orange.line} strokeWidth={1.8} />
      <Rect x={21} y={12} width={6} height={3} fill={illu.silver.shade} stroke={illu.silver.line} strokeWidth={1.4} />
      <Path d="M14.5 15 H33.5 L31.5 39 H16.5 Z" fill={B.base} stroke={B.line} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M26 15 H33.5 L31.5 39 H26 Z" fill={B.shade} />
      <Path d="M14.5 15 H33.5 L31.5 39 H16.5 Z" fill="none" stroke={B.line} strokeWidth={2} strokeLinejoin="round" />
      <Rect x={16} y={21} width={16} height={10} rx={2} fill={illu.highlight} />
      <Path d="M24 22.8 C26 25.5 27 26.6 27 28 A3 3 0 0 1 21 28 C21 26.6 22 25.5 24 22.8 Z" fill={illu.yellow.base} stroke={illu.yellow.line} strokeWidth={1.2} />
      <Path d="M17.5 17 V20" stroke={illu.highlight} strokeOpacity={HI} strokeWidth={2.2} strokeLinecap="round" />
      <Rect x={15.5} y={38} width={17} height={4.5} rx={1.5} fill={illu.silver.base} stroke={illu.silver.line} strokeWidth={1.6} />
    </Illu>
  );
}

/** Kuas miring dengan ujung cat pink. */
export function PaintBrush(p: IlluProps) {
  return (
    <Illu {...p}>
      <Ellipse cx={12} cy={39} rx={7} ry={4} fill={illu.pink.base} stroke={illu.pink.line} strokeWidth={1.6} />
      <Circle cx={21} cy={42} r={2} fill={illu.pink.base} />
      <G transform="rotate(38 24 24)">
        <Rect x={21} y={1} width={6} height={22} rx={3} fill={illu.orange.base} stroke={illu.orange.line} strokeWidth={1.8} />
        <Rect x={24} y={1} width={3} height={22} rx={1.5} fill={illu.orange.shade} />
        <Rect x={22} y={3} width={1.6} height={10} rx={0.8} fill={illu.highlight} fillOpacity={HI} />
        <Rect x={19.5} y={22} width={9} height={7} rx={1.5} fill={illu.silver.base} stroke={illu.silver.line} strokeWidth={1.6} />
        <Path d="M19.5 29 H28.5 L27.5 38 Q24 44 20.5 38 Z" fill={illu.cream.base} stroke={illu.cream.line} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M20.3 35 H27.7 L27.5 38 Q24 44 20.5 38 Z" fill={illu.pink.shade} />
      </G>
    </Illu>
  );
}

/** Gulungan tali: lilitan tebal dengan guratan serat dan ujung menjuntai. */
export function Rope(p: IlluProps) {
  const C = illu.cream;
  const ring = (rx: number, ry: number) => (
    <>
      <Ellipse cx={24} cy={29} rx={rx} ry={ry} fill="none" stroke={C.line} strokeWidth={7.5} />
      <Ellipse cx={24} cy={29} rx={rx} ry={ry} fill="none" stroke={C.shade} strokeWidth={5} />
      {/* guratan serat supaya terbaca sebagai tali */}
      <Ellipse cx={24} cy={29} rx={rx} ry={ry} fill="none" stroke={C.line} strokeWidth={5} strokeDasharray="1.4 3.2" strokeOpacity={0.55} />
    </>
  );
  return (
    <Illu {...p}>
      <Ground rx={17} />
      <Ellipse cx={24} cy={29} rx={10} ry={6} fill={C.base} />
      {ring(16, 10)}
      {ring(9.5, 5.6)}
      <Path d="M39 31 C43 34 43 39 38.5 41.5" stroke={C.line} strokeWidth={7.5} fill="none" strokeLinecap="round" />
      <Path d="M39 31 C43 34 43 39 38.5 41.5" stroke={C.shade} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M11 25 A14 9 0 0 1 19 20.3" stroke={illu.highlight} strokeOpacity={0.75} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Illu>
  );
}

/** Pot terakota dengan tanaman. */
export function PlantPot(p: IlluProps) {
  const O = illu.orange;
  const G2 = illu.green;
  return (
    <Illu {...p}>
      <Ground rx={12} />
      <Path d="M24 26 V14" stroke={G2.line} strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M24 18 C14 18 11 10 12 6 C19 6 24 10 24 18 Z" fill={G2.base} stroke={G2.line} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M24 15 C33 15 37 8 36 3.5 C29 3.5 24 7 24 15 Z" fill={G2.shade} stroke={G2.line} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M24 22 C30 22 33 18 33 15 C28 15 25 17 24 22 Z" fill={G2.base} stroke={G2.line} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M14 29 H34 L31.5 43 H16.5 Z" fill={O.base} stroke={O.line} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M25 29 H34 L31.5 43 H25 Z" fill={O.shade} />
      <Path d="M14 29 H34 L31.5 43 H16.5 Z" fill="none" stroke={O.line} strokeWidth={2} strokeLinejoin="round" />
      <Rect x={11.5} y={24.5} width={25} height={6.5} rx={3} fill={O.base} stroke={O.line} strokeWidth={2} />
      <Rect x={14} y={26.3} width={7} height={2} rx={1} fill={illu.highlight} fillOpacity={HI} />
    </Illu>
  );
}
