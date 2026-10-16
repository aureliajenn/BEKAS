# Redesign pass: semua halaman BEKAS

Kamu akan memperbaiki tampilan SEMUA halaman app di `apps/mobile`. Target: terasa seperti app edukasi yang playful dan kaya ilustrasi (lihat `design/references/`), bukan daftar kartu putih berisi teks. Kerjakan bertahap sesuai fase di bawah. Jangan lompat fase.

## Aturan tetap

- Pakai skill `bekas-ui-craft`. Baca `DESIGN.md` (terutama bagian 2b), `CLAUDE.md`, dan buka SEMUA gambar di `design/references/` dengan Read sebelum mulai.
- **Jangan ubah logika, API, state, atau navigasi.** Yang diubah hanya tampilan (JSX layout, style, komponen visual baru).
- Aturan PRD tetap berlaku: tanpa persentase palsu untuk proses backend, tanpa klaim ukuran/jenis plastik/dampak lingkungan, maskot maksimal satu per layar, fixture berlabel "Contoh tersimpan".
- Kalau menemukan fitur yang kelihatannya bertentangan dengan PRD, jangan dihapus. Catat saja di laporan.
- Semua warna dari `theme/tokens.ts`. Kalau butuh warna baru untuk ilustrasi, tambahkan ke tokens dulu dengan nama yang jelas.

## Fase 0: Audit (jangan ubah kode dulu)

1. Buka setiap halaman di emulator dan ambil screenshot dengan `bash .claude/skills/bekas-ui-craft/scripts/screenshot.sh <nama>-before`. Halaman: semua route di `src/app` (tabs: beranda, jalur, leaderboard, wallet; lalu preview, project/[id], idea/[ideaId], guide, bank-sampah, rw). Pakai fixture untuk memicu state yang butuh data.
2. Buka setiap screenshot dengan Read. Nilai 1 sampai 5 untuk: (a) daya tarik visual, (b) kekayaan ilustrasi, (c) variasi warna, (d) hierarki, (e) kemiripan rasa dengan referensi Pidu.
3. Tulis `design/audit.md`: tabel skor per halaman + 3 masalah terbesar per halaman, ditulis spesifik (contoh: "Kartu Dompet cuma teks angka di kartu putih, tidak ada visual koin").
4. Tunjukkan ringkasan audit ke saya, lalu lanjut ke Fase 1.

## Fase 1: Bangun kit ilustrasi dulu

Masalah utama sekarang: halaman hanya memakai ikon garis dan beberapa PNG. Buat ilustrasi SVG sendiri dengan `react-native-svg`.

Buat folder `src/components/illustrations/` berisi **minimal 16 ilustrasi** berikut (satu komponen per file atau dikelompokkan rapi, semua menerima prop `size`):

| Nama | Dipakai di |
|---|---|
| `CoinStack` | tumpukan 3 koin, Dompet dan kartu saldo |
| `TrophyCup` | Leaderboard, juara RW |
| `Medal` (prop `rank` 1/2/3: emas/perak/perunggu) | daftar peringkat |
| `GiftBox` | hadiah, tukar poin |
| `CameraBubble` | tombol/kartu Foto barang |
| `GalleryBubble` | Pilih dari galeri |
| `IdeaBulb` | judul "3 ide untukmu" |
| `Scissors` | alat: gunting/cutter |
| `GlueTube` | alat: lem |
| `PaintBrush` | alat: cat/kuas |
| `Rope` | bahan: tali |
| `PlantPot` | hasil kerajinan, empty state |
| `MapPin` | Bank sampah |
| `HouseGroup` | RW / komunitas |
| `CheckBadge` | langkah selesai, verifikasi disetujui |
| `ShieldWarning` | catatan keamanan |
| `Flame` versi besar | streak (kalau fitur itu ada) |
| `Clock` | durasi |

