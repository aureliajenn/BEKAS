# BEKAS — To-do Development untuk AI

**Tanggal:** 15 Oktober 2026  
**Acuan:** [PRD v1.2](../PRD.md), [rencana implementasi](../IMPLEMENTATION_PLAN.md), dan audit source terbaru.  
**Tujuan:** satu foto baru dari Android menghasilkan mesh melalui Vast.ai, tiga ide, panduan, dan ilustrasi tanpa operasi manual per foto.

## Status awal

- Frontend lima layar tersedia, tetapi alur masih memakai fixture lokal.
- Backend memiliki endpoint proyek/upload, guide/retry, dan endpoint worker; beberapa jalur nyata masih memiliki bug runtime.
- Worker GPU memiliki kode polling, heartbeat, adapter SF3D/TripoSR, dan validasi GLB; inferensi GPU nyata belum terverifikasi.
- Migration tersedia; runner OpenAI, integrasi mobile/API, dan bukti deployment end-to-end belum tersedia.
- Audit lokal: TypeScript lulus, backend 17 tes lulus, worker 7 tes lulus. Tes backend memakai dependency palsu; tes worker belum membuktikan inferensi model nyata.
- Expo Doctor saat audit: 20/21 lulus dengan lima paket perlu pembaruan patch. Full Ruff backend: 11 temuan. Jumlah ini baseline, bukan hasil verifikasi setelah perbaikan.

Semua checkbox di bawah adalah pekerjaan yang masih perlu diselesaikan atau dibuktikan. Kode yang sudah ada tidak perlu dibangun ulang; periksa dan lanjutkan implementasinya.

## Urutan dan dependensi

| Kelompok | Prioritas | Dependensi | Hasil utama |
|---|---|---|---|
| A. Bug runtime dan kontrak backend | P0 | Tidak ada | API dasar tidak gagal pada jalur nyata |
| B. Database, lifecycle, dan recovery | P0 | A | Antrean dan proyek konsisten saat retry/restart |
| C. Integrasi frontend dan pemulihan lokal | P1 | Kontrak A; integrasi nyata membutuhkan B dan G | Mobile mengakses proyek backend |
| D. Runner AI teks | P1 | A, B; akses OpenAI dari G | Ide dan panduan dihasilkan dari foto |
| E. Ilustrasi bertahap | P1 | D; Storage dari G | Ilustrasi per langkah tanpa menahan teks |
| F. Worker GPU Vast.ai | P1 | A, B; instance dari G | Foto diproses menjadi GLB otomatis |
| G. Infrastruktur dan deployment | P0/P1 | Setup akun dapat dimulai; deployment memakai A/B | API, Storage, dan worker dapat dijangkau |
| H. QA, evaluasi, dan rilis demo | P1 | C, D, E, F, G | Alur lengkap terbukti pada HP fisik |

```text
A → B ─┬→ C ───────────┐
       ├→ D → E ───────┤
       └→ F ───────────┤→ H
G: akun/setup → deployment dan verifikasi integrasi di tiap kelompok
```

C, D, dan F dapat menjadi paket kerja terpisah setelah kontrak A stabil. E menunggu kontrak panduan D. Jika beberapa AI mengerjakan paket berbeda, sepakati pemilik file bersama seperti `main.py`, `config.py`, schema, migration, dan `docs/api-contract.md` sebelum mengedit.

## A. Bug runtime dan kontrak backend

**Scope:** `services/api/app/config.py`, `routes/`, `services/storage.py`, `schemas/`, `gpu/worker/`, dan `docs/api-contract.md`.  
**Gate:** create → signed upload → start → status, serta claim/heartbeat/retry, tidak gagal karena kontrak internal.

