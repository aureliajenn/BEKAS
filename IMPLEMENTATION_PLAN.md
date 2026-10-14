# BEKAS — Rencana Implementasi MVP

**Acuan:** [PRD v1.1](PRD.md)  
**Tanggal:** 14 Oktober 2026  
**Estimasi:** 48 jam, 3–4 anggota; sesuaikan saat durasi acara diketahui.  
**Status:** rencana kerja; checkbox belum menandakan implementasi selesai.

## 1. Hasil yang dituju

Satu perjalanan di Android fisik: foto/galeri → upload → mesh interaktif dan 3 ide → pilih ide → panduan Indonesia 4–6 langkah → ilustrasi bertahap. Proyek dapat dibuka kembali dari ID lokal; ide dan panduan tetap berjalan ketika mesh gagal.

### Keputusan tetap

| Area | Keputusan implementasi |
|---|---|
| Mobile | React Native + Expo + TypeScript + Expo Router |
| Backend | FastAPI + Pydantic + OpenAI Python SDK; satu Uvicorn worker dan runner async |
| Database | Supabase Postgres; tabel `projects`, `jobs`, `assets` |
| File | Supabase Storage private; upload/download memakai signed URL |
| Autentikasi pengguna | Tidak dibuat: tanpa login, registrasi, anonymous sign-in, JWT pengguna, tabel user, atau `owner_id` |
| Pemulihan proyek | UUID proyek di AsyncStorage; progres centang lokal per proyek/langkah |
| Antrean | Postgres dengan claim atomik, lease, retry terbatas, dan idempotency |
| GPU cloud | Google Colab Free, inferensi interaktif yang dijalankan operator |
| Integrasi GPU | CLI di laptop untuk claim, heartbeat, ekspor input, dan impor hasil notebook |
| Model 3D | SF3D utama; TripoSR fallback sekali dalam eksekusi yang sama |
| Viewer | WebView + `<model-viewer>` versi terkunci, GLB rotate/zoom |
| Model OpenAI | Konfigurasi dari env; kandidat PRD wajib diverifikasi akses dan kualitasnya pada fase 0 |
| Hosting | Render service aktif sesuai PRD; biaya backend/API terpisah dari notebook gratis |

**Batas mode gratis:** Colab Free tidak menjalankan distributed worker, polling antrean backend, server aplikasi, atau public tunnel. Operator memindahkan file secara manual dan menjalankan sel notebook. CLI laptop hanya menangani satu job yang dipilih operator. Demo menyebut bantuan operator tersebut secara terbuka.

**Batas akses MVP:** proyek berada dalam ruang demo bersama tanpa isolasi akun. UUID bukan autentikasi. Kredensial database dan OpenAI tetap di backend; token internal CLI hanya melindungi endpoint operasi job. Tidak membuat sistem akun untuk memperoleh token tersebut.

## 2. Struktur repositori yang akan dibuat

```text
bekas/
├── PRD.md
├── IMPLEMENTATION_PLAN.md
├── README.md
├── apps/mobile/
│   ├── app/                    # Lima layar dan routing
│   └── src/                    # API client, komponen, polling, penyimpanan lokal
├── services/api/
│   ├── app/
│   │   ├── routes/             # Endpoint proyek, worker internal, health
│   │   ├── schemas/            # Pydantic input/output dan hasil AI
│   │   ├── repositories/       # Query serta transaksi Postgres
│   │   ├── services/           # Storage, OpenAI, validasi aset
│   │   └── jobs/               # Runner CPU, lease, retry, recovery
│   └── tests/                  # Integrasi antrean/API dan validator kritis
├── gpu/
│   ├── notebooks/             # Notebook Colab interaktif
│   └── adapters/              # Preprocessing, SF3D, TripoSR, ekspor GLB
├── tools/operator/            # CLI laptop, heartbeat, validasi impor
├── database/migrations/       # Schema, indeks, constraint, pembatasan akses client
├── fixtures/                  # Foto tim dan manifest proyek contoh
└── docs/                      # Kontrak, runbook demo, catatan evaluasi
```

Dependensi dikunci setelah spike berhasil. File besar seperti bobot model tidak dimasukkan ke repositori; fixture besar dapat disimpan di Storage dengan manifest unduhan.

## 3. Urutan dan dependensi

```text
Fase 0: buktikan GPU gratis + viewer Android + akses API
    ↓
Fase 1: kontrak + database + upload + deployment
    ↓
Fase 2: satu alur nyata lengkap
    ↓
Fase 3: recovery + seluruh ilustrasi + fallback
    ↓
Fase 4: evaluasi 10 foto + feature freeze
    ↓
Fase 5: perbaikan + APK + demo + submission
```

