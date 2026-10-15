import Svg, { Circle, Path } from 'react-native-svg';

export function WaveLines() {
  return (
    <Svg
      accessibilityElementsHidden
      pointerEvents="none"
      style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
      viewBox="0 0 390 380"
      preserveAspectRatio="xMidYMid slice"
    >
      <Circle cx="342" cy="42" r="92" fill="#DDF3EC" opacity="0.055" />
      <Circle cx="10" cy="348" r="64" fill="#B8EC3D" opacity="0.07" />
      {[0, 17, 34, 51].map((offset) => (
        <Path
          key={offset}
          d={`M-35 ${290 + offset} C55 ${150 + offset}, 103 ${345 + offset}, 196 ${218 + offset} S324 ${250 + offset}, 426 ${104 + offset}`}
          fill="none"
          stroke="#DDF3EC"
          strokeOpacity="0.14"
          strokeWidth="1"
        />
      ))}
    </Svg>
  );
}