- [x] **A1 — Streaming foto:** ganti iterator sinkron `response.iter_bytes()` dengan `async for ... response.aiter_bytes()` dalam download async. Pertahankan batas byte selama transfer. Tambahkan regresi memakai `httpx.AsyncByteStream`, bukan hanya respons dengan `content` yang sudah dimuat.
- [x] **A2 — Lease configuration:** deklarasikan `worker_lease_seconds` pada Settings dengan default 90 detik dan validasi positif. Verifikasi `WORKER_LEASE_SECONDS` dari environment benar-benar dibaca oleh claim dan heartbeat.
- [x] **A3 — Retry response:** samakan key `id`/`job_id` pada repository dan route. Uji route dengan bentuk respons repository sebenarnya, bukan fake yang sudah memperbaiki mismatch.
- [x] **A4 — Batas file:** selaraskan mobile, backend, worker, bucket, dan env contoh. Baseline: input ≤5 MiB, sisi gambar ≤1.536 px, GLB target ≤10 MiB. Jika benchmark memerlukan batas berbeda, perbarui kontrak dan PRD secara eksplisit.
- [ ] **A5 — Kontrak API:** kunci bentuk upload target, `IdeasResult`, `GuideResult`, status komponen, ilustrasi, metadata fallback, UUID, dan error. Gunakan tipe UUID pada endpoint/claim agar input tidak valid tidak mencapai cast SQL sebagai error 500.
- [ ] **A6 — Error handling:** pastikan validation error, konflik idempotency, storage gagal, claim stale, dan provider tidak tersedia punya `code`, `message`, `retryable`, serta `job_id` bila relevan. Jangan mengirim secret/provider credential dalam respons.
- [x] **A7 — Regression checks:** jalankan tes backend, compile Python, dan full Ruff. Tangani temuan sesuai aturan project; dokumentasikan pengecualian yang memang perlu, bukan menonaktifkan pemeriksaan secara luas.

**Bukti selesai:** tes streaming, Settings, retry, dan invalid UUID lulus; wire contract diperbarui; jalur API diuji tanpa fake yang menutupi bug repository.

## B. Database, lifecycle, dan recovery

**Scope:** `database/migrations/`, `services/api/app/repositories/`, lifecycle jobs, dan tes integrasi Postgres.  
**Gate:** proyek tidak hilang, antrean tidak ganda, dan slot aktif tidak terkunci permanen.

- [x] **B1 — Definisi slot aktif:** tetapkan kapan proyek memakai/melepaskan satu dari dua slot pemrosesan. Bedakan hasil tersimpan dengan proyek yang masih memproses; panduan baru pada proyek lama harus mematuhi batas yang sama. Selaraskan dengan PRD sebelum mengubah transisi status.
- [ ] **B2 — Release slot:** implementasikan transisi setelah job terkait mencapai state terminal, termasuk gagal. Saat ini proyek yang dimulai tetap `active`, sehingga dua proyek dapat memblokir seluruh input berikutnya.
- [ ] **B3 — Upload expiry:** verifikasi expiry pada create ulang, start, dan pembacaan status. Proyek upload terbengkalai tidak menahan kapasitas; expired harus terlihat konsisten di API.
- [ ] **B4 — Idempotency:** uji create ganda, start ganda, guide ganda, retry ganda, serta reuse key untuk operasi berbeda. Konflik tidak boleh menghasilkan duplicate job atau raw database error.
- [ ] **B5 — Lease/recovery:** terapkan recovery lease kedaluwarsa, batas total claim, token baru per attempt, dan penolakan completion stale. Batas total claim harus ditegakkan backend meskipun heartbeat masih aktif.
- [ ] **B6 — Completion:** verifikasi path/bucket/attempt, ukuran, checksum aktual, dan struktur GLB sebelum hasil diaktifkan. Completion sukses duplikat harus idempoten; claim lama tidak boleh mengaktifkan hasil baru.
- [ ] **B7 — Transaksi:** pertahankan commit aset aktif + job dalam satu transaksi; panduan valid + job ilustrasi juga satu transaksi. Retry memakai job yang sama dan path output per-attempt.
- [ ] **B8 — Tes Postgres nyata:** uji claim bersamaan, satu job GPU global, rollback, unique constraint, active-slot guard, lease expiry, dan stale completion memakai database pengujian terisolasi. Jangan memakai database/data demo untuk tes yang menghapus data.
- [ ] **B9 — Migration:** tambahkan migration baru untuk kolom/constraint yang diperlukan; jalankan urutannya dari database kosong serta database yang sudah memakai migration sebelumnya.

