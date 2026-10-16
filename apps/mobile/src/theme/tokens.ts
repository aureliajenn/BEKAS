// BEKAS design tokens. Sumber kebenaran untuk semua warna, radius, spasi, dan tipografi.
// Jangan menambah warna atau font di luar file ini.

export const colors = {
  green500: '#1E9E54',
  green700: '#137A3E',
  green400: '#3CC873',
  green100: '#D6F5E1',
  green50: '#EEFAF2',
  bg: '#F3FAF5',

  orange500: '#E8740C',
  orange700: '#B85A05',

  blue600: '#2563C9',
  blue50: '#EAF2FE',

  warnFg: '#C2410C',
  warnBg: '#FFF1E6',
  dangerFg: '#B42318',
  dangerBg: '#FDECEA',

  ink: '#1D2B22',
  muted: '#5E6E64',
  iconIdle: '#8A9A90',
  line: '#E2EBE5',
  cardShadow: '#DCE8E0',
  selectedShadow: '#B9EBCB',
  white: '#FFFFFF',

  pillEasyBg: '#D6F5E1',
  pillEasyFg: '#137A3E',
  pillMediumBg: '#FFEBD6',
  pillMediumFg: '#A34E00',
  pillHardBg: '#FDECEA',
  pillHardFg: '#B42318',
  pillCachedBg: '#FFF6D6',
  pillCachedFg: '#8A6400',

  // Pastel aksen: sumber warna utama selain hijau (tile ikon, kartu info). Lihat DESIGN.md bagian 2b.
  tileGreen: '#D6F5E1',
  tileBlue: '#EAF2FE',
  tileYellow: '#FFF6D6',
  tilePink: '#FFE9F0',
  noteYellowBg: '#FFF4E5',
  noteYellowBorder: '#FFD9A8',
  accentYellow: '#FFC531',
  accentPink: '#FF5C93',

  brandLime: '#B5E43B', // khusus logo dan splash
} as const;

/**
 * Palet ilustrasi SVG (src/components/illustrations). Tiap warna punya 3 tone:
 * base (muka), shade (sisi bayangan ±15–20% lebih gelap), line (outline gelap sekeluarga, bukan hitam).
 */
export const illu = {
  green: { base: '#3CC873', shade: '#1E9E54', line: '#137A3E' },
  orange: { base: '#FF9A3D', shade: '#E8740C', line: '#B85A05' },
  yellow: { base: '#FFC531', shade: '#E8A400', line: '#A87600' },
  blue: { base: '#5AA1FF', shade: '#2F7FE8', line: '#2563C9' },
  pink: { base: '#FF8DB4', shade: '#FF5C93', line: '#C7346A' },
  cream: { base: '#FFF1CF', shade: '#F2D79E', line: '#C49A55' },
  silver: { base: '#E3E9EF', shade: '#B4C0CC', line: '#7C8894' },
  bronze: { base: '#EDA766', shade: '#C97B3A', line: '#8E5426' },
  highlight: '#FFFFFF',
  ground: 'rgba(29,43,34,0.12)',
} as const;

export const radius = {
  pill: 999,
  sheet: 32,
  header: 32,
  card: 24,
  tile: 20,
  button: 18,
  iconButton: 14,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 20,
} as const;

/** Tinggi bayangan padat (chunky) untuk tombol dan kartu. */
export const chunkyDepth = 5;

export const touch = {
  min: 44,
  primaryButton: 56,
} as const;

export const fonts = {
  display600: 'Fredoka_600SemiBold',
  display700: 'Fredoka_700Bold',
  body700: 'Nunito_700Bold',
  body800: 'Nunito_800ExtraBold',
  body900: 'Nunito_900Black',
} as const;

export const type = {
  display: { fontFamily: fonts.display700, fontSize: 34, lineHeight: 38, color: colors.ink },
  h1: { fontFamily: fonts.display700, fontSize: 28, lineHeight: 32, color: colors.ink },
  h2: { fontFamily: fonts.display700, fontSize: 24, lineHeight: 28, color: colors.ink },
  h3: { fontFamily: fonts.display600, fontSize: 19, lineHeight: 24, color: colors.ink },
  button: { fontFamily: fonts.body900, fontSize: 18, lineHeight: 22 },
  bodyL: { fontFamily: fonts.body800, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.body700, fontSize: 15, lineHeight: 22, color: colors.ink },
  caption: { fontFamily: fonts.body700, fontSize: 13, lineHeight: 18, color: colors.muted },
  overline: { fontFamily: fonts.body900, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' as const },
  pill: { fontFamily: fonts.body800, fontSize: 12, lineHeight: 16 },
} as const;

export const theme = { colors, radius, space, chunkyDepth, touch, fonts, type } as const;
export type Theme = typeof theme;
