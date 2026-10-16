# BEKAS UI Style Guide (untuk Claude Code)

> Dokumen ini mengatur **tampilan**. Alur, scope, dan state mengikuti **PRD.md** (v1.2). Kalau ada konflik, PRD yang menang.
> Stack: React Native + Expo + TypeScript + Expo Router, target Android.
> Aset ada di `assets/` (logo, maskot, ikon 3D, PNG transparan). Starter code ada di `starter/` (lihat bagian 9).

## 1. Konsep

BEKAS membantu pemula mengubah botol dan wadah plastik bekas menjadi barang berguna: foto barang, lihat mesh 3D yang bisa diputar, pilih satu dari 3 ide, lalu ikuti panduan bergambar.

Gaya visual: **playful edu-app**, terinspirasi UI kit "Pidu". Ciri utamanya:

- Hijau segar sebagai warna dominan, header hijau dengan sudut bawah membulat.
- Tombol **chunky**: warna solid dengan bayangan padat di bawah (5px, warna lebih gelap), seperti tombol mainan.
- Kartu putih, sudut sangat bulat (22 sampai 26), border 2px abu kehijauan.
- Maskot kucing biru 3D dan ikon 3D eco.
- Tetap jujur: tidak ada persentase kemajuan palsu, tidak ada klaim ukuran, jenis resin, atau dampak lingkungan yang tidak diukur (PRD bagian 3, 4, 15).

Canvas Design (prototype di Claude) hanya acuan **gaya visual**. Alurnya sudah diganti oleh bagian 6 di bawah. Sejak PRD 1.3, **poin dan leaderboard RW dibangun**; sejak PRD 1.4, **streak mingguan, layar Jalur, dan navigasi bawah** juga dibangun (bagian 6b). Misi harian, level/kunci konten, dan statistik "plastik terselamatkan" di canvas tetap **tidak dibangun**.

## 2. Design tokens

Sumber kebenaran: `starter/theme/tokens.ts`. Ringkasan:

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

Pastel aksen (tokens.ts): tileGreen #D6F5E1, tileBlue #EAF2FE, tileYellow #FFF6D6, tilePink #FFE9F0, noteYellow #FFF4E5 (border #FFD9A8), accentYellow #FFC531, accentPink #FF5C93.

## 2b. Distribusi warna (supaya tidak hijau semua)

Lihat `design/references/` (UI kit Pidu, buka gambarnya dengan Read). Yang bikin Pidu hidup bukan hijaunya, tapi **hijau dipakai hemat**. Sisanya diisi putih, oranye, dan tile pastel warna-warni.

Aturan 60-30-10: 60% latar terang (bg + kartu putih), 30% hijau (header dan satu tombol utama), 10% aksen (oranye, kuning, biru, pink).

| Elemen | Warna |
|---|---|
| Tombol utama | `primary` hijau, **maksimal satu per layar** |
| Tombol kedua dan seterusnya | `secondary`. Jangan dua tombol hijau berdampingan |
| CTA spesial | `cta` oranye: "Foto barang" (Beranda), "Buat panduan" (Detail ide), "Tukar" yang sudah dikonfirmasi. Kalau ada CTA oranye, tombol lain di layar itu secondary |
| Tile ikon (IdeaCard, kartu Beranda, hadiah, bank sampah) | Bergiliran tileGreen, tileBlue, tilePink, tileYellow. Ini sumber warna terbesar selain hijau |
| Kartu ringkas Beranda (Dompet, Leaderboard) | Latar kartu pastel penuh (tileYellow untuk Dompet + `Coin`, tileBlue untuk Leaderboard), bukan putih |
| Pill | Kesulitan: hijau/oranye/merah. Durasi: tileBlue + blue600. "Contoh tersimpan": tileYellow |
| Kartu info | Tips/maskot: blue50. Peringatan: warnBg. Highlight/rangkuman: noteYellow |
| Header | Hijau hanya di Beranda, Detail ide, Dompet, Leaderboard. Pratinjau, Hasil barang, Panduan, Pilih RW, Bank sampah pakai PlainHeader putih |
| Dekor | `Coin`, `Star`, `Sparkle`, `Confetti` dari `shapes.tsx` di momen hadiah/sukses |