**Bukti selesai:** laporan tes integrasi menunjukkan request bersamaan/restart tidak membuat pekerjaan atau hasil aktif ganda; dua proyek terminal tidak memblokir proyek ketiga.

## C. Integrasi frontend dan pemulihan lokal

**Scope:** `apps/mobile/src/services/`, `state/`, `hooks/`, `types/`, dan lima layar yang sudah tersedia.  
**Gate:** pengguna mengirim foto baru ke backend dan melihat status/hasil sebenarnya.

- [x] **C1 — API client:** tambahkan client bertipe dari kontrak A, timeout, pemetaan error, serta adapter terpisah untuk mode live/fixture. Jangan membuat respons fixture sebagai fallback diam-diam untuk kegagalan live.
- [x] **C2 — Upload flow:** implementasikan create → signed upload → start. Simpan UUID proyek dan idempotency key sebelum operasi berikutnya agar retry tidak membuat proyek baru.
- [x] **C3 — Upload recovery:** terbitkan ulang signed target lewat create idempoten saat masih upload-pending. Tangani upload sukses tetapi start/response terputus tanpa menggandakan input.
- [x] **C4 — Polling:** gunakan TanStack Query untuk status foreground 2–3 detik; perlambat saat antrean panjang, hentikan ketika background, refetch saat kembali aktif, dan hentikan saat job terminal.
- [x] **C5 — Hasil:** hubungkan status mesh, ide, panduan, dan ilustrasi secara terpisah. Ganti `GlbViewer status="unavailable"` dengan status/URL backend; ide tetap bisa dipilih ketika mesh gagal.
- [x] **C6 — Panduan live:** tombol “Buat panduan” memanggil API dan menampilkan teks setelah tersedia; ilustrasi tidak menahan teks. Koneksi terputus tidak menghapus hasil tersimpan.
- [x] **C7 — Progres lokal:** buka ulang panduan yang sama tanpa reset checklist. Refetch local state saat layar fokus; serialisasikan penyimpanan checkbox agar tap cepat tidak menimpa progres.
- [x] **C8 — UX state:** implementasikan upload pending/gagal, foto perlu diganti, antrean GPU, memproses, gagal, retry, URL kedaluwarsa, dan offline. Jangan menampilkan persen komputasi palsu atau checkmark yang mengklaim foto sudah dianalisis.
- [x] **C9 — Viewer:** handle load/error WebView dan kegagalan GLB, refresh signed URL, serta tampilkan batas “bukan ukuran nyata” saat mesh siap. Batasi navigasi dan gunakan script versi terkunci yang di-host backend atau dibundle.
- [ ] **C10 — Device recovery:** uji izin kamera ditolak, picker dibatalkan, orientasi foto, dan pemulihan Android pending picker result. Pastikan file foto tetap tersedia setelah restart.
- [ ] **C11 — Dependency/UI checks:** update patch Expo yang direkomendasikan SDK, lalu jalankan TypeScript, Expo Doctor, dan export Android. Pertahankan arah desain dari `design/`; periksa layout pada layar kecil dan ukuran teks besar.

**Bukti selesai:** HP membuat UUID backend, foto tersimpan di Supabase, polling menampilkan hasil live, dan reopen memulihkan proyek serta checklist.

Implementasi C1–C9 selesai pada source; TypeScript, Expo Doctor, dan Android export lulus. Gate live/device tetap belum terbukti; C10 dan C11 menunggu uji perangkat serta pemeriksaan layout.

## D. Runner AI teks: ide dan panduan

**Scope:** `services/api/app/jobs/`, adapter OpenAI, prompt, schema AI, dan repository hasil.  
**Gate:** foto baru menghasilkan tiga ide dan panduan Indonesia melalui API nyata.

Implementasi source untuk consumer, claim/recovery, provider, prompt, validasi, persistensi, dan retry policy sudah ditambahkan. OpenAI docs mengonfirmasi capability model, tetapi project access belum diuji; belum ada Postgres pengujian terisolasi atau dataset foto tim. Checkbox D tetap menunggu smoke/integration/evaluation evidence.