Setelah kontrak terkunci, mobile membangun layar dengan fixture, backend mengerjakan antrean/AI, dan anggota AI/GPU mengerjakan notebook secara paralel. Integrasi awal wajib selesai sebelum memperluas fitur.

## 4. Fase 0 — Validasi kelayakan (jam 0–4)

**Pemilik:** seluruh tim; AI/GPU untuk notebook, mobile untuk viewer, backend untuk API/database.

- [ ] Siapkan 10 foto tim sesuai scope dan pilih satu wadah opak sebagai input integrasi pertama.
- [ ] Buka Colab Free, pilih GPU bila tersedia, catat tipe GPU, VRAM, versi Python/CUDA, serta dependency yang berhasil.
- [ ] Verifikasi akses/lisensi SF3D dan unduh bobot; lakukan satu inferensi interaktif sampai GLB valid.
- [ ] Bila kendala khusus SF3D, coba TripoSR; bila GPU tidak tersedia, catat blocker dan gunakan fixture untuk pengembangan sambil menunggu akses.
- [ ] Buka GLB hasil nyata di WebView Android fisik; uji rotate, zoom, tekstur, dan ukuran file.
- [ ] Verifikasi model teks, Structured Outputs, dan image generation pada project OpenAI. Catat model ID yang benar-benar tersedia; perbarui keputusan bila kandidat PRD tidak dapat digunakan.
- [ ] Jalankan eval awal 5 foto untuk kandidat teks yang tersedia; simpan kualitas, latency, usage, dan error aktual.
- [ ] Buat Supabase project dan backend minimal dengan `/health`, lalu deploy.
- [ ] Sepakati kontrak proyek, status job, error, JSON AI, dan manifest notebook.

**Gate selesai:** satu GLB nyata terbuka di HP, satu hasil teks berskema valid, satu ilustrasi nyata, serta backend terjangkau dari HP. Fixture membantu pengembangan tetapi tidak menggantikan bukti kelayakan GPU.

## 5. Fase 1 — Fondasi data dan upload (target jam 4–8)

### 5.1 Database dan Storage — Backend

- [ ] Buat migration tiga tabel berikut.

| Tabel | Kolom/constraint penting |
|---|---|
| `projects` | UUID PK, input asset, object profile/ideas/guide JSONB, selected idea, schema/prompt/model version, timestamps |
| `jobs` | UUID PK, project FK, kind, optional step ID, status, attempt, claim token, lease expiry, next run, started/completed time, error, timing, usage, idempotency key unik |
| `assets` | UUID PK, project FK, kind, step ID, bucket/path, MIME, size, checksum, source job/attempt |

- [ ] Tambahkan indeks antrean `(status, next_run_at)` dan indeks `project_id`; validasi nilai kind/status dengan constraint.
- [ ] Terapkan constraint/transaction guard agar satu pekerjaan logis tidak memiliki dua hasil aktif; retry memperbarui job yang sama dan memakai path aset per attempt.
- [ ] Batasi satu panduan per proyek pada MVP; pemilihan ulang ide tidak membuat panduan paralel.
- [ ] Aktifkan RLS tanpa policy client `anon`/`authenticated`; akses tabel hanya dari backend dengan kredensial server.
- [ ] Buat private buckets untuk input dan output; uji URL mentah tidak dapat mengunduh aset.
- [ ] Tidak membuat tabel user, session, `owner_id`, relasi `auth.users`, atau integrasi Supabase Auth.

### 5.2 API dasar — Backend

- [ ] `POST /projects`: UUID proyek, status upload-pending, signed upload target; dukung idempotency key dari client.
- [ ] `POST /projects/{id}/start`: validasi file tersedia, MIME/ukuran/decode, lalu simpan job `mesh` dan `ideas` dalam transaksi; respons `202`.
- [ ] `GET /projects/{id}`: status per komponen, hasil valid, job ID mesh untuk operator, metadata aset, dan signed URL baru.
- [ ] Simpan bucket/path sebagai identitas file, bukan signed URL permanen.
- [ ] Tetapkan error terstruktur: `code`, `message`, `retryable`, `job_id` bila relevan.
- [ ] Batasi dua proyek aktif secara global dengan pemeriksaan atomik; proyek upload-pending terbengkalai diberi expiry agar tidak mengunci slot selamanya.

