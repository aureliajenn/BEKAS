# Dummy tempat pensil polkadot pink

`content.json` berisi profil barang, ide, alat/bahan, empat langkah panduan, prompt ilustrasi, dan pemetaan lima kondisi mesh. Konten dikurasi dari deskripsi tim; bukan hasil API LLM. Estimasi 45 menit adalah perkiraan pengerjaan aktif untuk demo, di luar waktu pengeringan lem yang mengikuti kemasannya.

## Status

- Profil, detail ide `idea-alat-tulis`, dan teks panduan sudah digunakan fixture frontend.
- Urutan rekomendasi dummy: **Tempat pensil polkadot pink (Mudah)**, **Pot gantung tanaman kecil (Sedang)**, **Celengan dengan tutup ulir (Sedang)**. Difficulty pada kartu dan detail ide berasal dari data fixture yang sama.
- Lima model GLB dan lima ilustrasi PNG sudah tersedia dan dihubungkan ke frontend melalui `src/theme/assets.ts`.
- `ready_for_integration: true` menandai aset sudah tersedia dan terhubung; uji interaksi di Android fisik tetap diperlukan.
- Panduan memakai lima page proses: persiapan (botol awal), bentuk wadah, kertas polkadot, dua lis pink, dan simpul merah. Tiap page punya tombol **Ilustrasi 2D / Model 3D**, instruksi, serta navigasi sebelumnya/berikutnya. Berikutnya menyimpan langkah sebagai selesai; persiapan tidak dihitung sebagai langkah pengerjaan.
- Tiap page proses menampilkan ilustrasi/model yang sesuai dari paket ini. Pada mode fixture, viewer **Hasil barang** juga memakai `models/bottle-1.glb` sebagai kondisi awal hasil scan, sebelum pengguna memilih ide. Label tetap **Contoh tersimpan**.
- Route proses: `/project/[id]/guide/step/[stepId]`; `/guide` melanjutkan langkah pertama yang belum selesai. Setelah semua selesai, page penyelesaian menampilkan verifikasi hasil.
- Label tampilan: **Contoh tersimpan**.
- Alur visual dummy: **Pratinjau foto** memakai `illustrations/p1.png` (gambar botol utuh), **Hasil barang / rekomendasi ide** memakai `models/bottle-1.glb`, dan **Proses 1 / persiapan** juga memakai `models/bottle-1.glb`. Gambar pratinjau disimpan sebagai input proyek contoh agar thumbnail dan tampilan menunggu model konsisten.

## Aset terhubung

| Kondisi | GLB | Ilustrasi PNG | Hubungan panduan |
|---|---|---|---|
| Botol utuh, label dan tutup biru | `models/bottle-1.glb` | `illustrations/p1.png` | Persiapan |
| Wadah terbuka, tanpa label, tepi halus | `models/bottle-2.glb` | `illustrations/p2.png` | Setelah langkah 1 |
| Kertas polkadot pink | `models/bottle-3.glb` | `illustrations/p3.png` | Setelah langkah 2 |
| Dua lis pink | `models/bottle-4.glb` | `illustrations/p4.png` | Setelah langkah 3 |
| Simpul pita merah | `models/bottle-5.glb` | `illustrations/p5.png` | Setelah langkah 4 |

Subfolder `models/`, `references/`, dan `illustrations/` sudah disediakan. Pertahankan orientasi, skala, dan sudut render yang konsisten. Lima kondisi tidak memerlukan lima langkah: model pertama adalah bahan awal, empat sisanya hasil proses.

Ilustrasi ditampilkan dengan `contain` agar gambar utuh tidak terpotong. Folder `references/` masih kosong; `reference_path` pada JSON tetap merupakan tujuan render opsional dan tidak dimuat frontend.

`pencilProcessAssets` pada `src/theme/assets.ts` mendaftarkan ID `mesh-01` sampai `mesh-05`: field `illustration` untuk `require` PNG dan `model` untuk `require` GLB. Pemetaan page memakai `after_step_id` dari `content.json`, bukan posisi array.

`pencilInitialAssets` dipakai bersama oleh pratinjau, hasil barang, dan demo komponen. `pencilAssetsForStep()` di `src/lib/fixtures.ts` memusatkan pemetaan aset per langkah. Route panduan meneruskan ke `src/screens/GuideScreen.tsx`; komponen persiapan/penyelesaian dan hook `useGuideProgress` menangani isi serta penyimpanan progres lokal.

Metro mengenali GLB lewat `metro.config.js`. Pada Android, aset model diunduh ke cache; dokumen viewer berisi data URI model ditulis sebagai file HTML di cache. WebView menerima URI dokumen, bukan string HTML/base64 besar melalui bridge React Native. Pada web, viewer memakai URL aset absolut. Library `model-viewer` masih membutuhkan koneksi untuk diambil dari CDN bila tidak dikonfigurasi ke host sendiri.

`bottle-1.glb` berukuran 15.110.248 byte (sekitar 14,41 MiB); base64-nya 20.147.000 karakter. Frontend tidak menerapkan batas 10 MiB: itu target optimasi, bukan penolakan otomatis. Model ini lolos pemeriksaan header GLB v2, tidak membutuhkan buffer/tekstur eksternal, dan berhasil dimuat dalam uji Chromium melalui HTTP serta dokumen HTML lokal. Uji Android fisik masih diperlukan. Viewer kini melaporkan status load/error dan menyediakan Coba lagi; pemuatan yang tidak selesai dalam 60 detik menampilkan pesan gagal, bukan area kosong.

Render keadaan akhir langkah dapat dipakai sebagai gambar demo. `illustration_prompt` disediakan bila nanti ingin membuat ilustrasi tindakan; prompt belum dieksekusi dan tidak menghasilkan file gambar otomatis.

## Menjalankan konten contoh

Aktifkan `EXPO_PUBLIC_USE_FIXTURES=true`, mulai proyek contoh baru, lalu pilih **Tempat pensil polkadot pink** dan buat panduan. Dua ide alternatif tetap memakai fixture sebelumnya; urutan mesh paket ini hanya cocok dengan ide tempat pensil.

Setelah penambahan konfigurasi Metro, restart Expo dengan `npx expo start --clear`. Di setiap page proses, tekan **Model 3D** untuk memutar/zoom model, lalu **Ilustrasi 2D** untuk kembali ke gambar.