- [ ] **D1 — Provider access:** verifikasi model ID, vision, Structured Outputs, dan project API yang benar-benar tersedia. Jangan menganggap kandidat model PRD sudah dapat dipakai.
- [ ] **D2 — Consumer persisten:** jalankan runner async melalui lifespan FastAPI, satu Uvicorn worker. DB sumber pekerjaan; bukan daftar task in-memory atau BackgroundTasks sebagai antrean.
- [ ] **D3 — Claim CPU:** implementasikan claim atomik, lease, attempt, timeout, startup recovery, dan shutdown untuk `ideas`/`guide`. Maksimal dua job teks aktif; slot teks terpisah dari ilustrasi.
- [ ] **D4 — Ide:** gunakan foto asli ternormalisasi, keluarkan profil objek dan tepat tiga ide berbeda untuk input diterima. Foto ambigu/tidak sesuai menghasilkan `needs_new_photo` dengan penjelasan.
- [ ] **D5 — Panduan:** validasi idea milik proyek; hasilkan bahan, alat, peringatan, 4–6 langkah berurutan, expected result, dan illustration prompt. Estimasi waktu ditampilkan konsisten dengan ide atau kontrak yang disepakati.
- [ ] **D6 — Persist hasil:** simpan JSON tervalidasi dan status job secara atomik. Simpan panduan sebelum ilustrasi dijalankan dan antrekan seluruh ilustrasi dalam transaksi yang sama.
- [ ] **D7 — Failure policy:** tangani refusal, output terpotong, invalid schema, 429/5xx, quota/auth, timeout, dan fallback kualitas. Backoff terbatas, hormati `Retry-After`, tanpa retry tak terbatas untuk kegagalan permanen.
- [ ] **D8 — Prompt/evaluation:** ikuti batas PRD untuk material/ukuran tidak pasti dan alat sederhana. Uji lima foto awal lalu dataset acceptance; simpan hasil penilai, latency, usage, versi prompt/model, dan alasan fallback.

**Bukti selesai:** satu foto baru memberi tiga ide yang tersimpan; pilihan ide memberi panduan valid tanpa bergantung pada keberhasilan mesh.

## E. Ilustrasi bertahap dan budget API

**Scope:** runner job `illustration`, adapter image generation, Storage, dan status per langkah.  
**Gate:** teks langsung terbaca; setiap langkah memiliki ilustrasi atau kegagalan yang dapat ditangani.

- [ ] **E1 — Image API:** verifikasi model image yang tersedia dan dukungan referensi foto. Kunci gaya visual, keadaan sebelum/sesudah, serta konteks panduan lengkap.
- [ ] **E2 — Antrean:** proses satu ilustrasi aktif, langkah awal dahulu, lalu langkah selanjutnya; jangan menghabiskan slot job teks.
- [ ] **E3 — Aset:** validasi MIME/decode/ukuran, unggah ke path per-attempt, dan commit aset + job atomik. Nomor/caption langkah dirender aplikasi.
- [ ] **E4 — Retry per langkah:** kegagalan satu gambar tidak menghapus teks atau gambar lain. Retry hanya target eligible; UI menampilkan placeholder dan alasan yang berguna.
- [ ] **E5 — Budget:** simpan usage/biaya terukur, tetapkan alokasi bersama pengguna, dan hentikan dispatch gambar baru saat batas tercapai. Jangan mengklaim hard billing cap provider hanya dari estimator aplikasi.
- [ ] **E6 — Kejujuran contoh:** fixture hanya untuk proyek contoh yang sesuai dan selalu berlabel; jangan mengganti ilustrasi gagal dari foto baru dengan fixture seolah hasil live.

**Bukti selesai:** panduan tampil sebelum gambar siap, gambar muncul bertahap, retry satu langkah bekerja, dan kondisi budget tercapai diuji.

## F. Worker GPU dan inferensi Vast.ai

**Scope:** `gpu/worker/`, adapter model, packaging container, dan integrasi `/worker/jobs/*`.  
**Gate:** satu foto backend menghasilkan GLB melalui worker tanpa sentuhan operator.

