---
name: bekas-ui-craft
description: Pakai setiap kali membuat atau mengubah layar/komponen UI React Native di app BEKAS. Berisi alur kerja desain dengan screenshot emulator, aturan craft gaya Pidu (chunky, bulat, padat), jebakan React Native, dan checklist review sebelum selesai.
---

# BEKAS UI Craft

Tujuan: hasil UI setara mockup desain, bukan "layar React Native default". Kualitas datang dari tiga hal: **acuan visual yang jelas, angka yang presisi, dan loop melihat hasil lalu memperbaiki.** Jangan berhenti di "kodenya jalan".

## 1. Alur kerja wajib (setiap layar/komponen)

1. **Baca acuan**: `DESIGN.md` (bagian layar terkait + bagian 2b distribusi warna), `apps/mobile/src/theme/tokens.ts`, lalu **buka gambar di `design/references/`** (UI kit Pidu) dan `design/screens/` bila ada dengan Read. Jangan hanya membaca nama file. Catat 3 hal dari referensi yang akan kamu tiru di layar ini (misalnya: tile pastel di kartu, tombol oranye tunggal, maskot besar di header).
2. **Rencana layout singkat** (3 sampai 6 baris): urutan blok dari atas ke bawah, tinggi kira-kira tiap blok, mana aksi utama, pose maskot, dan **peta warna**: elemen mana hijau, mana oranye, mana pastel (ikuti tabel per layar di DESIGN.md 2b).
3. **Tulis kode** pakai token dan komponen yang ada di `apps/mobile/src/components` (`ChunkyButton`, `Card`, `StageStatus`, `MascotBubble`, `shapes`, dll.). Komponen baru dibuat di `apps/mobile/src/components` bila dipakai lebih dari sekali.
4. **Screenshot hasil nyata**: jalankan `bash .claude/skills/bekas-ui-craft/scripts/screenshot.sh <nama>` (butuh emulator/HP via adb dan app sedang di layar itu). Lalu **Read** file PNG-nya.
5. **Kritik diri** pakai checklist bagian 5. Tulis 3 sampai 5 masalah paling terlihat, perbaiki, ulangi langkah 4. Maksimal 3 putaran, lalu laporkan sisa masalah ke user.

Kalau adb tidak tersedia, katakan ke user dan minta mereka kirim screenshot. Jangan mengklaim tampilan sudah bagus tanpa melihatnya.

## 2. Prinsip craft gaya BEKAS (Pidu-like)

- **Hierarki jelas**: setiap layar punya satu judul besar (Fredoka), satu aksi utama (ChunkyButton lebar di bawah), sisanya pendukung. Kalau mata bingung mau lihat ke mana, hierarkinya gagal.
- **Padat tapi bernapas**: jangan ada area kosong besar tanpa maksud. Ruang kosong diisi maskot, ikon 3D di tile, atau kartu info. Jarak antar blok konsisten: 12 di dalam grup, 20 sampai 24 antar grup, padding layar 20.
- **Semua bisa ditekan terlihat "tebal"**: tombol dan kartu pilihan punya bayangan padat 5px warna gelap di bawah (lihat pola di bagian 3). Tidak ada tombol flat tipis bawaan.
- **Bulat di mana-mana**: kartu 24, tombol 18, tile 20, pill 999, header bawah 32. Tidak ada sudut tajam.
- **Hijau dipakai hemat (60-30-10)**: 60% latar terang, 30% hijau (header + satu tombol utama), 10% aksen. Kalau layar terasa "hijau semua", ganti: tombol kedua jadi secondary, kartu ringkas jadi latar pastel (tileYellow/tileBlue/tilePink), tile ikon bergiliran warna, header layar sekunder jadi PlainHeader putih. Oranye hanya satu CTA per layar. Latar layar #F3FAF5.
- **Tipografi tegas**: judul Fredoka 700, isi Nunito minimal 700. Teks abu (muted) hanya untuk keterangan. Jangan pakai teks 11px atau lebih kecil kecuali label tab.
- **Ilustrasi berukuran sengaja**: maskot di header 150 sampai 200 lebar, di bubble 64 sampai 84. Ikon 3D di tile 72 berisi gambar 52 sampai 60. Maskot boleh "keluar" sedikit dari header (posisi absolute, bottom negatif) supaya terasa hidup.
- **Header hijau** dengan 1 sampai 2 lingkaran putih transparan (opacity 0.06 sampai 0.08) di pojok sebagai dekor.
- **Kejujuran data**: status pakai nama tahap dari `statusCopy.ts`. Tidak ada persentase palsu, ukuran, jenis plastik pasti, atau klaim dampak.

## 3. Pola React Native yang benar

**Bayangan padat (bukan elevation):**
```tsx
// Kartu: lapisan bayangan di belakang, kartu digeser 5px ke atas
<View style={{ backgroundColor: colors.cardShadow, borderRadius: radius.card, marginTop: 5 }}>
  <View style={{ backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 2,
                 borderColor: colors.line, padding: 16, transform: [{ translateY: -5 }] }}>
    {children}
  </View>
</View>
```
Tombol: pakai `ChunkyButton`, jangan bikin ulang.

**Header hijau dengan maskot nongol:**
```tsx
<View style={{ backgroundColor: colors.green500, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
               paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' }}>
  <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120,
                 backgroundColor: 'rgba(255,255,255,0.07)', right: -70, top: -60 }} />
  {/* teks di kiri, lebar dibatasi supaya tidak menabrak maskot */}
  <Image source={mascot.menyapa} resizeMode="contain"
         style={{ position: 'absolute', right: 0, bottom: -10, width: 170, height: 200 }} />
</View>
```