| Layar | Hijau | Oranye | Pastel |
|---|---|---|---|
| Beranda | Header | "Foto barang" | Kartu Dompet tileYellow, Leaderboard tileBlue, Bank sampah ikon di tilePink, tips blue50 |
| Pratinjau foto | "Kirim foto" | (tidak ada) | Bubble blue50, checklist dengan ikon di tile pastel |
| Hasil barang | Status sukses saja | (tidak ada) | 3 IdeaCard tile hijau/biru/pink, profil barang di noteYellow |
| Detail ide | Header | "Buat panduan" | Alat di tileBlue, bahan di tileYellow, SafetyNote warnBg |
| Panduan | "Sudah" per langkah | (tidak ada) | Hasil yang diharapkan di noteYellow, tips blue50, kartu selesai dengan Confetti |
| Dompet Poin | Header | Tukar (konfirmasi) | Saldo dengan `Coin`, hadiah di tile pastel bergiliran, entri + hijau / − oranye |
| Leaderboard RW | Header | (tidak ada) | Peringkat 1/2/3 lingkaran kuning/biru/pink, RW sendiri tilePink, tantangan noteYellow |
| Pilih RW / Bank sampah | (tidak ada) | (tidak ada) | Ikon 3D di tile pastel bergiliran, pill jenis sampah warna-warni |

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

**ChunkyButton** (`starter/components/ChunkyButton.tsx`, sudah jadi). Variant: `primary`, `cta`, `secondary`, `disabled`. Tinggi 56, radius 18, lebar penuh di bawah layar. Saat ditekan, muka tombol turun 5px menutup bayangan.

**GreenHeader**: latar green500, radius bawah 32, padding atas mengikuti safe area + 16, samping 20. Dekor 1 sampai 2 lingkaran putih opacity 6 sampai 8%. Boleh ada maskot "nongol" di kanan bawah.