### 5.3 Mobile dasar — Mobile

- [ ] Buat beranda, pratinjau foto, dan layar hasil dengan fixture sesuai kontrak.
- [ ] Integrasikan kamera/galeri; tangani izin ditolak dan pembatalan.
- [ ] Normalisasi orientasi, buang metadata lokasi, resize 1.024–1.536 px, maksimum 5 MB.
- [ ] Jalankan create → signed upload → start; simpan project ID dan idempotency key lokal agar retry tidak menggandakan proyek.
- [ ] Perbarui signed upload target melalui pemanggilan create idempoten selama proyek masih upload-pending.
- [ ] Tambahkan polling foreground 2–3 detik menggunakan satu pola TanStack Query; stop saat background dan refetch saat aktif.

**Gate selesai:** foto HP tersimpan, dua job tercatat sekali, restart aplikasi membuka proyek yang sama tanpa layar login.

## 6. Fase 2 — Satu alur lengkap (target jam 8–12)

### 6.1 Ide dan panduan — Backend + AI

- [ ] Implementasikan `IdeasResult` dan `GuideResult` dengan Pydantic + Structured Outputs.
- [ ] Ide: tepat 3 untuk input diterima; `needs_new_photo` untuk input tidak sesuai.
- [ ] Panduan: 4–6 langkah berurutan, alat, bahan, waktu, peringatan, dan expected result.
- [ ] Tambahkan prompt Indonesia dengan ketidakpastian bahan/ukuran serta batas kerajinan plastik sesuai PRD.
- [ ] `POST /projects/{id}/guide`: validasi `idea_id` milik proyek; create/reuse job secara idempoten.
- [ ] Simpan panduan valid dan job ilustrasi setiap langkah dalam transaksi yang sama.
- [ ] Proses minimal satu ilustrasi nyata; teks sudah bisa dibaca sebelum gambar selesai.
- [ ] Simpan model/version, provider request ID, timing, usage, dan alasan fallback.

### 6.2 Notebook gratis dan CLI operator — AI/GPU + Backend

- [ ] Susun notebook: cek runtime → instal versi terkunci → muat model → unggah input → preprocessing → inferensi → validasi → unduh hasil.
- [ ] Notebook memakai foto berlatar transparan untuk mesh; foto asli ternormalisasi tetap dipakai jalur vision.
- [ ] CLI menerima `job_id` dari layar hasil; claim job tersebut melalui endpoint internal dan unduh paket input.
- [ ] Paket input menyertakan foto dan manifest: `project_id`, `job_id`, `attempt`, `input_sha256`. Claim token hanya disimpan CLI.
- [ ] CLI menjaga heartbeat 20 detik selama operator bekerja; lease 90 detik dan batas total claim 20 menit.
- [ ] Operator unggah paket input ke Colab, jalankan sel secara interaktif, unduh GLB dan manifest hasil.
- [ ] Manifest hasil memuat identitas input/attempt, model/version, fallback, checksum GLB, dan durasi preprocessing/inferensi/ekspor.
- [ ] CLI memvalidasi kecocokan manifest, struktur GLB, checksum, dan file sebelum upload ke path per-attempt.
- [ ] Completion backend memeriksa claim aktif dan aset sebelum mengubah hasil aktif/status dalam transaksi.
- [ ] Bila URL transfer kedaluwarsa, CLI meminta penerbitan ulang melalui heartbeat untuk claim aktif.

### 6.3 UI lengkap — Mobile

- [ ] Layar hasil menampilkan status mesh dan ide terpisah; job queued diberi label “Menunggu operator notebook”.
- [ ] Viewer memuat GLB nyata dengan rotate/zoom; batasi navigasi WebView ke halaman viewer tepercaya.
- [ ] Tambahkan detail ide dan layar panduan dengan placeholder per ilustrasi.
- [ ] Tampilkan teks panduan segera; centang progres tersimpan lokal.
- [ ] Tampilkan label “Contoh tersimpan” ketika memakai fixture/cache demo dan informasi fallback runtime/model.

**Gate selesai:** satu foto baru → inferensi notebook dengan operator → GLB di HP → 3 ide → panduan lengkap → minimal satu ilustrasi nyata. Tidak ada ketergantungan ide/panduan pada mesh.

## 7. Fase 3 — Recovery dan kelengkapan (jam 12–24)

**Pemilik:** backend untuk antrean, AI/GPU untuk fallback, mobile untuk recovery UX.

