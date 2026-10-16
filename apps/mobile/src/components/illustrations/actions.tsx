import { Circle, Path, Rect } from 'react-native-svg';

import { colors, illu } from '../../theme/tokens';
import { HI, Illu, type IlluProps } from './base';

/** Kamera oranye di atas gelembung hijau muda. */
export function CameraBubble(p: IlluProps) {
  const O = illu.orange;
  return (
    <Illu {...p}>
      <Circle cx={24} cy={24} r={22} fill={colors.tileGreen} />
      <Rect x={16} y={11} width={12} height={7} rx={2.5} fill={O.shade} stroke={O.line} strokeWidth={1.8} />
      <Rect x={8} y={15} width={32} height={23} rx={7} fill={O.base} stroke={O.line} strokeWidth={2} />
      <Path d="M33 15 H33 A7 7 0 0 1 40 22 V31 A7 7 0 0 1 33 38 H26 C33 34 35 24 33 15 Z" fill={O.shade} />
      <Rect x={8} y={15} width={32} height={23} rx={7} fill="none" stroke={O.line} strokeWidth={2} />
      <Rect x={11.5} y={18} width={7} height={2.4} rx={1.2} fill={illu.highlight} fillOpacity={HI} />
      <Circle cx={24} cy={26.5} r={8} fill={illu.highlight} stroke={O.line} strokeWidth={2} />
      <Circle cx={24} cy={26.5} r={5} fill={illu.blue.base} />
      <Path d="M27.5 24 A5 5 0 0 1 22 31.3 A5 5 0 0 0 27.5 24 Z" fill={illu.blue.shade} />
      <Circle cx={22.2} cy={24.6} r={1.6} fill={illu.highlight} fillOpacity={0.85} />
      <Rect x={32} y={18.5} width={4.5} height={3} rx={1.5} fill={illu.yellow.base} stroke={illu.yellow.line} strokeWidth={1.2} />
    </Illu>
  );
}

/** Dua foto bertumpuk di atas gelembung biru muda. */
export function GalleryBubble(p: IlluProps) {
  return (
    <Illu {...p}>
      <Circle cx={24} cy={24} r={22} fill={colors.tileBlue} />
      <Rect x={13} y={10} width={25} height={21} rx={4.5} fill={illu.pink.base} stroke={illu.pink.line} strokeWidth={1.8} transform="rotate(10 25.5 20.5)" />
      <Rect x={9} y={15} width={27} height={23} rx={5} fill={illu.highlight} stroke={illu.blue.line} strokeWidth={2} transform="rotate(-6 22.5 26.5)" />
      <Path d="M13 34.5 L20 26 L25 31 L28.5 27.5 L33 33.2 Z" fill={illu.green.base} stroke={illu.green.line} strokeWidth={1.4} strokeLinejoin="round" transform="rotate(-6 22.5 26.5)" />
      <Circle cx={29} cy={21.5} r={3} fill={illu.yellow.base} stroke={illu.yellow.line} strokeWidth={1.2} />
    </Illu>
  );
}

/** Bohlam ide dengan sinar. */
export function IdeaBulb(p: IlluProps) {
  const Y = illu.yellow;
  return (
    <Illu {...p}>
      {[
        'M24 2.5 V6.5',
        'M8.5 9 L11.3 11.8',
        'M39.5 9 L36.7 11.8',
        'M4 22 H8',
        'M40 22 H44',
      ].map((d) => (
        <Path key={d} d={d} stroke={illu.orange.base} strokeWidth={3} strokeLinecap="round" />
      ))}
      <Path d="M24 9 A12.5 12.5 0 0 1 31.5 31.4 V33 H16.5 V31.4 A12.5 12.5 0 0 1 24 9 Z" fill={Y.base} stroke={Y.line} strokeWidth={2} />
      <Path d="M30 11.5 A12.5 12.5 0 0 1 31.5 31.4 V33 H24 C30 28 33 20 30 11.5 Z" fill={Y.shade} />
      <Path d="M24 9 A12.5 12.5 0 0 1 31.5 31.4 V33 H16.5 V31.4 A12.5 12.5 0 0 1 24 9 Z" fill="none" stroke={Y.line} strokeWidth={2} />
      <Path d="M20 27 C20 22 22 22 24 25 C26 22 28 22 28 27" stroke={illu.orange.shade} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M15.5 18 A9 9 0 0 1 20 12.5" stroke={illu.highlight} strokeOpacity={0.65} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Rect x={17} y={33} width={14} height={4} rx={2} fill={illu.silver.base} stroke={illu.silver.line} strokeWidth={1.6} />
      <Rect x={18.5} y={37} width={11} height={4} rx={2} fill={illu.silver.shade} stroke={illu.silver.line} strokeWidth={1.6} />
      <Rect x={21} y={41} width={6} height={3} rx={1.5} fill={illu.silver.line} />
    </Illu>
  );
}

