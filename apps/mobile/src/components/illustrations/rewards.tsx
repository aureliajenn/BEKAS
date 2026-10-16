import { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { fonts, illu } from '../../theme/tokens';
import { Ground, HI, Illu, type IlluProps } from './base';

const Y = illu.yellow;

/** Satu koin silinder dengan muka di cy. */
function CoinLayer({ cx = 24, cy }: { cx?: number; cy: number }) {
  const l = cx - 13;
  const r = cx + 13;
  return (
    <G>
      <Path d={`M${l} ${cy} V${cy + 4.5} A13 4.8 0 0 0 ${r} ${cy + 4.5} V${cy} Z`} fill={Y.shade} stroke={Y.line} strokeWidth={1.6} />
      <Ellipse cx={cx} cy={cy} rx={13} ry={4.8} fill={Y.base} stroke={Y.line} strokeWidth={1.6} />
      <Ellipse cx={cx} cy={cy} rx={8} ry={2.6} fill="none" stroke={Y.shade} strokeWidth={1.6} />
      <Path d={`M${cx - 9} ${cy - 1.6} Q${cx - 5} ${cy - 3.6} ${cx} ${cy - 3.8}`} stroke={illu.highlight} strokeOpacity={0.6} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </G>
  );
}

/** Tumpukan 3 koin. */
export function CoinStack(p: IlluProps) {
  return (
    <Illu {...p}>
      <Ground rx={15} />
      <CoinLayer cx={23} cy={35} />
      <CoinLayer cx={25.5} cy={27} />
      <CoinLayer cx={23.5} cy={19} />
    </Illu>
  );
}

/** Piala emas di atas alas hijau. */
export function TrophyCup(p: IlluProps) {
  return (
    <Illu {...p}>
      <Ground rx={13} />
      {/* gagang */}
      <Path d="M14 11 C6 11 6 22 15 23" stroke={Y.shade} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M34 11 C42 11 42 22 33 23" stroke={Y.shade} strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* badan piala */}
      <Path d="M13 7 H35 V17 C35 25.5 30 30 24 30 C18 30 13 25.5 13 17 Z" fill={Y.base} stroke={Y.line} strokeWidth={2} />
      <Path d="M24 7 H35 V17 C35 25.5 30 30 24 30 Z" fill={Y.shade} />
      <Path d="M13 7 H35 V17 C35 25.5 30 30 24 30 C18 30 13 25.5 13 17 Z" fill="none" stroke={Y.line} strokeWidth={2} />
      <Path d="M16.5 10 V17 C16.5 20 17.5 22 19 23.5" stroke={illu.highlight} strokeOpacity={HI + 0.1} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      {/* bintang */}
      <Path d="M24 12.5 l1.6 3.3 3.6.5 -2.6 2.5 .6 3.6 -3.2-1.7 -3.2 1.7 .6-3.6 -2.6-2.5 3.6-.5z" fill={illu.highlight} fillOpacity={0.9} />
      {/* tangkai dan alas */}
      <Rect x={21} y={29.5} width={6} height={5} fill={Y.shade} stroke={Y.line} strokeWidth={1.6} />
      <Rect x={14} y={34} width={20} height={5.5} rx={2.5} fill={illu.green.base} stroke={illu.green.line} strokeWidth={1.8} />
      <Rect x={12} y={38.5} width={24} height={5} rx={2.5} fill={illu.green.shade} stroke={illu.green.line} strokeWidth={1.8} />
      <Rect x={16} y={35.3} width={7} height={1.8} rx={0.9} fill={illu.highlight} fillOpacity={HI} />
    </Illu>
  );
}

const MEDAL = { 1: illu.yellow, 2: illu.silver, 3: illu.bronze } as const;

/** Medali dengan pita; rank 1 emas, 2 perak, 3 perunggu. */
export function Medal({ rank = 1, ...p }: IlluProps & { rank?: 1 | 2 | 3 }) {
  const m = MEDAL[rank];
  return (
    <Illu {...p}>
      {/* pita */}
      <Path d="M14 3 H22 L27 18 H19 Z" fill={illu.blue.base} stroke={illu.blue.line} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M34 3 H26 L21 18 H29 Z" fill={illu.blue.shade} stroke={illu.blue.line} strokeWidth={1.6} strokeLinejoin="round" />
      {/* koin medali */}
      <Circle cx={24} cy={30} r={13} fill={m.base} stroke={m.line} strokeWidth={2} />
      <Path d="M34.5 22.5 A13 13 0 0 1 16 40 A13 13 0 0 0 34.5 22.5 Z" fill={m.shade} />
      <Circle cx={24} cy={30} r={13} fill="none" stroke={m.line} strokeWidth={2} />
      <Circle cx={24} cy={30} r={8.5} fill="none" stroke={m.shade} strokeWidth={2} />
      <Path d="M15.5 26 A9 9 0 0 1 21 20.5" stroke={illu.highlight} strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <SvgText x={24} y={34.5} fontSize={12} fontFamily={fonts.body900} fill={m.line} textAnchor="middle">
        {rank}
      </SvgText>
    </Illu>
  );
}

/** Kotak kado pink dengan pita kuning. */
export function GiftBox(p: IlluProps) {
  const P = illu.pink;
  return (
    <Illu {...p}>
      <Ground rx={15} />
      {/* pita simpul */}
      <Path d="M24 15 C18 6 9 9 13.5 14.5 C15.5 16.5 20 16 24 15 Z" fill={Y.base} stroke={Y.line} strokeWidth={1.8} />
      <Path d="M24 15 C30 6 39 9 34.5 14.5 C32.5 16.5 28 16 24 15 Z" fill={Y.shade} stroke={Y.line} strokeWidth={1.8} />
      {/* badan */}
      <Rect x={10} y={22} width={28} height={20} rx={3} fill={P.base} stroke={P.line} strokeWidth={2} />
      <Rect x={24} y={22} width={14} height={20} rx={3} fill={P.shade} />
      <Rect x={10} y={22} width={28} height={20} rx={3} fill="none" stroke={P.line} strokeWidth={2} />
      {/* tutup */}
      <Rect x={8} y={15} width={32} height={9} rx={3} fill={P.base} stroke={P.line} strokeWidth={2} />
      <Rect x={11} y={17} width={9} height={2.2} rx={1.1} fill={illu.highlight} fillOpacity={HI} />
      {/* pita */}
      <Rect x={21} y={15} width={6} height={27} fill={Y.base} stroke={Y.line} strokeWidth={1.6} />
      <Circle cx={24} cy={15} r={3} fill={Y.base} stroke={Y.line} strokeWidth={1.6} />
    </Illu>
  );
}

/** Api besar tiga lapis untuk streak. */
export function FlameBig(p: IlluProps) {
  return (
    <Illu {...p}>
      <Path d="M24 3 C26 11 37 15 37 28 A13 13 0 0 1 11 28 C11 21 15 17 18 15 C18 20 20 22 22 23 C21 15 21 9 24 3 Z" fill={illu.orange.base} stroke={illu.orange.line} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M30 16 C34 20 37 23 37 28 A13 13 0 0 1 26 40.8 C31 37 33 30 30 16 Z" fill={illu.orange.shade} />
      <Path d="M24 20 C26 25 31 27 31 32 A7 7 0 0 1 17 32 C17 28 20 26 21 24 C22 27 23 27 24 27 C23.5 25 23 22.5 24 20 Z" fill={Y.base} stroke={Y.line} strokeWidth={1.4} strokeLinejoin="round" />
      <Ellipse cx={24} cy={34} rx={3} ry={3.6} fill={illu.cream.base} />
      <Path d="M15.5 25 C15.5 22 17 20 18.5 18.8" stroke={illu.highlight} strokeOpacity={0.55} strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Illu>
  );
}