**Tile ikon 3D:**
```tsx
<View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: tile.bg,
               alignItems: 'center', justifyContent: 'center' }}>
  <Image source={tile.icon} style={{ width: 56, height: 56 }} resizeMode="contain" />
</View>
```

## 3b. Komposisi: menggabungkan elemen jadi ilustrasi

Desain yang terasa "hidup" jarang berasal dari satu gambar. Biasanya beberapa lapisan ditumpuk. Jangan menunggu ada aset jadi; rakit sendiri dari aset yang ada + shape SVG di `apps/mobile/src/components/shapes.tsx` (`Coin`, `Flame`, `Star`, `Sparkle`, `DecorCircle`, `DashedLine`, `TagLabel`, `Confetti`). Kalau butuh shape baru (kado, gembok, piala), gambar sendiri dengan `react-native-svg` dalam viewBox 24x24 dan tambahkan ke file yang sama.

Resep lapisan (dari bawah ke atas), semua dalam satu `View` dengan `position: 'relative'` dan ukuran tetap:

1. **Latar**: kartu warna muda (green50/blue50) radius 28, border 2px.
2. **Objek utama**: ikon 3D / foto / maskot, ukuran besar, di tengah, boleh diputar sedikit (`rotate: '-8deg'`) supaya tidak kaku.
3. **Penanda**: `DashedLine`, lingkaran, atau sudut bingkai, `position: 'absolute'` di atas objek.
4. **Label**: `TagLabel` atau pill di dekat penanda, posisinya menempel ke penanda yang dijelaskannya.
5. **Kontrol/keterangan**: toggle di pojok kiri atas, caption kecil di pojok kiri bawah dengan latar putih 80%.
6. **Aksen**: 2 sampai 4 `Star`/`Sparkle`/titik kecil di sekitar objek. Jangan lebih, nanti ramai.

Contoh (kartu hadiah):
```tsx
<View style={{ height: 120, borderRadius: 24, backgroundColor: colors.green50, alignItems: 'center', justifyContent: 'center' }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Text style={[type.display, { color: colors.green700 }]}>+40</Text>
    <Coin size={34} />
  </View>
  <Sparkle size={14} color="#FFC531" style={{ position: 'absolute', top: 18, right: '30%' }} />
  <Star size={12} color={colors.green400} style={{ position: 'absolute', bottom: 20, left: '28%' }} />
</View>
```

Aturan: setiap lapisan punya alasan (menjelaskan, menandai, atau merayakan). Overlay tidak boleh menutupi bagian penting objek. Selalu cek lewat screenshot apakah posisinya pas di layar asli.

## 4. Jebakan React Native (sering bikin desain jelek)

- `elevation` / `shadowRadius` menghasilkan bayangan blur. **Dilarang** untuk tombol dan kartu. Pakai pola lapisan di atas.
- Font custom: `fontWeight` diabaikan atau jadi faux-bold di Android. Atur ketebalan lewat `fontFamily` (`type.*` di tokens).
- Teks Android terpotong atas/bawah: selalu set `lineHeight` (sudah ada di `type.*`) dan jangan pakai `height` tetap pada `Text`.
- `Image` tanpa `width`/`height` eksplisit tidak tampil atau gepeng. Selalu beri ukuran + `resizeMode="contain"`.
- `borderRadius` pada parent tidak memotong anak kecuali `overflow: 'hidden'`.
- Safe area: pakai `useSafeAreaInsets()` untuk padding atas header dan bawah tombol. Jangan pakai angka tebakan.
- Tombol bawah yang menempel: bungkus dengan View `paddingHorizontal: 20, paddingBottom: insets.bottom + 16`, latar sama dengan layar.
- Daftar panjang: `ScrollView` dengan `contentContainerStyle={{ paddingBottom: 120 }}` supaya konten terakhir tidak tertutup tombol bawah.
- `gap` didukung (RN 0.71+); pakai `gap` daripada margin manual antar anak.
- Jangan pakai `Button` bawaan RN atau warna default biru. Jangan pakai emoji sebagai ikon; pakai `lucide-react-native` strokeWidth 2.5.

## 5. Checklist review (wajib sebelum bilang selesai)

Lihat screenshot, jawab satu per satu:

1. Apakah ada satu fokus utama yang langsung terbaca dalam 2 detik?
1b. Apakah hijau terasa dominan berlebihan? Hitung: berapa elemen hijau vs pastel/oranye. Paling banyak satu tombol hijau, dan minimal 2 warna pastel berbeda terlihat di layar (kecuali layar kamera/pratinjau).
2. Apakah ada area kosong besar tanpa maksud, atau sebaliknya elemen yang berdempetan/menumpuk?
3. Apakah semua jarak memakai skala 4/8/12/16/20/24 dan konsisten antar kartu?
4. Apakah tombol dan kartu pilihan punya bayangan padat 5px, bukan blur?
5. Apakah semua sudut bulat sesuai token dan latar layar #F3FAF5?
6. Apakah judul Fredoka, isi Nunito, tidak ada teks terpotong atau menyusut?
7. Apakah maskot maksimal satu dan posenya sesuai DESIGN.md bagian 5?
8. Apakah teks putih hanya di atas #1E9E54, #137A3E, atau #E8740C?
9. Apakah semua state layar ini (loading, gagal, kosong, sukses) punya tampilan?
10. Bandingkan dengan screenshot acuan: sebutkan 3 perbedaan terbesar dan perbaiki.

Laporkan ke user: screenshot terakhir, apa yang sudah diperbaiki, dan sisa perbedaan dengan acuan.