**Card**: latar putih, border 2px line, radius 24, padding 16, bayangan padat `0 5px 0 #DCE8E0` (di RN: View latar #DCE8E0 di belakang, offset 5px, sama seperti ChunkyButton). Kartu terpilih: border green400 dan bayangan #B9EBCB.

**IdeaCard**: tile ikon 3D 72 di kiri (warna muda), judul h3, kegunaan 1 baris (caption), pill kesulitan + pill durasi ("±20 menit"). Selalu tepat 3 kartu.

**Pill**: radius 999, padding 4x10. Warna: mudah (green100/green700), sedang (#FFEBD6/#A34E00), sulit (#FDECEA/#B42318), info (blue50/blue600), "Contoh tersimpan" (#FFF6D6/#8A6400).

**StageStatus** (`starter/components/StageStatus.tsx`, sudah jadi): daftar status per komponen (Foto, Model 3D, Ide, Panduan, Ilustrasi). Setiap baris menampilkan **nama tahap** dan ikon status, tanpa persentase. Baris gagal punya tombol "Coba lagi". Teksnya diambil dari `starter/theme/statusCopy.ts`.

**MascotBubble** (`starter/components/MascotBubble.tsx`, sudah jadi): maskot 64 sampai 84 di kiri + bubble blue50, radius `20 20 20 6`.

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

Mapping file ada di `starter/theme/assets.ts`.

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
    └── guide.tsx             5. Panduan
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
- Teks semua langkah tampil begitu panduan valid, **tidak menunggu ilustrasi**.
- 4 sampai 6 StepCard. Ilustrasi muncul bertahap (langkah 1 dulu).
- Checkbox per langkah disimpan lokal. Indikator progres = "2 dari 5 langkah dicentang" (ini data nyata, boleh).
- Semua dicentang: kartu selesai dengan maskot `senang` dan "Kerajinanmu jadi!". Tanpa klaim gram plastik atau emisi.
- Di kartu selesai: tombol "Foto hasil karyamu" untuk verifikasi poin (bagian 6b).

## 6b. Layar reward (PRD bagian 17)

```
app/
├── wallet.tsx         Dompet Poin
├── leaderboard.tsx    Leaderboard RW
├── rw.tsx             Pilih RW
├── bank-sampah.tsx    Bank sampah mitra
└── (tabs)/            index, jalur, wallet, leaderboard dengan navigasi bawah
```

- **Beranda:** di bawah kartu utama, dua kartu sejajar (saldo poin, peringkat RW) dan satu kartu Bank sampah. Kartu ringkas, angka pakai Fredoka.
- **Verifikasi:** di kartu selesai Panduan. StageStatus kind `verification`. Disetujui: pill hijau "+500 poin" + tombol ke Dompet. Ditolak: alasan dari backend + "Foto ulang". Maskot tetap satu (`senang`).
- **Dompet Poin:** GreenHeader berisi saldo (display) dan pill "1 poin = Rp1". Kartu hadiah target dengan ProgressBar (data nyata saldo ÷ harga). Daftar hadiah: Card + harga + stok + tombol Tukar (secondary; disabled bila saldo kurang/stok 0). Konfirmasi tukar lewat sheet. Riwayat: daftar entri +/−, sumber, tanggal.
- **Leaderboard RW:** GreenHeader bulan berjalan + maskot `senang`. Kartu tantangan bulanan + ProgressBar RW pengguna. Daftar RW: nomor peringkat dalam lingkaran, nama RW, kelurahan, kapten, jumlah barang. RW pengguna memakai Card `selected`. Belum pilih RW: kartu ajakan "Pilih RW kamu".
- **Pilih RW / Bank sampah:** PlainHeader + daftar Card. Bank sampah: jam buka, pill jenis diterima, harga per kg, tombol secondary "Buka di peta".
- **Navigasi bawah (PRD 1.4):** bar putih radius atas 28, lima slot: Beranda (Home), Jalur (Flag), Scan di tengah (kotak hijau chunky 64 menonjol ke atas, ikon ScanLine, langsung kamera), Dompet (Wallet), Peringkat (Trophy). Aktif: ikon + label green700, nonaktif iconIdle. Tanpa tab Profil.
- **Badge header:** pill putih berisi `Coin` + saldo, dan `Flame` + streak minggu. Dipakai di Beranda dan Jalur.
- **Streak mingguan:** di Dompet, kartu noteYellow dengan `Flame` besar, "N minggu berturut-turut mengolah"; bila minggu ini belum ada proyek: "Olah 1 barang minggu ini supaya streak tidak putus". Tidak memberi poin.
- **Jalur:** GreenHeader (pill "Botol plastik" + badge koin/streak), area jalur latar green50 dengan jalan berliku (svg, stroke noteYellowBorder di bawah tileYellow). Titik 64 chunky: selesai green500 + Check, aktif 76 + Flag + cincin green100 + TagLabel "Judul · 3/5" + maskot `tunjukHp` di sampingnya, terkunci line + Lock, ujung kado accentYellow. Ikon 3D dekor bergantian kiri/kanan. Caption kado: "Pulsa Rp5.000 · 8 proyek lagi".
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

## 9. Starter code

```
starter/
├── theme/
│   ├── tokens.ts        warna, radius, spasi, tipografi
│   ├── fonts.ts         hook useBekasFonts()
│   ├── assets.ts        require() logo, maskot, ikon
│   └── statusCopy.ts    teks status job dalam bahasa Indonesia
└── components/
    ├── ChunkyButton.tsx
    ├── StageStatus.tsx
    ├── MascotBubble.tsx
    └── shapes.tsx       Coin, Flame, Star, Sparkle, DecorCircle, DashedLine, TagLabel, Confetti
```

Salin `starter/theme` ke `apps/mobile/src/theme` dan `starter/components` ke `apps/mobile/src/components`. Folder `logo/`, `maskot/`, `ikon/` berada di `apps/mobile/assets/` (Metro tidak bisa `require` file di luar project; path di `assets.ts` mengasumsikan susunan ini).

Install:

```
npx expo install @expo-google-fonts/fredoka @expo-google-fonts/nunito expo-font expo-splash-screen react-native-svg lucide-react-native react-native-safe-area-context
```

## 10. Prompt untuk Claude Code

Jalankan bertahap, cek hasil di HP setiap tahap.

```
Tahap 1. Baca PRD.md, DESIGN.md, dan CLAUDE.md. Salin starter/ ke src/ sesuai
DESIGN.md bagian 9, pasang dependency, muat font di app/_layout.tsx dengan
useBekasFonts. Buat halaman sementara /dev/components yang menampilkan
ChunkyButton semua variant, StageStatus, dan MascotBubble.
```

```
Tahap 2. Buat komponen sisa dari DESIGN.md bagian 4: GreenHeader, Card,
IdeaCard, Pill, MeshViewerFrame (WebView + model-viewer, versi terkunci),
StepCard, SafetyNote, OfflineBanner. Tambahkan ke /dev/components.
```

```
Tahap 3. Buat 5 layar sesuai DESIGN.md bagian 6 dengan fixture JSON yang
mengikuti kontrak IdeasResult dan GuideResult di PRD bagian 8. Belum
sambung ke API. Pastikan setiap state di DESIGN.md bagian 7 bisa dipicu
dari fixture.
```

```
Tahap 4. Sambungkan ke FastAPI sesuai endpoint di PRD bagian 9: upload
via signed URL, polling 2 sampai 3 detik saat foreground, berhenti saat
background, project ID dan centang langkah disimpan lokal.
```
