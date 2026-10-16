# Audit tampilan BEKAS (Fase 0)

Tanggal: 16 Oktober 2026. Acuan: `design/references/` (UI kit Pidu), DESIGN.md bagian 2b.

**Cara ambil screenshot:** `adb` tidak terpasang di laptop ini, jadi screenshot "before" diambil dari preview web (Expo web, viewport 390×844, mode fixture) lewat browser bawaan Claude. Gambar dilihat langsung saat audit tetapi **tidak tersimpan sebagai file PNG**. Tampilan di Android asli (font, safe area, WebView) bisa sedikit berbeda.

Rubrik 1–5: **(a)** daya tarik visual, **(b)** kekayaan ilustrasi, **(c)** variasi warna, **(d)** hierarki, **(e)** kemiripan rasa dengan Pidu.

## Skor

| Halaman | a | b | c | d | e | Rata-rata |
|---|---|---|---|---|---|---|
| Beranda | 4 | 3 | 4 | 4 | 4 | 3,8 |
| Jalur | 4 | 3 | 3 | 4 | 4 | 3,6 |
| Dompet | 3 | 2 | 3 | 3 | 2 | 2,6 |
| Peringkat (Leaderboard) | 3 | 2 | 3 | 3 | 3 | 2,8 |
| Pratinjau foto | 3 | 2 | 2 | 4 | 2 | 2,6 |
| Hasil barang | 3 | 2 | 3 | 3 | 3 | 2,8 |
| Detail ide | 3 | 1 | 2 | 3 | 3 | 2,4 |
| Panduan | 3 | 2 | 2 | 3 | 3 | 2,6 |
| Bank sampah | 2 | 1 | 3 | 3 | 2 | 2,2 |
| Pilih RW | 2 | 1 | 1 | 3 | 2 | 1,8 |

## Tiga masalah terbesar per halaman

**Beranda**
1. Kartu "Foto satu barang bekasmu" hanya memakai PNG botol kecil; tidak ada visual kamera yang menjelaskan aksinya.
2. Kartu Dompet dan Peringkat berisi satu ikon tunggal (koin datar, ikon tangan-bumi) tanpa komposisi; belum ada tumpukan koin atau trofi yang membuatnya terasa "hadiah".
3. "Lanjutkan proyek" memakai ikon tanaman generik yang tidak terkait proyek, dan progress bar abu kosong mendominasi saat 0 langkah.

**Jalur**
1. Setengah kanan layar kosong; dekor ikon 3D hanya 1 di layar pertama sehingga peta terasa sepi dibanding Pidu yang penuh semak, kaktus, dan tunggul.
2. Titik gembok abu datar tanpa tekstur; tidak ada variasi warna selain hijau dan abu.
3. Label proyek aktif (pill putih) menempel ke jalan dan kurang menonjol; tidak ada bayangan atau ekor penunjuk ke titiknya.

**Dompet**
1. Saldo di header hanya teks; tidak ada ilustrasi koin atau tumpukan koin sebagai momen visual utama.
2. Kartu hadiah memakai ikon garis lucide kecil di tile hijau yang sama untuk semua hadiah; tidak ada kado atau warna bergiliran.
3. Riwayat poin berupa daftar teks polos; nilai +/− tanpa ikon bulat berwarna, dan tombol abu "Kurang X poin" terlalu besar dan dominan.

**Peringkat**
1. Tidak ada podium atau medali; tiga besar tampil sama dengan peringkat lain, hanya beda warna lingkaran nomor.
2. Kartu "Tantangan bulan ini" teks saja; tidak ada trofi atau visual hadiah bersama.
3. Kartu ajakan "Pilih RW kamu" teks saja; daftar RW berupa kartu putih seragam.

**Pratinjau foto**
1. Hampir seluruh layar putih dan hijau; tidak ada warna pastel sama sekali.
2. Checklist memakai centang garis tipis tanpa tile; terlihat seperti daftar biasa.
3. Bingkai foto polos; tidak ada sudut bingkai atau penanda yang memberi kesan "kamera/scan".

**Hasil barang**
1. Saat model 3D memuat, area viewer kosong hijau muda tanpa ilustrasi atau penanda.
2. Judul "3 ide untukmu" hanya teks; kartu Profil barang berupa paragraf teks.
3. Deskripsi IdeaCard terpotong satu baris sehingga kartu terasa sempit; tile dan teks kurang berimbang.

**Detail ide**
1. Alat dan bahan tampil sebagai bullet list teks; seharusnya grid tile ilustrasi (gunting, lem, tali).
2. Kartu "Kegunaan" teks saja; di bawah header tidak ada momen visual apa pun.
3. Dominan kartu putih; warna pastel hanya dari SafetyNote.

**Panduan**
1. Kartu "Alat dan bahan" berupa dua baris teks panjang.
2. Placeholder ilustrasi langkah berupa kotak hijau muda dengan ikon garis kecil; terasa kosong untuk area sebesar itu.
3. Nomor langkah selalu lingkaran hijau yang sama; tidak ada variasi warna antar langkah.

**Bank sampah**
1. Kartu berisi teks panjang tanpa elemen visual di kiri/atas; tidak ada ilustrasi pin atau bank sampah.
2. Daftar harga per kg berupa tabel teks.
3. Pill jenis sampah semuanya biru; tidak bergiliran.

**Pilih RW**
1. Ikon garis "Users" di tile hijau yang sama untuk semua RW.
2. Banyak ruang kosong di bawah daftar; tidak ada ilustrasi komunitas.
3. Hanya satu warna aksen (hijau); tidak ada pastel.

## Catatan yang bertentangan atau perlu keputusan

- `design/references/README.md` menulis bahwa jalur level dan streak tidak ditiru, tetapi PRD 1.4 (atas permintaan) membangun layar Jalur dan streak mingguan. Tidak dihapus; README sebaiknya diperbarui.
- DESIGN.md 2b menulis Panduan memakai PlainHeader putih, sementara layar Panduan saat ini memakai GreenHeader. Tidak diubah di audit; perlu keputusan apakah mengikuti 2b.
- Link "Pakai foto contoh (dev)" di panel verifikasi sengaja hanya muncul di mode dev + fixture.