/** Lencana bulat hijau dengan centang tebal. */
export function CheckBadge(p: IlluProps) {
  const G = illu.green;
  return (
    <Illu {...p}>
      <Circle cx={24} cy={24} r={18} fill={G.base} stroke={G.line} strokeWidth={2} />
      <Path d="M37 15 A18 18 0 0 1 14 39 A18 18 0 0 0 37 15 Z" fill={G.shade} />
      <Circle cx={24} cy={24} r={18} fill="none" stroke={G.line} strokeWidth={2} />
      <Path d="M11.5 20 A13 13 0 0 1 18 11.5" stroke={illu.highlight} strokeOpacity={0.55} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M16 24.5 L21.5 30 L32.5 18.5" stroke={illu.highlight} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M41 7 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1z" fill={illu.yellow.base} />
      <Circle cx={6.5} cy={38} r={1.8} fill={illu.pink.base} />
    </Illu>
  );
}

/** Perisai oranye dengan tanda seru (catatan keamanan). */
export function ShieldWarning(p: IlluProps) {
  const O = illu.orange;
  return (
    <Illu {...p}>
      <Path d="M24 4 L39 9.5 V22 C39 32 32 39.5 24 43 C16 39.5 9 32 9 22 V9.5 Z" fill={O.base} stroke={O.line} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M24 4 L39 9.5 V22 C39 32 32 39.5 24 43 Z" fill={O.shade} />
      <Path d="M24 4 L39 9.5 V22 C39 32 32 39.5 24 43 C16 39.5 9 32 9 22 V9.5 Z" fill="none" stroke={O.line} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M13 12.5 V21" stroke={illu.highlight} strokeOpacity={HI + 0.1} strokeWidth={2.6} strokeLinecap="round" />
      <Rect x={21.5} y={13} width={5} height={14} rx={2.5} fill={illu.highlight} />
      <Circle cx={24} cy={32.5} r={2.8} fill={illu.highlight} />
    </Illu>
  );
}

/** Jam beker biru. */
export function Clock(p: IlluProps) {
  const B = illu.blue;
  return (
    <Illu {...p}>
      <Path d="M14 41 L11 44.5 M34 41 L37 44.5" stroke={B.line} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={12} cy={10} r={5} fill={illu.orange.base} stroke={illu.orange.line} strokeWidth={1.8} />
      <Circle cx={36} cy={10} r={5} fill={illu.orange.base} stroke={illu.orange.line} strokeWidth={1.8} />
      <Circle cx={24} cy={26} r={17} fill={B.base} stroke={B.line} strokeWidth={2} />
      <Path d="M36 14 A17 17 0 0 1 14 40 A17 17 0 0 0 36 14 Z" fill={B.shade} />
      <Circle cx={24} cy={26} r={17} fill="none" stroke={B.line} strokeWidth={2} />
      <Circle cx={24} cy={26} r={12} fill={illu.highlight} stroke={B.line} strokeWidth={1.8} />
      {[0, 90, 180, 270].map((deg) => (
        <Circle key={deg} cx={24 + 9 * Math.sin((deg * Math.PI) / 180)} cy={26 - 9 * Math.cos((deg * Math.PI) / 180)} r={1.2} fill={B.line} />
      ))}
      <Path d="M24 26 V19 M24 26 L29 29" stroke={B.line} strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={24} cy={26} r={1.8} fill={illu.orange.shade} />
      <Path d="M10.5 22 A14 14 0 0 1 15 14" stroke={illu.highlight} strokeOpacity={0.55} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Illu>
  );
}
