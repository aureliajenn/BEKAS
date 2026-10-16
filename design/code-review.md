# Code review putaran 2 (ponytail-review)

Cakupan: `apps/mobile/src/app` dan `apps/mobile/src/components` (34 file, 3.534 baris). Titik rollback: tag `pre-cleanup-review` (commit `5994702`).

Cara cek: `tsc --noUnusedLocals --noUnusedParameters`, skrip pencari style tidak terpakai, dan grep pola berulang. **Belum ada kode yang diubah.**

Yang sudah bersih, tidak perlu disentuh:
- Tidak ada style di `StyleSheet` yang didefinisikan tapi tidak dipakai.
- Tidak ada warna hex/rgba hardcode di `src/app` dan komponen, kecuali `shapes.tsx` (temuan 6).
- **Re-render:** React Compiler aktif (`app.json` → `reactCompiler: true`), jadi memo otomatis. Tidak perlu `useMemo`/`useCallback`/`memo` manual; menambahkannya justru bloat.

## Temuan

Format: `file:baris`, tag ponytail, masalah, usulan. Diurutkan dari penghematan terbesar.

| # | File | Tag | Masalah | Usulan | Est. baris |
|---|---|---|---|---|---|
| 1 | `(tabs)/index.tsx:263`, `(tabs)/leaderboard.tsx:154`, `(tabs)/wallet.tsx:231`, `bank-sampah.tsx:100`, `preview.tsx:84`, `idea/[ideaId].tsx:129`, `project/[id]/index.tsx:181`, `rw.tsx:95`, `IdeaCard.tsx:46`, `ItemGrid.tsx:46` | shrink | Pola "tile pastel berisi ilustrasi" (ukuran, radius tile, center, warna, kadang `rotate`) ditulis ulang 10 kali dengan style masing-masing | Satu komponen `IlluTile({ bg, size, tilt, children })` di `Card.tsx`; setiap pemakaian jadi satu tag tanpa style lokal. Ukuran dan rotasi tetap sama per tempat | −20 |
| 2 | `VerifyPanel.tsx:144` (dipakai 3×), `(tabs)/wallet.tsx:244`, `(tabs)/index.tsx:265` | shrink | Kotak merah "danger" (`dangerBg` + radius + padding + teks `dangerFg`) diduplikasi 5 tempat | `DangerBox({ title?, children })` di `Card.tsx`, sejajar `SafetyNote` | −12 |
| 3 | `project/[id]/index.tsx:27`, `project/[id]/guide.tsx:32`, `VerifyPanel.tsx:30` | shrink | `useMutation({ mutationFn: (jobId) => retryJob(id, jobId), onSettled: invalidate })` disalin 3× | Hook `useRetryJob(projectId)` di `lib/useProject.ts` | −6 |
| 4 | `GreenHeader.tsx` (tombol back + 2 lingkaran dekor) | shrink | Tombol kembali GreenHeader dan PlainHeader hampir identik; lingkaran dekor ditulis manual padahal `DecorCircle` sudah ada di `shapes.tsx` | Satu `BackButton({ tone })` internal; ganti 2 `View` lingkaran dengan `DecorCircle` (opacity 0.07 sama) | −8 |
| 5 | `preview.tsx:85-90`, `MeshViewerFrame.tsx:58-62` | shrink | Sudut bingkai scan (4 style + `map`) diduplikasi. Inset/radius beda tipis (16/12 vs 14/10) | `ScanCorners({ inset, radius })` dengan nilai masing-masing dipertahankan supaya tampilan tidak berubah | −4 |
| 6 | `shapes.tsx` | — | 6 warna hex hardcode: `#FFC531`, `#FF5C93`, `#5AA1FF`, `#FFFFFF` (ada padanan persis di tokens) dan `#E0A100`, `#FF8A1F` (tidak ada) | 4 pertama → `colors.accentYellow`, `colors.accentPink`, `illu.blue.base`, `colors.white`. 2 sisanya ditambahkan ke `illu` (`coinRing`, `flameOuter`) supaya warna persis sama | 0 |
| 7 | `MeshViewerFrame.tsx:57`, `preview.tsx:80`, `BottomNav.tsx:90-91` | — | Radius `28` hardcode 4× (DESIGN.md menyebut 28 untuk bingkai viewer), tidak ada di tokens | Tambah `radius.frame: 28` | 0 |
| 8 | `StageStatus.tsx:93` (`borderRadius: 14`), `(tabs)/jalur.tsx:244` (`borderRadius: 48`) | — | Radius = setengah ukuran, ditulis angka | `radius.pill` (hasil sama: lingkaran) | 0 |
| 9 | `MascotBubble.tsx:1`, `shapes.tsx:3`, `StageStatus.tsx:1` | delete | `import React from 'react'` tidak terpakai (JSX runtime otomatis) | Hapus | −3 |
| 10 | `MeshViewerFrame.tsx:5` | delete | `radius` diimpor tapi tidak dipakai | Hapus dari import (atau terpakai lagi lewat temuan 7) | 0 |
| 11 | `(tabs)/index.tsx:42` | delete | Beranda meng-invalidate `['participant']` setiap fokus; padahal satu-satunya tempat yang mengubahnya (`rw.tsx`) sudah meng-invalidate sendiri. Akibatnya ada refetch ekstra setiap pindah tab | Hapus baris itu; `wallet`, `leaderboard`, `done` tetap (diubah di layar lain tanpa invalidate) | −1 |
| 12 | `(tabs)/wallet.tsx` (`WalletScreen` ±180 baris) | yagni→split | Satu fungsi memuat hero, target, streak, daftar hadiah, pengajuan, riwayat, dan sheet konfirmasi | Pecah jadi `RewardRow`, `LedgerCard`, `RedeemSheet` di file yang sama. Tidak mengurangi baris, tapi fungsi utama jadi ±60 baris | 0 |