- [ ] **F1 — Model compatibility:** checkout revisi SF3D/TripoSR yang dipin; periksa CUDA, PyTorch, tipe GPU/VRAM, return type API model, dan ekspor GLB. Jalankan model nyata; fake subprocess tidak membuktikan adapter benar.
- [ ] **F2 — Packaging:** buat image/container atau startup template Vast.ai yang dapat direproduksi, environment model terisolasi bila diperlukan, serta cache bobot. Pin dependency setelah smoke test berhasil.
- [ ] **F3 — Warm worker:** model siap sebelum polling claim; satu inferensi aktif. Monitor restart proses model dan shutdown/claim cancellation agar tidak meninggalkan proses GPU aktif.
- [ ] **F4 — Fallback:** batasi SF3D → TripoSR untuk kegagalan model/ekspor yang relevan, sekali per eksekusi. Jangan menganggap fallback memperbaiki GPU hilang/OOM. Pastikan SF3D berhenti sebelum bobot TripoSR dimuat.
- [ ] **F5 — Output validation:** kegagalan validasi hasil SF3D yang eligible harus masuk fallback. Validasi GLB mencakup struktur dan aset yang dapat dirender, bukan header/asset version saja.
- [ ] **F6 — Transfer/recovery:** uji input checksum salah, async transfer terputus, heartbeat gagal, URL kedaluwarsa, upload sukses tetapi completion response hilang, dan lease stale. Retry completion harus idempoten.
- [ ] **F7 — Timing:** catat startup, preprocessing, inferensi primary/fallback, ekspor, download/upload, completion, dan total. Pertahankan durasi primary yang gagal saat fallback agar total tidak menyesatkan.
- [ ] **F8 — Live smoke test:** jalankan claim → download → SF3D/TripoSR → validasi → upload → complete pada instance Vast.ai dan backend/Supabase nyata. Cocokkan job/attempt dan lihat GLB di Android.

**Bukti selesai:** GLB dari foto baru tersimpan aktif, job succeeded, mesh terbuka di HP, dan worker restart tidak mengaktifkan hasil dari claim lama.

## G. Infrastruktur, akun, dan deployment

**Scope:** env, Supabase setup, deployment FastAPI, Vast.ai runtime, dan dokumentasi runbook.  
**Gate:** seluruh komponen live dapat berkomunikasi dengan konfigurasi yang tercatat.

### Membutuhkan akses/keputusan pengguna

- [ ] **G1 — Akun dan anggaran:** sediakan akses Supabase, OpenAI, Vast.ai, Hugging Face bila gated, serta hosting API aktif. Konfirmasikan budget dan pilihan instance; jangan menganggap kredit gratis tersedia.
- [ ] **G2 — Supabase:** apply migration berurutan, buat private `bekas-assets`, selaraskan limit/MIME, verifikasi raw URL ditolak serta role client tidak dapat mengakses tabel langsung.
- [ ] **G3 — Vast.ai:** sewa on-demand, ukur VRAM dan harga GPU/storage/bandwidth, cek saldo/auto-billing, dan catat host/runtime. Lifecycle sewa ditangani tim pada MVP.

### Dapat dikerjakan AI pada repo

- [ ] **G4 — API deployment:** tambah Dockerfile atau konfigurasi Render yang konsisten dengan satu proses API + runner. Gunakan `/health` untuk liveness dan `/ready` untuk dependency readiness; koneksi GPU membutuhkan backend HTTPS publik.
- [ ] **G5 — Secrets:** backend memegang DB/OpenAI/Supabase credentials; worker hanya backend URL, token worker, identitas worker, dan akses model. Env contoh tidak berisi nilai nyata.
- [ ] **G6 — Reproducibility:** dokumentasikan versi dependency yang diuji, environment Python backend/worker, migration, startup/restart, serta pemulihan saat deployment gagal.
- [ ] **G7 — Observability:** log project/job ID, attempt, model, error code, provider request ID, timing, dan usage. Jangan log secret, signed URL, base64, atau isi foto.
- [ ] **G8 — Lifecycle biaya:** dokumentasikan stop/destroy, biaya idle/storage, penyimpanan output sebelum destroy, dan fallback demo bila saldo/GPU tidak tersedia.