Gaya wajib (supaya konsisten dengan ikon 3D di `assets/ikon`):
- viewBox 0 0 48 48, bentuk bulat dan gemuk, tanpa garis tipis.
- Setiap bentuk punya 3 tone: warna dasar, sisi bayangan (lebih gelap sekitar 15 sampai 20%) di bagian bawah/kanan, dan highlight putih opacity 0.35 sampai 0.5 di kiri atas. Ini yang bikin terlihat "3D".
- Outline opsional 2px warna gelap dari keluarga warnanya (bukan hitam).
- Palet: tokens (hijau, oranye, kuning koin, biru, pink, krem #FFF1CF untuk kertas/kayu).
- Tambahkan bayangan elips abu transparan di bawah objek berdiri (trofi, pot, kado).

Lalu buat halaman `src/app/dev/illustrations.tsx` yang menampilkan semua ilustrasi dalam grid dengan namanya. Screenshot, buka, dan perbaiki yang jelek (tidak terbaca bentuknya, proporsi aneh, terlalu flat) sebelum lanjut. Tunjukkan screenshot galeri ke saya.

## Fase 2: Redesign per halaman

Kerjakan satu halaman per putaran dengan urutan: Beranda, Hasil barang, Detail ide, Panduan, Dompet, Leaderboard, Jalur, Bank sampah, Pilih RW, Pratinjau.

Setiap halaman WAJIB punya:
1. **Satu momen visual utama** di atas lipatan: komposisi berlapis (latar pastel + ilustrasi/maskot besar + aksen Star/Sparkle), bukan cuma judul.
2. **Tidak ada kartu yang isinya teks saja.** Setiap kartu punya elemen visual di kiri atau atas: ilustrasi, ikon 3D di tile pastel, atau angka besar dengan ilustrasi kecil.
3. **Minimal 2 warna pastel berbeda** terlihat, dan maksimal satu tombol hijau (lihat DESIGN.md 2b).
4. **Angka penting** (saldo, peringkat, jumlah langkah, durasi) pakai Fredoka besar, didampingi ilustrasi kecil (CoinStack, Medal, Clock).
5. **Empty/loading/error state** juga diberi ilustrasi + maskot yang sesuai, bukan teks polos.
6. **Detail kecil yang bikin hidup**: badge melengkung di pojok kartu, pill berwarna, divider putus-putus, nomor dalam lingkaran berwarna, tile yang sedikit diputar (rotate -4 sampai 4 derajat).

Contoh arah per halaman (boleh dikembangkan):
- **Beranda**: header hijau dengan maskot besar keluar dari header; kartu utama latar putih dengan `CameraBubble` besar di kiri + CTA oranye; kartu Dompet latar tileYellow dengan `CoinStack`; kartu Leaderboard latar tileBlue dengan `TrophyCup`; Bank sampah dengan `MapPin` di tilePink.
- **Hasil barang**: viewer mesh dalam kartu dengan sudut bingkai dekoratif; judul "3 ide untukmu" dengan `IdeaBulb`; IdeaCard dengan tile pastel bergiliran + pill durasi ber-ikon `Clock`.
- **Detail ide**: alat dan bahan ditampilkan sebagai grid tile ilustrasi (Scissors, GlueTube, Rope, PaintBrush), bukan bullet list; SafetyNote dengan `ShieldWarning`.
- **Panduan**: nomor langkah dalam lingkaran berwarna bergiliran; "hasil yang diharapkan" di kartu noteYellow; langkah selesai memunculkan `CheckBadge`; kartu selesai dengan Confetti + maskot senang.
- **Dompet**: hero saldo besar dengan CoinStack + Sparkle; hadiah sebagai kartu dengan `GiftBox` warna bergiliran; riwayat dengan ikon bulat +/- berwarna.
- **Leaderboard**: podium 3 besar (tinggi berbeda, Medal emas/perak/perunggu) di atas daftar; RW sendiri disorot tilePink; kartu tantangan dengan `TrophyCup`.
- **Bank sampah / Pilih RW**: setiap item dengan `MapPin`/`HouseGroup` di tile pastel bergiliran, pill jenis sampah warna-warni.

Setelah setiap halaman:
1. Screenshot `<nama>-after`, buka dengan Read, bandingkan dengan screenshot `-before` dan referensi Pidu.
2. Nilai ulang dengan rubrik Fase 0. **Target minimal 4 di semua aspek.** Kalau belum, perbaiki (maksimal 3 putaran) dan sebutkan apa yang diubah.
3. Jalankan `npm run typecheck` di `apps/mobile`. Harus lolos.

## Fase 3: Laporan

Update `design/audit.md` dengan kolom skor sesudah, lalu laporkan ke saya:
- tabel skor sebelum vs sesudah per halaman,
- daftar ilustrasi baru,
- path screenshot after untuk setiap halaman,
- hal yang masih kurang atau butuh keputusan saya.
