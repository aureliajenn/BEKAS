# Aset demo BEKAS buatan tim

## Paket tempat pensil

Paket `tempat-pensil/` berisi konten dummy, lima GLB dan lima ilustrasi tim yang sudah dihubungkan ke frontend. Lihat `tempat-pensil/README.md` untuk pemetaan pratinjau foto, model awal hasil barang, dan lima page proses. Petunjuk `botol-pot/` di bawah tetap merupakan template paket awal, bukan nama paket aktif.

Taruh model 3D dan gambar referensi di sini. Mulai dengan satu paket: **`botol-pot/`**. Nama folder boleh diganti sesuai objek/kerajinan yang benar-benar kalian buat; sesuaikan `id` dan path dalam `manifest.json`.

**Status paket aktif:** `tempat-pensil/` sudah terhubung dan berlabel **Contoh tersimpan**. Jangan menambahkan `require()` untuk file template yang belum ada; itu akan menggagalkan build Metro.

## Data yang perlu disiapkan

### Wajib untuk demo awal

| Data | Lokasi | Keterangan |
|---|---|---|
| Model objek utuh | `botol-pot/models/source.glb` | Model yang akan diputar/zoom di viewer |
| Render depan | `botol-pot/references/front.jpg` | Referensi visual untuk AI |
| Render samping | `botol-pot/references/side.jpg` | Bentuk dan bagian samping objek |
| Render perspektif | `botol-pot/references/perspective.jpg` | Gambar utama objek; juga bisa menjadi thumbnail |
| Metadata objek | `botol-pot/manifest.json` | Nama, deskripsi, bagian terlihat, sumber aset, batas penggunaan |

Ketiga render harus memperlihatkan **model objek yang sama**, utuh, latar sederhana, dan pencahayaan jelas. Gunakan JPEG/PNG; bila memakai PNG, ubah ekstensi di manifest. Tidak perlu foto hasil kerajinan jika belum ada.

**Untuk instruksi/gambar AI:** GLB dipakai viewer, bukan dikirim langsung sebagai input vision. Backend nanti mengirim render + metadata objek ke OpenAI. Instruksi dan ilustrasi baru tidak perlu dibuat manual untuk mengisi folder ini.

### Wajib bila ingin panduan mengikuti model perubahan bentuk

| Data | Lokasi | Keterangan |
|---|---|---|
| Model per tahap | `botol-pot/stages/step-01.glb`, dst. | Satu model untuk tiap langkah yang mengubah bentuk; langkah membersihkan/menandai dapat memakai model yang sama |
| Render per tahap | `botol-pot/references/step-01.jpg`, dst. | Referensi gambar untuk AI menjelaskan dan mengilustrasikan tahap tersebut |
| Urutan tindakan | `stages` dalam manifest | 4–6 langkah: tindakan utama, keadaan sebelum/sesudah, model yang cocok, alat dan peringatan |
| Tujuan kerajinan | `craft` dalam manifest | Nama hasil, fungsi, alat, bahan tambahan dan batas yang harus diikuti AI |

Kalau hanya punya model utuh, biarkan `stages: []`. AI dapat menghasilkan panduan, tetapi aplikasi tidak boleh mengklaim memiliki model 3D perubahan bentuk atau pola potong presisi.

Kalau membuat tahap untuk **satu kerajinan**, urutan itu hanya boleh digunakan untuk kerajinan tersebut. Tiga ide AI bebas tidak otomatis cocok dengan model tahap yang sama.

### Opsional

- `references/finished.jpg`: render/foto hasil akhir sebagai referensi ilustrasi.
- Dimensi yang diketahui: isi `dimensions_mm` dengan ukuran objek contoh yang benar-benar diukur/didesain. Bukan hasil pengukuran kamera. Biarkan `null` jika tidak diketahui.
- File Blender/CAD asli: simpan di tempat kerja tim, bukan bundle mobile. Ekspor `.glb` final ke folder ini.

## Ketentuan ekspor

- GLB v2 (`.glb`), satu file dengan tekstur tertanam; hindari referensi texture eksternal.
- Orientasi konsisten, objek di tengah, skala konsisten antar-tahap.
- Target optimasi tiap GLB maksimal **10 MiB**; bukan batas otomatis viewer. Model awal tempat pensil saat ini sekitar 14,41 MiB. Tiap render maksimal **5 MiB**, sisi panjang maksimal **1.536 px** untuk jalur input yang ada.
- Periksa di viewer: tekstur tampil, tidak terbalik, bisa diputar dan zoom.
- Pakai aset milik tim atau berizin; isi pembuat, lisensi/izin, dan sumber.
- Jangan commit file besar tanpa kebutuhan; bila melebihi batas, gunakan Storage dan catat lokasi pada metadata setelah integrasi.

## Cara mengisi

1. Salin file sesuai tabel wajib ke subfolder yang tersedia.
2. Edit `manifest.json`; ganti semua teks `ISI ...` dengan data nyata.
3. Untuk demo perubahan bentuk, isi `craft` dan `stages` mengikuti contoh di README paket.
4. Setelah file lengkap dan diperiksa, ubah `ready_for_integration` menjadi `true`. Flag ini hanya penanda handoff, bukan validator otomatis.
5. Beri tahu agent paket mana yang siap agar dihubungkan lewat `src/theme/assets.ts`, fixture selector, viewer, dan backend input AI.

## Tampilan yang harus dipertahankan

- Model buatan tim diberi label **“Contoh tersimpan”** dan keterangan model referensi, bukan hasil scan foto baru.
- Instruksi/ilustrasi live diberi keterangan **“Dibuat AI berdasarkan objek contoh”**; jangan menandainya sebagai hasil AI bila sebenarnya fixture.
- Jangan memasangkan model contoh berbeda dengan foto pengguna tanpa penjelasan.
- Folder ini tidak mengubah jalur SF3D yang sudah ada. Pemilihan mode aset terkurasi dan integrasi OpenAI merupakan langkah implementasi berikutnya.