**Sengaja tidak diusulkan** (rapikan tapi tidak sepadan):
- `screen: { flex: 1, backgroundColor: colors.bg }` muncul di 10 file. Satu baris per file; mengekstraknya menambah import di setiap file.
- `toLocaleString('id-ID')` di 6 tempat sudah satu panggilan stdlib; helper tidak memendekkan apa pun.
- Footer tombol bawah (3 layar) berbeda tipis (`gap`, arah baris); komponen bersama butuh banyak prop.
- `Tile` (Beranda) dan `Stat` (Detail ide) mirip, tapi satu bisa ditekan dan satu tidak; menyatukan butuh cabang.

## Rencana eksekusi setelah disetujui

Satu file/komponen per langkah, urutan supaya setiap commit tetap lolos typecheck:

1. Tokens: `radius.frame`, `illu.coinRing`, `illu.flameOuter` (temuan 6, 7).
2. `Card.tsx`: tambah `IlluTile`, `DangerBox` (1, 2). `shapes.tsx`: warna ke tokens, hapus import React (6, 9).
3. `lib/useProject.ts`: `useRetryJob` (3).
4. Komponen: `GreenHeader` (4), `MeshViewerFrame` + `ScanCorners` (5, 7, 10), `StageStatus` + `MascotBubble` (8, 9), `IdeaCard`, `ItemGrid`, `VerifyPanel` (1, 2, 3).
5. Halaman satu per satu: Beranda, Hasil barang, Detail ide, Panduan, Dompet (+ pecah fungsi, 12), Peringkat, Jalur, Bank sampah, Pilih RW, Pratinjau.

Setelah setiap halaman: `npm run typecheck`, screenshot halaman, dibandingkan dengan screenshot sesudah redesign. Tampilan, logika, API, dan navigasi tidak berubah.

**Estimasi total: −54 baris** (temuan 1–5, 9, 11). Temuan 6–8, 10, 12 untuk konsistensi dan keterbacaan, bukan pengurangan baris.

**Catatan screenshot pembanding:** screenshot "after" putaran redesign tidak tersimpan sebagai file (tidak ada `adb`). Pembandingan akan dilakukan dengan mengambil screenshot sebelum dan sesudah rapikan di sesi yang sama, pada state fixture yang sama.
