// Streak mingguan (PRD 17.2, AC15). Fungsi murni: dipakai fixture dan bisa diuji langsung dengan Node.

const DAY = 86_400_000;
const WIB = 7 * 3_600_000;

/** Indeks minggu Senin–Minggu dalam WIB. 1 Jan 1970 hari Kamis, jadi +3 hari menggeser awal minggu ke Senin. */
export const weekIndex = (ms: number) => Math.floor((Math.floor((ms + WIB) / DAY) + 3) / 7);

/**
 * Jumlah minggu berturut-turut yang punya minimal satu proyek terverifikasi.
 * Minggu berjalan yang masih kosong belum memutus streak (dihitung mulai minggu lalu).
 */
export function weeklyStreak(verifiedAt: string[], now: number): { streak: number; thisWeek: boolean } {
  const weeks = new Set(verifiedAt.map((iso) => weekIndex(Date.parse(iso))));
  const current = weekIndex(now);
  const thisWeek = weeks.has(current);
  let week = thisWeek ? current : current - 1;
  let streak = 0;
  while (weeks.has(week)) {
    streak++;
    week--;
  }
  return { streak, thisWeek };
}
