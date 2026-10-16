# BEKAS UI Style Guide (untuk Claude Code)

> Dokumen ini mengatur **tampilan**. Alur, scope, dan state mengikuti **PRD.md** (v1.2). Kalau ada konflik, PRD yang menang.
> Stack: React Native + Expo + TypeScript + Expo Router, target Android.
> Aset ada di `apps/mobile/assets/`. Komponen dan tema aktif ada di `apps/mobile/src/` (lihat bagian 9).

## 1. Konsep

BEKAS membantu pemula mengubah botol dan wadah plastik bekas menjadi barang berguna: foto barang, lihat mesh 3D yang bisa diputar, pilih satu dari 3 ide, lalu ikuti panduan bergambar.

Gaya visual: **playful edu-app**, terinspirasi UI kit "Pidu". Ciri utamanya:

- Hijau segar sebagai warna dominan, header hijau dengan sudut bawah membulat.
- Tombol **chunky**: warna solid dengan bayangan padat di bawah (5px, warna lebih gelap), seperti tombol mainan.
- Kartu putih, sudut sangat bulat (22 sampai 26), border 2px abu kehijauan.
- Maskot kucing biru 3D dan ikon 3D eco.
- Tetap jujur: tidak ada persentase kemajuan palsu, tidak ada klaim ukuran, jenis resin, atau dampak lingkungan yang tidak diukur (PRD bagian 3, 4, 15).

Canvas Design (prototype di Claude) hanya acuan **gaya visual**. Alurnya sudah diganti oleh bagian 6 di bawah. Sejak PRD 1.3, **poin dan leaderboard RW dibangun** (bagian 6b). Streak, jalur level, poin per ide, misi harian, dan statistik "plastik terselamatkan" di canvas tetap **tidak dibangun**.

## 2. Design tokens

Sumber kebenaran: `apps/mobile/src/theme/tokens.ts`. Ringkasan:

| Token | Hex | Pakai di |
|---|---|---|
| green500 | #1E9E54 | Primary: tombol, header, tab aktif. Teks putih aman (bold, 18px ke atas) |
| green700 | #137A3E | Bayangan tombol primary, teks hijau di atas putih |
| green400 | #3CC873 | Border terpilih, status sukses, aksen. **Jangan** taruh teks putih di atasnya |
| green100 | #D6F5E1 | Tile ikon, pill "Mudah" |
| green50 | #EEFAF2 | Latar kartu info |
| bg | #F3FAF5 | Latar layar |
| orange500 | #E8740C | CTA spesial (Foto barang, Buat panduan). Maksimal satu per layar |
| orange700 | #B85A05 | Bayangan CTA oranye |
| blue600 | #2563C9 | Teks info, label sekunder |
| blue50 | #EAF2FE | Bubble maskot, kartu info netral |
| warn | #C2410C pada #FFF1E6 | Peringatan keamanan (tepi tajam, dll.) |
| danger | #B42318 pada #FDECEA | Status gagal |
| ink | #1D2B22 | Teks utama |
| muted | #5E6E64 | Teks sekunder |
| iconIdle | #8A9A90 | Ikon tidak aktif |
| line | #E2EBE5 | Border kartu, track |
| brandLime | #B5E43B | **Khusus** logo dan splash, bukan untuk tombol atau teks |

Radius: pill 999, sheet 32, header bawah 32, kartu 24, tile 20, tombol 18, tombol ikon 14.
Spasi: kelipatan 4 (4, 8, 12, 16, 20, 24, 32). Padding samping layar 20.
Touch target minimal 44; tombol utama tinggi 56.

## 3. Tipografi

Dua font saja, dimuat dengan `@expo-google-fonts/fredoka` dan `@expo-google-fonts/nunito`. Di React Native, ketebalan diatur lewat `fontFamily` (misalnya `Nunito_900Black`), bukan `fontWeight`.

| Peran | Font | Ukuran |
|---|---|---|
| display | Fredoka 700 | 34 |
| h1 (judul header) | Fredoka 700 | 28 |
| h2 | Fredoka 700 | 24 |
| h3 (judul kartu/section) | Fredoka 600 | 19 |
| button | Nunito 900 | 18 |
| bodyL | Nunito 800 | 16 |
| body | Nunito 700 | 15, line-height 22 |
| caption | Nunito 700 | 13, warna muted |
| overline | Nunito 900 | 12, letter-spacing 1.2, kapital |
| pill | Nunito 800 | 12 |

## 4. Komponen

