// Path mengasumsikan file ini ada di src/theme/ dan folder assets/ ada di root repo.

export const logo = {
  main: require('../../assets/logo/logo-bekas.png'),
  icon1024: require('../../assets/logo/logo-bekas-1024.png'),
};

export const mascot = {
  menyapa: require('../../assets/maskot/maskot-menyapa.png'),
  tunjukHp: require('../../assets/maskot/maskot-tunjuk-hp.png'),
  scan: require('../../assets/maskot/maskot-scan.png'),
  bingung: require('../../assets/maskot/maskot-bingung.png'),
  bawaBotol: require('../../assets/maskot/maskot-bawa-botol.png'),
  senang: require('../../assets/maskot/maskot-senang.png'),
};

export type MascotPose = keyof typeof mascot;

/** Pose maskot per layar/state, sesuai DESIGN.md bagian 5. */
export const mascotFor = {
  home: 'menyapa',
  photoTips: 'tunjukHp',
  processing: 'scan',
  problem: 'bingung',
  ideaDetail: 'bawaBotol',
  guideTip: 'tunjukHp',
  guideDone: 'senang',
} as const satisfies Record<string, MascotPose>;

export const icon3d = {
  botol: require('../../assets/ikon/icon-botol.png'),
  tongSampah: require('../../assets/ikon/icon-tong-sampah.png'),
  tongBio: require('../../assets/ikon/icon-tong-bio.png'),
  tasDaur: require('../../assets/ikon/icon-tas-daur.png'),
  tasHijau: require('../../assets/ikon/icon-tas-hijau.png'),
  bumi: require('../../assets/ikon/icon-bumi.png'),
  tanganBumi: require('../../assets/ikon/icon-tangan-bumi.png'),
  daun: require('../../assets/ikon/icon-daun.png'),
  perisai: require('../../assets/ikon/icon-perisai.png'),
  tanamanListrik: require('../../assets/ikon/icon-tanaman-listrik.png'),
  panelSurya: require('../../assets/ikon/icon-panel-surya.png'),
  rumah: require('../../assets/ikon/icon-rumah.png'),
  rumahSurya: require('../../assets/ikon/icon-rumah-surya.png'),
  pabrikHijau: require('../../assets/ikon/icon-pabrik-hijau.png'),
  kalender: require('../../assets/ikon/icon-kalender.png'),
  labelEco: require('../../assets/ikon/icon-label-eco.png'),
  pompa: require('../../assets/ikon/icon-pompa.png'),
  gearBumi: require('../../assets/ikon/icon-gear-bumi.png'),
};

/** Tile warna muda untuk IdeaCard, dipakai bergiliran berdasarkan urutan ide. */
export const ideaTiles = [
  { bg: '#D6F5E1', icon: icon3d.tanamanListrik },
  { bg: '#EAF2FE', icon: icon3d.tasDaur },
  { bg: '#FFF6D6', icon: icon3d.tongBio },
] as const;