- [ ] Claim job atomik dengan `FOR UPDATE SKIP LOCKED`; token claim baru setiap attempt.
- [ ] Runner CPU dimulai/dihentikan lewat lifecycle backend; DB menjadi sumber job saat restart.
- [ ] Batasi concurrency: 2 teks, 1 ilustrasi, 1 job mesh; slot teks terpisah dari gambar.
- [ ] Reclaim lease kedaluwarsa; completion claim lama ditolak, completion duplikat claim sukses tetap idempoten.
- [ ] Bedakan waktu antrean, operator, transfer, inferensi, dan download; timeout inferensi mesh 5 menit terpisah dari total claim manual.
- [ ] Terapkan maksimal dua attempt infrastruktur untuk mesh; fallback SF3D → TripoSR sekali per eksekusi, tidak memuat keduanya bersamaan sebelum VRAM terukur.
- [ ] Tetapkan retry teks/gambar terbatas dengan backoff dan `Retry-After`; hentikan retry untuk quota/auth/refusal yang tidak dapat dipulihkan otomatis.
- [ ] `POST /projects/{id}/retry`: hanya job gagal yang masih memiliki budget attempt; request ganda tidak membuat job duplikat.
- [ ] Selesaikan ilustrasi langkah 1 dahulu, kemudian urutan berikutnya. Kegagalan satu gambar tidak menghapus teks atau gambar yang sudah siap.
- [ ] Tangani notebook putus melalui CLI `/fail`; CLI putus melalui lease expiry; queued menunggu operator tidak menghabiskan attempt.
- [ ] Tampilkan status GPU tidak tersedia/gagal, retry, koneksi putus, upload gagal, dan URL kedaluwarsa.
- [ ] Refresh signed URL viewer ketika diperlukan dan uji CORS/WebGL pada HP demo.
- [ ] Terapkan batas biaya aplikasi; hentikan job gambar baru saat alokasi tercapai dengan status/error yang jelas.

**Gate selesai:** reopen aplikasi, backend restart, CLI mati, dan request duplikat tidak menggandakan hasil aktif atau menghilangkan proyek. Seluruh langkah memiliki ilustrasi atau status gagal yang jelas.

## 8. Fase 4 — Evaluasi dan freeze (jam 24–36)

**Pemilik:** semua anggota; QA menjadi pemilik laporan bila ada anggota keempat.

| Uji | Bukti lulus / acuan |
|---|---|
| Kamera dan galeri | Upload berhasil; izin ditolak/pembatalan tidak crash — AC1 |
| 3D di HP | ≥8/10 foto dalam scope membuka GLB valid yang dapat diputar/zoom — AC2 |
| Kualitas ide | Tepat 3 ide; ≥2 masuk akal menurut dua penilai pada ≥8/10 foto — AC3 |
| Panduan | Alat, bahan, 4–6 langkah, waktu, peringatan — AC4 |
| Ilustrasi | Teks tidak terblokir gambar; status gagal/retry per langkah — AC5 |
| Recovery | Restart, double request, lease expiry, dan stale completion — AC6 |
| Kejujuran hasil | Fallback/cache berlabel; tanpa klaim ukuran nyata — AC7 |
| Latency | Target teks dan inferensi mesh sesuai PRD; total waktu manual dilaporkan terpisah — AC8 |
| Tanpa auth pengguna | Semua alur aplikasi berjalan tanpa session/login/JWT pengguna |
| Batas akses teknis | Akses tabel langsung ditolak; bucket private; token CLI invalid ditolak |
| Impor notebook | Manifest salah proyek/attempt/checksum ditolak; hasil benar diimpor sekali |

- [ ] Simpan laporan per foto: kondisi input, model, hasil penilai, waktu tiap tahap, ukuran aset, biaya/usage, dan error.
- [ ] Bedakan foto dalam scope dari input tidak sesuai; uji penolakan input secara terpisah dan tambahkan foto bila penyebut 10 foto dalam scope belum terpenuhi.
- [ ] Uji botol transparan sebagai kasus sulit; dokumentasikan keterbatasan rekonstruksi.
- [ ] Optimalkan GLB menuju ≤10 MB jika diperlukan berdasarkan hasil uji HP.
- [ ] Siapkan 3 proyek lengkap berlabel contoh tersimpan dengan manifest sumber.
- [ ] Jalankan tes otomatis terarah untuk transaksi/idempotency, lease/claim, validator JSON, dan manifest impor; lakukan uji perangkat untuk kamera/WebGL.
- [ ] Freeze fitur pada jam 36. Riwayat tambahan dan koreksi label hanya dikerjakan bila semua Must stabil sebelum freeze.