**ChunkyButton** (`apps/mobile/src/components/ChunkyButton.tsx`). Variant: `primary`, `cta`, `secondary`; state nonaktif melalui prop `disabled`. Tinggi 56, radius 18, lebar penuh di bawah layar. Saat ditekan, muka tombol turun 5px menutup bayangan.

**GreenHeader**: latar green500, radius bawah 32, padding atas mengikuti safe area + 16, samping 20. Dekor 1 sampai 2 lingkaran putih opacity 6 sampai 8%. Boleh ada maskot "nongol" di kanan bawah.

**Card**: latar putih, border 2px line, radius 24, padding 16, bayangan padat `0 5px 0 #DCE8E0` (di RN: View latar #DCE8E0 di belakang, offset 5px, sama seperti ChunkyButton). Kartu terpilih: border green400 dan bayangan #B9EBCB.

**IdeaCard**: tile ikon 3D 72 di kiri (warna muda), judul h3, kegunaan 1 baris (caption), pill kesulitan + pill durasi ("±20 menit"). Selalu tepat 3 kartu.

**Pill**: radius 999, padding 4x10. Warna: mudah (green100/green700), sedang (#FFEBD6/#A34E00), sulit (#FDECEA/#B42318), info (blue50/blue600), "Contoh tersimpan" (#FFF6D6/#8A6400).

**StageStatus** (`apps/mobile/src/components/StageStatus.tsx`): daftar status per komponen (Foto, Model 3D, Ide, Panduan, Ilustrasi). Setiap baris menampilkan **nama tahap** dan ikon status, tanpa persentase. Baris gagal punya tombol "Coba lagi". Teksnya diambil dari `apps/mobile/src/theme/statusCopy.ts`.

**MascotBubble** (`apps/mobile/src/components/MascotBubble.tsx`): maskot 64 sampai 84 di kiri + bubble blue50, radius `20 20 20 6`.

**MeshViewerFrame**: kartu bg green50, radius 28, tinggi sekitar 300, berisi WebView `<model-viewer>`. Di bawahnya caption tetap: "Model 3D ini hanya gambaran bentuk, bukan ukuran asli." Saat mesh belum siap, tampilkan foto asli redup + StageStatus mesh. Saat gagal: maskot bingung + "Model 3D belum tersedia; ide tetap dapat digunakan."

**StepCard** (panduan): nomor langkah dalam lingkaran green500, judul, instruksi, "Hasil yang diharapkan" dalam kotak green50, slot ilustrasi 4:3 (pending: skeleton + "Ilustrasi sedang dibuat"; gagal: tombol coba lagi), checkbox chunky "Sudah" yang disimpan lokal.

**SafetyNote**: kotak warn, ikon segitiga, teks body. Dipakai untuk `safety_notes`.

## 5. Logo, maskot, ikon

```
assets/
├── logo/    logo-bekas.png, logo-bekas-1024.png (app icon / splash)
├── maskot/  6 pose maskot resmi
└── ikon/    18 ikon 3D eco
```

Mapping file ada di `apps/mobile/src/theme/assets.ts`.

**Logo**: kotak lime dengan panah daur ulang, botol, dan daun. Untuk app icon (`app.json` → `icon`, `android.adaptiveIcon`), splash, dan header Beranda kecil.

**Maskot resmi** (kucing biru, topi dan kaos hijau dengan logo BEKAS). Versi lama dengan simbol daur ulang di kaos tidak dipakai.

| Pose | Pakai di |
|---|---|
| `menyapa` | Beranda |
| `tunjuk-hp` | Pratinjau foto (tips foto), bubble tips di Panduan |
| `scan` | Hasil barang saat memproses |
| `bingung` | `needs_new_photo`, upload gagal, koneksi terputus, mesh gagal |
| `bawa-botol` | Detail ide |
| `senang` | Semua langkah panduan dicentang |

Aturan: maskot hanya di momen emosional, **maksimal satu per layar**.

**Ikon 3D** (`ikon/icon-*.png`): untuk benda dan kategori, ditaruh di tile warna muda (misalnya tile IdeaCard). **Ikon aksi UI** (kembali, tutup, kamera, galeri, centang, coba lagi) pakai `lucide-react-native` dengan `strokeWidth={2.5}`. Jangan pakai emoji.

## 6. Layar (mengikuti PRD bagian 4)

Lima layar, dengan Expo Router:

```
app/
├── index.tsx                 1. Beranda
├── preview.tsx               2. Pratinjau foto
└── project/[id]/
    ├── index.tsx             3. Hasil barang
    ├── idea/[ideaId].tsx     4. Detail ide
    ├── guide.tsx             5. Masuk / lanjutkan panduan
    └── guide/step/[stepId].tsx   Page per proses dan penyelesaian
```

**1. Beranda**
- GreenHeader: logo kecil + "BEKAS", judul h1 "Barang bekas mau dijadikan apa?", maskot `menyapa` di kanan.
- Kartu utama: CTA oranye "Foto barang" (kamera) dan tombol secondary "Pilih dari galeri".
- Kartu "Lanjutkan proyek" jika ada project ID tersimpan lokal: foto kecil, nama barang, StageStatus ringkas (satu baris tahap terakhir).
- Kartu tips: "Cocok untuk botol dan wadah plastik kaku."
- Tanpa login, tanpa tab Profil.

**2. Pratinjau foto**
- Foto besar dalam kartu radius 28.
- MascotBubble `tunjuk-hp`: "Pastikan barangnya utuh, latarnya polos, dan cahayanya rata."
- Checklist 3 baris (satu objek utuh, latar sederhana, pencahayaan merata), sebagai panduan, bukan validasi.
- Bawah: secondary "Foto ulang" + primary "Kirim foto".
- State: upload berlangsung (tombol disabled + label "Mengunggah foto"), upload gagal (danger box + "Coba lagi"), izin kamera ditolak (pesan + tombol buka galeri).

**3. Hasil barang** (status mesh dan ide terpisah)
- Header putih: back, nama barang dari `object_profile.label` jika sudah ada.
- MeshViewerFrame di atas.
- Bagian "Profil barang": label, bagian yang terlihat, dugaan material dengan kata "kemungkinan", serta `uncertainties` dalam kotak info.
- Bagian "3 ide untukmu": tepat 3 IdeaCard. Sebelum siap: 3 skeleton card + StageStatus ide.
- `input_status = needs_new_photo`: sembunyikan ide, tampilkan maskot `bingung` + penjelasan dari backend + ChunkyButton "Ambil foto baru".
- Pill "Contoh tersimpan" di atas jika proyek berasal dari fixture.

**4. Detail ide**
- GreenHeader dengan judul ide (h2), pill kesulitan + durasi, maskot `bawa-botol`.
- Kartu "Kegunaan".
- Kartu "Alat" dan "Bahan tambahan": daftar dengan bullet hijau. Pisahkan jelas dari barang yang difoto.
- SafetyNote untuk setiap `safety_notes`.
- Bawah: CTA oranye "Buat panduan" (idempoten, disable setelah ditekan).

**5. Panduan**
- Header: judul, daftar alat/bahan ringkas (bisa dilipat), SafetyNote.
- Satu page persiapan, lalu satu page per langkah dengan judul proses, instruksi dan hasil yang diharapkan. Teks **tidak menunggu ilustrasi**.
- Tiap page proses punya tombol **Ilustrasi 2D / Model 3D** dengan status terpilih yang aksesibel. Mesh proses yang belum tersedia memakai placeholder jujur; jangan menampilkan mesh awal sebagai hasil proses berikutnya.
- Tombol Sebelumnya / Berikutnya di bawah safe area konten; Berikutnya menyimpan langkah selesai. Demo tempat pensil: lima page (persiapan + empat langkah), dipetakan ke lima kondisi mesh.
- Checkbox per langkah disimpan lokal. Indikator progres = "2 dari 5 langkah dicentang" (ini data nyata, boleh).
- Semua dicentang: kartu selesai dengan maskot `senang` dan "Kerajinanmu jadi!". Tanpa klaim gram plastik atau emisi.
- Di kartu selesai: tombol "Foto hasil karyamu" untuk verifikasi poin (bagian 6b).

## 6b. Layar reward (PRD bagian 17)

```
app/
├── wallet.tsx         Dompet Poin
├── leaderboard.tsx    Leaderboard RW
├── rw.tsx             Pilih RW
└── bank-sampah.tsx    Bank sampah mitra
```

- **Beranda:** di bawah kartu utama, dua kartu sejajar (saldo poin, peringkat RW) dan satu kartu Bank sampah. Kartu ringkas, angka pakai Fredoka.
- **Verifikasi:** di kartu selesai Panduan. StageStatus kind `verification`. Disetujui: pill hijau "+500 poin" + tombol ke Dompet. Ditolak: alasan dari backend + "Foto ulang". Maskot tetap satu (`senang`).
- **Dompet Poin:** GreenHeader berisi saldo (display) dan pill "1 poin = Rp1". Kartu hadiah target dengan ProgressBar (data nyata saldo ÷ harga). Daftar hadiah: Card + harga + stok + tombol Tukar (secondary; disabled bila saldo kurang/stok 0). Konfirmasi tukar lewat sheet. Riwayat: daftar entri +/−, sumber, tanggal.
- **Leaderboard RW:** GreenHeader bulan berjalan + maskot `senang`. Kartu tantangan bulanan + ProgressBar RW pengguna. Daftar RW: nomor peringkat dalam lingkaran, nama RW, kelurahan, kapten, jumlah barang. RW pengguna memakai Card `selected`. Belum pilih RW: kartu ajakan "Pilih RW kamu".
- **Pilih RW / Bank sampah:** PlainHeader + daftar Card. Bank sampah: jam buka, pill jenis diterima, harga per kg, tombol secondary "Buka di peta".
- ProgressBar: track `line`, isi `green500`, tinggi 12, radius pill. Hanya untuk data nyata (saldo, jumlah barang), **bukan** untuk proses backend.

## 7. State wajib (PRD bagian 4)

Semua state di bawah harus punya tampilan. Teks ada di `statusCopy.ts`.

| State | Tampilan |
|---|---|
| Upload berlangsung / gagal | Tombol disabled + label tahap / danger box + Coba lagi |
| Foto tidak sesuai | Maskot bingung + penjelasan + Ambil foto baru |
| Menunggu antrean GPU | StageStatus mesh: "Menunggu giliran pembuatan 3D" |
| Worker menyiapkan model / memproses | "Menyiapkan model 3D" / "Membuat model 3D" |
| GPU tidak tersedia | "Pembuat 3D sedang tidak tersedia" + ide tetap jalan |
| Mesh siap / gagal | Viewer / maskot bingung + "Model 3D belum tersedia; ide tetap dapat digunakan" |
| Ide siap / gagal | 3 IdeaCard / danger box + Coba lagi |
| Panduan siap | Langsung tampil |
| Ilustrasi pending / siap / gagal | Skeleton / gambar / tombol coba lagi per langkah |
| Koneksi terputus | Banner atas warna warn: "Koneksi terputus. Kami lanjutkan saat online." |
| Verifikasi menunggu / diperiksa / disetujui / ditolak / gagal | StageStatus verification / pill "+500 poin" / alasan + Foto ulang / Coba lagi |
| Batas harian, foto ganda | Danger box dengan pesan dari backend |
| Saldo kurang / stok habis | Tombol Tukar disabled + caption alasan |

Aturan: tampilkan **nama tahap**, jangan pernah persentase atau progress bar palsu untuk proses backend.

## 8. Aturan penulisan dan larangan

- Bahasa Indonesia santai, sapa dengan "kamu". Kalimat pendek.
- Satu aksi utama per layar, tombolnya lebar di bawah.
- Jangan klaim ukuran, volume, jenis plastik pasti, atau dampak lingkungan. Pakai kata "kemungkinan" untuk material.
- Jangan sarankan membakar atau melelehkan plastik. Langkah memotong selalu disertai catatan tepi tajam (datang dari backend, tampilkan sebagai SafetyNote).
- Hindari: gradasi, glassmorphism, sudut tajam, bayangan blur pada tombol, teks putih di atas green400, lebih dari satu tombol oranye per layar, font selain Fredoka dan Nunito.

## 9. Source UI aktif

```
apps/mobile/src/
├── theme/
│   ├── tokens.ts        warna, radius, spasi, tipografi
│   ├── fonts.ts         hook useBekasFonts()
│   ├── assets.ts        require() logo, maskot, ikon
│   └── statusCopy.ts    teks status job dalam bahasa Indonesia
└── components/
    ├── ChunkyButton.tsx
    ├── StageStatus.tsx
    └── MascotBubble.tsx
```

Gunakan komponen dan tema yang sudah tersedia langsung. Folder `logo/`, `maskot/`, `ikon/`, dan `demo/` berada di `apps/mobile/assets/`; semua registrasi aset melalui `src/theme/assets.ts`.

Install:

```
npx expo install @expo-google-fonts/fredoka @expo-google-fonts/nunito expo-font expo-splash-screen react-native-svg lucide-react-native react-native-safe-area-context
```

## 10. Verifikasi perubahan UI

- Jalankan `npm run typecheck` dan `npm run check` dari `apps/mobile`.
- Periksa alur dummy di browser, lalu kamera, gesture viewer, safe area dan pemulihan progres di Android fisik.
- Pekerjaan integrasi tersisa mengikuti `IMPLEMENTATION_PLAN.md`; jangan membangun ulang layar dan komponen yang sudah tersedia.