**Bukti selesai:** URL API hidup, readiness lulus, bucket private terverifikasi, worker terhubung, dan runbook dapat diikuti tim.

## H. QA end-to-end, evaluasi, dan APK

**Scope:** dataset, integration tests, laporan acceptance, Android build, serta demo.  
**Gate:** klaim PRD dibuktikan oleh hasil nyata, bukan fixture atau checkbox source.

- [ ] **H1 — Dataset:** siapkan foto milik tim untuk sepuluh input dalam scope, plus foto transparan/ambigu/tidak sesuai untuk uji terpisah. Simpan metadata sumber dan kondisi input.
- [ ] **H2 — Golden path:** uji foto baru → upload → mesh → tiga ide → panduan → ilustrasi pada HP fisik; ide/panduan tetap berjalan jika mesh gagal.
- [ ] **H3 — Recovery:** uji tap ganda, app reopen, background/foreground, API restart, worker mati, signed URL expiry, lease expiry, stale completion, dan koneksi terputus.
- [ ] **H4 — Test coverage:** tambah tes yang mengeksekusi repository/SQL dan worker API lifecycle. Catat batas tes palsu dibanding integration/device tests.
- [ ] **H5 — Acceptance report:** isi AC1–AC8 dengan hasil, denominator, latency per tahap, ukuran GLB, usage/biaya, dan kegagalan. Jangan menyebut target sebagai benchmark yang sudah tercapai.
- [ ] **H6 — Viewer/illustration QA:** rotate/zoom/tekstur dan kegagalan WebGL diuji di perangkat; ilustrasi diperiksa kesesuaiannya dengan instruksi. Label fallback dan contoh tersimpan terlihat.
- [ ] **H7 — Contoh cadangan:** simpan tiga proyek lengkap berlabel dengan foto/GLB/JSON/ilustrasi dan manifest yang cocok; rekam alur live sebagai cadangan demo.
- [ ] **H8 — APK:** konfigurasi EAS atau build Android yang dipilih, buat APK, pasang di perangkat demo, lalu uji ulang alur utama pada build tersebut.
- [ ] **H9 — Submission:** selaraskan README/PRD/rencana, sertakan model/lisensi, batas mesh, cara menjalankan komponen, env tanpa secret, serta runbook demo dan biaya.

**Bukti selesai:** APK dan laporan AC tersedia; satu alur live berhasil dan keterbatasan yang tersisa tercatat.

## Instruksi singkat untuk AI pelaksana

Gunakan template ini untuk satu kelompok atau subset task:

```text
Kerjakan kelompok [A–H], task [ID], pada docs/development-todo.md.
Baca source terbaru, PRD, dan kontrak terkait terlebih dahulu.
Pertahankan pekerjaan yang sudah ada; perubahan dibatasi scope task.
Jika kontrak lintas komponen perlu berubah, perbarui dokumentasi dan consumer terkait.
Jalankan verifikasi yang relevan. Jangan centang task tanpa bukti selesai.
Jika akun, credential, GPU, atau perangkat belum tersedia, catat blocker dan
selesaikan pekerjaan repo yang independen; jangan mengarang hasil pengujian live.
Laporkan file berubah, perintah/hasil verifikasi, task selesai, dan blocker.
```

## Perintah verifikasi dasar

Jalankan dari direktori komponen yang disebut; tes integrasi/provider memakai environment pengujian tersendiri.

**`services/api` — environment Windows lokal:**

```powershell
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\ruff check app tests
.\.venv\Scripts\python -m compileall -q app tests
```

**`apps/mobile`:**

```powershell
npm run typecheck
npx expo-doctor
npx expo export --platform android
```

**`gpu/worker` — Python environment worker yang sudah terpasang:**

```text
python -m pytest
python -m ruff check bekas_gpu_worker tests
```

Tes lokal yang lulus tetap harus dilengkapi smoke test Supabase/OpenAI/Vast.ai dan pengujian HP untuk menutup task integrasi.
