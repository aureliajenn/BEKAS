import { Circle, Path, Rect } from 'react-native-svg';

import { illu } from '../../theme/tokens';
import { Ground, HI, Illu, type IlluProps, type Tone } from './base';

/** Pin peta pink (bank sampah, lokasi). */
export function MapPin(p: IlluProps) {
  const P = illu.pink;
  return (
    <Illu {...p}>
      <Ground rx={8} />
      <Path d="M24 43 C24 43 9.5 29 9.5 18.5 A14.5 14.5 0 0 1 38.5 18.5 C38.5 29 24 43 24 43 Z" fill={P.base} stroke={P.line} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M30 5.3 A14.5 14.5 0 0 1 38.5 18.5 C38.5 29 24 43 24 43 C29 34 34 22 30 5.3 Z" fill={P.shade} />
      <Path d="M24 43 C24 43 9.5 29 9.5 18.5 A14.5 14.5 0 0 1 38.5 18.5 C38.5 29 24 43 24 43 Z" fill="none" stroke={P.line} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={24} cy={18.5} r={6} fill={illu.highlight} stroke={P.line} strokeWidth={1.8} />
      <Path d="M13.5 14 A11 11 0 0 1 18.5 8" stroke={illu.highlight} strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Illu>
  );
}

function House({ x, y, w, body, roof }: { x: number; y: number; w: number; body: Tone; roof: Tone }) {
  const h = w * 0.72;
  const roofH = w * 0.55;
  return (
    <>
      <Rect x={x} y={y} width={w} height={h} rx={2.5} fill={body.base} stroke={body.line} strokeWidth={1.8} />
      <Rect x={x + w / 2} y={y} width={w / 2} height={h} rx={2.5} fill={body.shade} />
      <Rect x={x} y={y} width={w} height={h} rx={2.5} fill="none" stroke={body.line} strokeWidth={1.8} />
      <Path d={`M${x - 3} ${y + 1} L${x + w / 2} ${y - roofH} L${x + w + 3} ${y + 1} Z`} fill={roof.base} stroke={roof.line} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d={`M${x + w / 2} ${y - roofH} L${x + w + 3} ${y + 1} H${x + w / 2} Z`} fill={roof.shade} />
      <Path d={`M${x - 3} ${y + 1} L${x + w / 2} ${y - roofH} L${x + w + 3} ${y + 1} Z`} fill="none" stroke={roof.line} strokeWidth={1.8} strokeLinejoin="round" />
      <Rect x={x + w / 2 - w * 0.13} y={y + h - w * 0.36} width={w * 0.26} height={w * 0.36} rx={1.5} fill={illu.cream.base} stroke={body.line} strokeWidth={1.4} />
      <Rect x={x + w * 0.12} y={y + h * 0.22} width={w * 0.2} height={w * 0.2} rx={1.2} fill={illu.highlight} fillOpacity={0.9} stroke={body.line} strokeWidth={1.2} />
    </>
  );
}

/** Dua rumah: RW dan komunitas. */
export function HouseGroup(p: IlluProps) {
  return (
    <Illu {...p}>
      <Ground rx={18} />
      <House x={5} y={24} w={17} body={illu.blue} roof={illu.pink} />
      <House x={21} y={21} w={22} body={illu.green} roof={illu.orange} />
      <Rect x={24} y={24} width={5} height={1.8} rx={0.9} fill={illu.highlight} fillOpacity={HI} />
    </Illu>
  );
}