**Gate selesai:** laporan acceptance berisi hasil terukur, kegagalan yang tersisa tercatat, dan jalur demo utama dipilih berdasarkan bukti.

## 9. Fase 5 — Rilis demo (jam 36–48)

- [ ] Jam 36–44: perbaiki blocker acceptance, buat APK, pasang dan uji pada HP demo.
- [ ] Dokumentasikan setup mobile/API/database/notebook/CLI di README, termasuk env tanpa nilai secret.
- [ ] Siapkan runbook operator: pilih job → claim → transfer input → jalankan notebook → transfer output → impor → periksa hasil di HP.
- [ ] Latih dua kali; salah satunya dengan notebook/CLI terputus dan pemulihan job.
- [ ] Rekam alur nyata sebagai cadangan; siapkan hotspot dan 3 proyek contoh.
- [ ] Jam 44–48: rehearsal final, pitch 3 menit, lisensi/model attribution, hasil evaluasi, dan submission.
- [ ] Periksa GPU sebelum demo; bila tidak tersedia, lanjutkan jalur ide/panduan dan jelaskan penggunaan contoh tersimpan untuk 3D.

**Definition of Done:** APK menjalankan alur utama, backend ter-deploy, notebook free tier terbukti pada uji nyata, impor manual terdokumentasi, seluruh AC memiliki hasil uji, dan keterbatasan demo dijelaskan. AC yang gagal tidak ditandai lulus hanya karena fixture tersedia.

## 10. Konfigurasi awal

| Lokasi | Konfigurasi |
|---|---|
| Mobile | `EXPO_PUBLIC_API_BASE_URL`; tidak ada OpenAI key, database credential, atau worker token |
| Backend | `DATABASE_URL`, `SUPABASE_URL`, Supabase server secret/service key, `OPENAI_API_KEY` |
| Backend model | `TEXT_MODEL`, `TEXT_FALLBACK_MODEL`, `IMAGE_MODEL`; isi berdasarkan hasil verifikasi fase 0 |
| Backend operasi | `WORKER_TOKEN`, batas biaya, batas attempt/concurrency, lease, timeout, expiry upload-pending |
| CLI laptop | URL API dan `WORKER_TOKEN`; claim token hanya untuk pekerjaan aktif |
| Colab | Hugging Face read token jika diperlukan; versi dependency/model; input manual |

Log mencatat project/job ID, attempt, model, timing, usage, dan error; tidak mencatat secrets atau isi foto/base64. Credential penyedia layanan tetap diperlukan untuk koneksi server; hal ini terpisah dari fitur autentikasi pengguna yang ditunda.

## 11. Pembagian tim dan prioritas pemotongan

| Pemilik | Tanggung jawab | Handoff utama |
|---|---|---|
| Mobile | Lima layar, kamera/upload, viewer, polling/resume, APK | API contract dan GLB contoh dari jam awal |
| Backend | Migration, API, Storage, antrean, runner AI, CLI, deployment | Schema JSON dari AI; manifest GPU untuk impor |
| AI/GPU | Colab Free, preprocessing, SF3D/TripoSR, prompt, evaluasi model, operator demo | GLB + manifest; prompt/schema untuk backend |
| QA/UI opsional | Dataset, evaluasi HP, penilaian panduan, demo/pitch | Build terintegrasi dan laporan acceptance |

Jika waktu hanya 24 jam: satu proyek aktif, potong riwayat/koreksi label, gunakan UI sederhana, prioritaskan alur lengkap dan recovery minimum. Hindari menambah login atau otomatisasi Colab sebagai jalan pintas.

## 12. Setelah MVP

1. Pindahkan eksekusi mesh ke runtime yang mendukung worker otomatis; gunakan kontrak claim/complete yang sama.
2. Tambahkan autentikasi pengguna, `owner_id`, otorisasi API, dan RLS kepemilikan sebelum menyediakan proyek privat multi-user.
3. Ukur biaya dan antrean per proyek, lalu tambah riwayat akun, notifikasi, dan dukungan material berdasarkan hasil evaluasi.

**Referensi notebook:** [Google Colab FAQ](https://research.google.com/colaboratory/faq.html), diperiksa 14 Oktober 2026. Free tier tersedia; GPU, kuota, dan durasi runtime tidak dijamin. Referensi stack/model lain mengikuti PRD dan diverifikasi kembali saat setup.
