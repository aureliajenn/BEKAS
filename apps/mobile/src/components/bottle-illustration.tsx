import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export function BottleIllustration({ width = 148, height = 174 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 210" accessibilityElementsHidden>
      <Circle cx="92" cy="108" r="86" fill="#B8EC3D" opacity="0.12" />
      <Path
        d="M70 27h40v22c0 8 5 13 13 20l9 8v94c0 10-8 18-18 18H66c-10 0-18-8-18-18V77l9-8c8-7 13-12 13-20V27Z"
        fill="#B8EC3D"
        fillOpacity="0.16"
        stroke={colors.lime}
        strokeWidth="3"
      />
      <Path d="M69 27h42v14H69z" fill={colors.lime} />
      <Path d="M49 94h82" stroke={colors.mint} strokeOpacity="0.5" strokeWidth="2" />
      <Path d="M54 102h72" stroke={colors.mint} strokeOpacity="0.22" strokeWidth="1" />
      <Path d="M69 111c8-12 17-12 25 0s17 12 25 0" fill="none" stroke={colors.lime} strokeWidth="3" />
      <Path d="M63 153h70" stroke={colors.mint} strokeOpacity="0.28" strokeWidth="1" />
      <Rect x="122" y="38" width="29" height="29" rx="9" fill={colors.lime} />
      <Path d="M131 52h11m-5-5 5 5-5 5" stroke={colors.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
