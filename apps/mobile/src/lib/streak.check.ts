// Jalankan: npm run check
import assert from 'node:assert/strict';

import { weekIndex, weeklyStreak } from './streak.ts';

// Kamis 15 Okt 2026 10.00 WIB.
const now = Date.parse('2026-10-15T03:00:00Z');

// Senin 00.00 WIB dan Minggu 23.59 WIB sebelumnya beda minggu.
assert.equal(weekIndex(Date.parse('2026-10-12T00:00:00+07:00')), weekIndex(now));
assert.equal(weekIndex(Date.parse('2026-10-11T23:59:00+07:00')), weekIndex(now) - 1);

// Kosong.
assert.deepEqual(weeklyStreak([], now), { streak: 0, thisWeek: false });

// Minggu ini + dua minggu sebelumnya = 3.
assert.deepEqual(
  weeklyStreak(['2026-10-13T05:00:00Z', '2026-10-06T05:00:00Z', '2026-09-29T05:00:00Z'], now),
  { streak: 3, thisWeek: true },
);

// Minggu ini belum ada, minggu lalu ada: streak belum putus.
assert.deepEqual(weeklyStreak(['2026-10-06T05:00:00Z', '2026-09-30T05:00:00Z'], now), { streak: 2, thisWeek: false });

// Ada minggu bolong: hanya dihitung sampai bolongnya.
assert.deepEqual(weeklyStreak(['2026-10-14T05:00:00Z', '2026-09-23T05:00:00Z'], now), { streak: 1, thisWeek: true });

// Dua proyek di minggu yang sama tetap satu minggu.
assert.deepEqual(weeklyStreak(['2026-10-13T05:00:00Z', '2026-10-14T05:00:00Z'], now), { streak: 1, thisWeek: true });

// Terakhir dua minggu lalu: putus.
assert.deepEqual(weeklyStreak(['2026-09-29T05:00:00Z'], now), { streak: 0, thisWeek: false });

console.log('streak.check ok');
