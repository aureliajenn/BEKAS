# Implementation Plan — Smartphone RGB to Textured 3D Mesh

## Ringkasan

**Prinsip: baseline-first.** Buktikan satu objek berhasil direkonstruksi sebelum automasi, optimasi, atau eksperimen deep learning.

Stack utama:

```text
Python orchestration
→ COLMAP SfM
→ OpenMVS MVS / meshing / texturing
→ Textured mesh: PLY / OBJ / GLB
```

Open3D untuk analisis dan eksperimen geometri. Blender untuk inspeksi, post-processing, dan konversi bila diperlukan.

Target awal: satu objek rigid, matte, bertekstur; 60–100 foto RGB smartphone. Smartphone hanya menjadi perangkat capture. Rekonstruksi berjalan di PC/server, tanpa LiDAR atau depth sensor.

Prioritas:

1. Capture dataset.
2. SfM berhasil.
3. Dense reconstruction berhasil.
4. Mesh berhasil.
5. Automasi pipeline.
6. Improve quality.
7. Evaluation terstandar; logging metrik dimulai sejak baseline.
8. Modern/AI reconstruction experiments.

---

## 1. Arsitektur Sistem

```text
Smartphone
  └── Foto RGB + metadata EXIF
             ↓ transfer file
PC / Server
  └── Python CLI Orchestrator
       ├── Input validation + preprocessing
       ├── COLMAP
       │    ├── SIFT feature extraction
       │    ├── Exhaustive matching
       │    ├── Geometric verification / RANSAC
       │    └── Incremental SfM
       │         ├── Camera pose estimation
       │         ├── Triangulation
       │         └── Bundle adjustment
       ├── Image undistortion
       ├── OpenMVS
       │    ├── Import calibrated scene
       │    ├── Depth estimation + fusion
       │    ├── Mesh reconstruction
       │    ├── Optional refinement
       │    └── Texture mapping
       ├── Export + validation
       └── Metrics + logs + run manifest
             ↓
     PLY / OBJ + MTL + textures / GLB
```

Pose estimation dan bundle adjustment merupakan bagian dari SfM, bukan tahap independen setelah SfM selesai.

### 1.1 Keputusan baseline

| Bagian | Pilihan awal | Alasan |
|---|---|---|
| Orchestration | Python, `subprocess`, `pathlib`, `argparse` | Wrapper CLI sederhana, mudah debug |
| Validasi gambar | Pillow, OpenCV | EXIF, orientasi, blur, resolusi |
| SfM | COLMAP CLI | Mature; GUI membantu diagnosis |
| Matching | SIFT + exhaustive matching | Praktis untuk puluhan hingga sekitar 100 foto |
| Dense reconstruction | OpenMVS | Terhubung langsung dengan meshing dan texturing |
| Mesh baseline | OpenMVS `ReconstructMesh` | Memanfaatkan scene dan visibility kamera |
| Texturing | OpenMVS `TextureMesh` | Proyeksi foto ke texture atlas |
| Analisis geometri | Open3D | Filtering, normals, sampling, distance metrics |
| Inspeksi/konversi | Blender | Mesh, material, UV, GLB |
| Analisis sparse model | PyCOLMAP | Membaca model dan statistik rekonstruksi |
| Metadata eksperimen | JSON + CSV | Cukup untuk MVP |

Pilih satu backend MVS dahulu. COLMAP `patch_match_stereo` + `stereo_fusion` menjadi pembanding berikutnya; tidak perlu menjalankan dua densifier dalam baseline.

### 1.2 Lingkungan development

- Satu PC/server, satu job rekonstruksi per proses.
- Pin versi COLMAP, OpenMVS, Blender, dan Python packages.
- Uji kompatibilitas COLMAP → OpenMVS sebelum automasi.
- Rekomendasi nyaman: RAM 32 GB, SSD, GPU NVIDIA sekitar 8 GB VRAM. Bukan syarat minimum universal.
- OpenMVS menyediakan jalur CPU. Dense stereo bawaan COLMAP membutuhkan CUDA menurut dokumentasi yang dirujuk.
- Ukur runtime dan penggunaan memori pada dataset pertama sebelum menentukan target performa.
- MVP menggunakan filesystem lokal dan CLI. Aplikasi mobile lengkap belum menjadi scope.

---

## 2. Kontrak Input/Output Pipeline

| Tahap | Input | Output | Tool |
|---|---|---|---|
| Ingest | Foto asli + EXIF | Manifest, daftar file valid | Python, Pillow |
| Preprocessing | Foto valid | Working images, metadata transformasi, laporan kualitas | Pillow, OpenCV |
| Feature extraction | Working images, mask opsional | Keypoints/descriptors dalam `database.db` | COLMAP |
| Matching + verification | Features | Matches dan geometrically verified matches | COLMAP |
| SfM | Database + gambar | Intrinsics, poses, tracks, sparse points | COLMAP `mapper` |
| Sparse export | Model SfM terpilih | `sparse.ply`, statistik | COLMAP, PyCOLMAP |
| Undistortion | Model SfM + gambar yang sesuai | Gambar undistorted + kamera yang diperbarui | COLMAP `image_undistorter` |
| Scene conversion | Workspace undistorted | `scene.mvs` | OpenMVS `InterfaceCOLMAP` |
| MVS | Scene + gambar calibrated | Depth maps, dense scene, `dense.ply` | OpenMVS `DensifyPointCloud` |
| Meshing | Dense scene + visibility | Mesh segitiga | OpenMVS `ReconstructMesh` |
| Refinement | Mesh + scene + gambar | Mesh refined | OpenMVS `RefineMesh`, opsional |
| Texturing | Mesh final + kamera + RGB | UV, texture atlas, textured mesh | OpenMVS `TextureMesh` |
| Export | Textured mesh | `model.glb`, OBJ package, `mesh.ply` | OpenMVS/Blender |
| Evaluation | Artefak + logs | `metrics.json`, tabel eksperimen | PyCOLMAP, Open3D, Python |

### 2.1 Aturan artefak

- Simpan model kamera dan `.mvs`, bukan PLY saja. PLY tidak menyimpan seluruh pose, intrinsics, tracks, dan visibility yang dibutuhkan downstream.
- PLY dipakai untuk point cloud atau geometri mesh. Dukungan texture lintas tool terbatas.
- OBJ textured membutuhkan `.mtl` dan file texture pendamping.
- GLB menjadi deliverable utama: mesh, material, texture dalam satu file.
- Simpan raw reconstruction sebelum cleanup agar eksperimen bisa dibandingkan.
- Catat transformasi koordinat dan unit. SfM RGB tidak otomatis menghasilkan skala metrik.

---

## 3. Phase 1 — Dataset & Capture Protocol

### 3.1 Standar capture awal

| Parameter | Standar awal |
|---|---|
| Jumlah foto | 72 foto utama: 3 ring × 24 foto; tambah foto untuk area occluded |
| Langkah azimuth | Sekitar 15°; sesuaikan agar detail tetap overlap |
| Overlap | Target visual 70–85%; tidak dijamin hanya dari langkah sudut |
| Elevasi | Sekitar 0–10°, 25–35°, 50–60° terhadap pusat objek |
| Jarak | Objek mengisi sekitar 60–80% frame; seluruh bagian tetap masuk |
| Contoh jarak | Objek 15–30 cm: mulai sekitar 0,4–0,8 m; sesuaikan FOV dan fokus |
| Pergerakan | Kamera berpindah mengelilingi objek; berhenti sebelum memotret |
| Lighting | Terang, diffuse, stabil; hindari flash dan bayangan berubah |
| Background | Statis, matte, sedikit tekstur unik; objek tetap dominan |
| Exposure | Lock exposure; hindari highlight clipping dan ISO tinggi |
| Focus | Lock pada objek; jarak relatif konsisten, semua ring tetap tajam |
| White balance | Lock bila tersedia |
| Lens | Kamera utama 1×; satu lens, focal length, resolusi, orientasi konsisten |
| Mode kamera | Hindari portrait/bokeh, filter, digital zoom, perpindahan auto-macro/lens |
| File | Simpan foto asli; transfer tanpa kompresi aplikasi chat |

Overlap tinggi tetap membutuhkan parallax. Banyak foto dari posisi hampir sama tidak menggantikan perpindahan kamera.

Objek dan background tetap diam sepanjang sesi. Jangan mencampur capture objek berputar dengan background statis dalam protokol baseline ini.

### 3.2 Dataset testing

| Tingkat | Contoh | Tujuan |
|---|---|---|
| Mudah | Batu bertekstur, figur matte bercorak | Buktikan pipeline |
| Sedang | Sepatu, objek dengan cekungan/handle | Uji occlusion dan detail |
| Sulit | Mug putih polos, objek glossy/metal | Petakan batas metode |
| Sangat sulit | Kaca transparan, bagian sangat tipis | Dokumentasikan failure case |

Target awal: 2 objek mudah + 2 sedang + 2 sulit. Ulangi capture satu objek mudah untuk mengukur konsistensi protokol. Kasus sangat sulit menjadi tambahan setelah baseline bekerja.

### 3.3 Task implementasi

- [ ] Tulis checklist capture.
- [ ] Ambil dataset mudah pertama.
- [ ] Buat contact sheet untuk cek blur, coverage, clipping.
- [ ] Simpan metadata: HP, lens, resolusi, cahaya, jumlah foto, dimensi objek.
- [ ] Tandai foto ditolak beserta alasannya; hindari threshold blur universal tanpa validasi.
- [ ] Bekukan dataset benchmark dan identitas versinya.
- [ ] Ambil dataset tingkat sedang dan sulit.
- [ ] Ulangi capture satu objek mudah.

**Tool:** kamera smartphone, Python, Pillow, OpenCV.

**Input:** objek fisik dan protokol capture.

**Output:** foto asli, metadata capture, contact sheet, daftar foto valid.

**Gate:** semua ring punya overlap penghubung; fitur objek terlihat berulang di beberapa view.

**Batas coverage:** bagian bawah yang menempel meja tidak teramati. Membalik objek membutuhkan sesi terpisah dan registrasi antar-sesi; tunda sampai baseline stabil.

---

## 4. Phase 2 — Minimal Reconstruction Pipeline

### 4.1 Smoke test toolchain

- [ ] Pastikan executable COLMAP dan OpenMVS tersedia.
- [ ] Catat versi/build, OS, CPU, RAM, GPU, VRAM.
- [ ] Uji COLMAP → OpenMVS pada dataset kecil.
- [ ] Verifikasi opsi CLI terhadap versi yang dipin.

### 4.2 Preprocessing minimum

- [ ] Normalisasi orientasi EXIF pada working images.
- [ ] Simpan foto asli tanpa modifikasi.
- [ ] Gunakan working images sekitar 2.000–3.000 px sisi panjang untuk percobaan awal.
- [ ] Simpan focal metadata dan faktor resize; perbarui intrinsics bila memakai kalibrasi yang sudah diketahui.
- [ ] Hindari crop berbeda per gambar.
- [ ] Validasi gambar rusak, duplikat, resolusi, serta perubahan lens/focal length.

### 4.3 SfM

- [ ] Jalankan SIFT dengan konfigurasi awal default.
- [ ] Jalankan exhaustive matching dan geometric verification bawaan.
- [ ] Jalankan incremental `mapper`.
- [ ] Mulai camera model `SIMPLE_RADIAL`.
- [ ] Gunakan shared intrinsics hanya bila lens, fokus, resolusi, dan pemrosesan gambar konsisten.
- [ ] Export sparse point cloud.

### 4.4 Inspeksi sparse reconstruction

- [ ] Hitung registered images dan jumlah model terpisah.
- [ ] Periksa trajectory kamera dan distribusi viewpoints.
- [ ] Pastikan sparse points mencakup objek, bukan background saja.
- [ ] Pilih model utama berdasarkan coverage dan registrasi; jangan selalu menganggap `sparse/0` terbaik.
- [ ] Simpan statistik dan screenshot.

### 4.5 Undistortion dan import

- [ ] Jalankan COLMAP `image_undistorter`.
- [ ] Import workspace dengan OpenMVS `InterfaceCOLMAP`.
- [ ] Periksa nama gambar, jumlah kamera, orientasi, serta konsistensi intrinsics.

### 4.6 Dense reconstruction dan mesh

- [ ] Jalankan OpenMVS `DensifyPointCloud`.
- [ ] Inspeksi depth maps beberapa view.
- [ ] Export dense point cloud.
- [ ] Jalankan OpenMVS `ReconstructMesh`.
- [ ] Inspeksi mesh di Blender/OpenMVS Viewer.
- [ ] Simpan hasil mentah, screenshot, dan statistik.

**Input:** working images.

**Output:** COLMAP model, `sparse.ply`, undistorted workspace, `.mvs` scene, depth maps, `dense.ply`, `mesh.ply`.

### 4.7 Gate prototype

Target awal pada objek mudah:

- ≥90% foto terdaftar dalam satu model.
- Kamera membentuk lintasan masuk akal.
- Sparse dan dense points mencakup objek.
- Mesh punya vertices/faces valid; bentuk utama dikenali.
- Reprojection error dilaporkan dalam piksel pada resolusi kerja. Sekitar 1–2 px menjadi sinyal awal, bukan bukti tunggal akurasi.

SfM gagal → perbaiki capture/matching dahulu. Meshing tidak memperbaiki pose yang salah.

---

## 5. Phase 3 — Automated Pipeline

### 5.1 Antarmuka CLI yang direncanakan

Command berikut merupakan target antarmuka, bukan script yang sudah tersedia:

```bash
python reconstruct.py --input input_images --output output --config configs/baseline.yaml
```

### 5.2 Struktur output

```text
output/
├── sparse.ply
├── dense.ply
├── mesh.ply
├── model.glb
├── textured/
│   ├── model.obj
│   ├── model.mtl
│   └── textures/
├── metrics.json
├── manifest.json
├── logs/
└── work/
    ├── images/
    ├── database.db
    ├── sparse/
    ├── undistorted/
    └── mvs/
```

### 5.3 Task implementasi

- [ ] Buat stage runner: validasi → SfM → MVS → mesh → texture → export.
- [ ] Pisahkan wrapper COLMAP, OpenMVS, export, dan evaluate.
- [ ] Simpan stdout/stderr, command, exit code, durasi tiap stage.
- [ ] Catat hash input, konfigurasi, versi tool, hardware.
- [ ] Validasi artefak setelah stage: file bisa dibaca, data tidak kosong, nilai finite.
- [ ] Tambahkan checkpoint/resume.
- [ ] Invalidasi cache downstream bila gambar, masks, poses, atau konfigurasi upstream berubah.
- [ ] Laporkan kegagalan spesifik: `SFM_NO_MODEL`, `LOW_REGISTRATION`, `DENSE_EMPTY`, `TEXTURE_FAILED`.
- [ ] Tambahkan texturing dasar agar `model.glb` sudah textured.
- [ ] Gunakan ekspor GLB langsung dari OpenMVS bila versi terpilih mendukung; jika belum, gunakan Blender headless dari OBJ + MTL + textures.
- [ ] Uji GLB di viewer kedua: texture, normals, orientasi, skala.

### 5.4 Pengujian minimum

| Kasus | Hasil yang diharapkan |
|---|---|
| Dataset mudah | Semua output valid dan textured GLB dapat dibuka |
| Foto rusak | Gagal pada validasi dengan alasan jelas |
| SfM tanpa model | MVS tidak berjalan |
| Resume | Artefak stage valid digunakan ulang |
| Input/config berubah | Cache terkait tidak digunakan |

**Tool:** Python standard library, YAML parser, Pillow, OpenCV, COLMAP, OpenMVS, Blender bila diperlukan.

**Input:** folder gambar dan konfigurasi.

**Output:** artefak rekonstruksi, textured GLB, manifest, metrics, logs.

**Gate:** satu command menghasilkan textured mesh tanpa menjalankan command per tahap secara manual. Isolasi objek diperkuat pada Phase 4.

---

## 6. Phase 4 — Object Isolation

Background statis dapat membantu SfM. Masking terlalu agresif dapat menurunkan registrasi.

### 6.1 Eksperimen terkontrol

| Varian | SfM | Isolasi |
|---|---|---|
| A — baseline | Foto asli | Tanpa mask |
| B — feature mask | Features hanya foreground | Mask saat feature extraction |
| C — pose baseline | Foto asli | Mask/filter setelah pose tersedia |

### 6.2 Task implementasi

- [ ] Buat mask manual beberapa gambar sebagai referensi.
- [ ] Mulai OpenCV GrabCut untuk background sederhana.
- [ ] Evaluasi overlay mask pada seluruh view.
- [ ] Simpan mask terpisah; pertahankan RGB asli untuk texturing.
- [ ] Integrasikan feature mask COLMAP.
- [ ] Uji dukungan mask pada dense backend versi terpilih.
- [ ] Bila dense masking belum tersedia, gunakan filtering geometris/multi-view atau ROI.
- [ ] Bandingkan registration rate, coverage objek, background leakage, runtime.

### 6.3 Aturan mask dan ROI

- Mask COLMAP: hitam = abaikan; putih = gunakan.
- Contoh penamaan: `images/frame001.jpg` → `masks/frame001.jpg.png`.
- Mask mengikuti resize, orientasi, dan undistortion yang sama. Gunakan nearest-neighbor untuk label.
- Feature mask tidak otomatis berarti dense reconstruction ikut masked.
- Background hitam pada RGB tidak setara native mask; tepi buatan dapat menciptakan artefak.
- Largest connected component belum tentu objek; meja/background dapat lebih besar.
- Pertahankan koordinat scene saat filtering agar mesh dan kamera tetap selaras untuk texturing.

**Tool:** OpenCV, COLMAP masks, Open3D, dukungan mask/ROI OpenMVS sesuai versi.

**Input:** RGB, masks, baseline poses/scene sesuai varian.

**Output:** rekonstruksi object-focused dan laporan perbandingan A/B/C.

**Gate:** background leakage turun; registrasi dan coverage objek tetap layak. Manual mask boleh dipakai untuk eksperimen, tetapi intervensi manual harus dicatat dalam evaluasi automasi.

---

## 7. Phase 5 — Mesh Quality Improvement

Ubah satu faktor per eksperimen. Simpan mesh mentah sebagai pembanding.

| Eksperimen | Tool | Hal yang diuji |
|---|---|---|
| Delaunay/visibility-based meshing | OpenMVS | Baseline; pertahankan scene dan visibility |
| Poisson reconstruction | Open3D | Dense points bersih + normals konsisten |
| Outlier removal | Open3D | Noise turun tanpa membuang bagian tipis |
| Image-based refinement | OpenMVS `RefineMesh` | Detail bertambah vs runtime/artefak |
| Smoothing | Open3D/Blender | Noise turun vs penyusutan detail |
| Hole filling | Blender | Tutup lubang kecil; jangan menutup handle/cekungan valid |
| Decimation | Open3D/Blender | Polygon turun vs perubahan siluet |
| Normal correction | Open3D/Blender | Konsistensi orientasi permukaan |
| Texture tuning | OpenMVS | Seams, blur, exposure antar-view |

Poisson membutuhkan normals berorientasi konsisten. Poisson dapat menciptakan permukaan pada area tanpa observasi. Watertight bukan bukti lengkap atau akurat.

### 7.1 Urutan praktis

```text
Mesh
→ refinement
→ cleanup
→ smoothing ringan bila perlu
→ decimation
→ normal check
→ texturing
→ export
```

Perubahan topology setelah texturing dapat merusak UV; texture ulang atau bake ulang.

### 7.2 Task implementasi

- [ ] Buat preset mesh baseline tanpa cleanup agresif.
- [ ] Bandingkan Delaunay/visibility-based mesh dengan Poisson pada dense data yang sebanding.
- [ ] Uji outlier filtering dan orientasi normals.
- [ ] Uji refinement, smoothing, hole filling, dan decimation secara terpisah.
- [ ] Periksa siluet dan bagian tipis sebelum/sesudah setiap perubahan.
- [ ] Texture mesh setelah topology final.
- [ ] Simpan clay render dan textured render dengan viewpoint tetap.

**Input:** dense scene, point cloud, raw mesh, gambar dan kamera.

**Output:** mesh variants, textured mesh, tabel trade-off kualitas/runtime/polygon count.

**Gate:** perbaikan terlihat pada geometri polos dan textured render, bukan texture yang menyamarkan mesh buruk.

---

## 8. Phase 6 — Evaluation

Logging metrik dimulai sejak Phase 2. Phase ini menstandarkan benchmark dan pelaporan.

### 8.1 Tanpa ground truth

| Metrik | Pengukuran |
|---|---|
| Registration rate | Registered images / gambar valid yang masuk SfM |
| Model fragmentation | Jumlah model terpisah + ukuran model utama |
| Sparse/dense points | Total dan jumlah dalam ROI objek |
| Reprojection error | Mean/median, distribusi, resolusi kerja |
| Coverage proxy | Silhouette agreement dari view evaluasi, inspeksi sudut tetap |
| Background leakage | Geometri di luar ROI/mask objek |
| Mesh defects | Boundary edges, non-manifold edges, komponen kecil |
| Runtime | Per stage + total |
| Resource usage | Peak RAM/VRAM bila tersedia |
| Polygon count | Sebelum/sesudah refinement dan decimation |
| Visual quality | Clay render + textured render dari kamera tetap |

Point count tinggi tidak otomatis berarti kualitas tinggi. Reprojection error rendah tidak menjamin geometri benar. Completeness tanpa ground truth hanya proxy. Boundary edges juga dapat mewakili area yang memang tidak teramati.

### 8.2 Dengan ground truth

1. Samakan koordinat dan skala.
2. RGB SfM memiliki ambiguitas skala; gunakan referensi ukuran atau similarity alignment untuk evaluasi shape.
3. Sampling permukaan berbasis luas dengan jumlah sampel tetap.
4. Hitung:
   - Chamfer Distance; nyatakan squared atau unsquared.
   - Accuracy: reconstruction → ground truth.
   - Completeness: ground truth → reconstruction.
   - Precision/recall/F-score pada threshold yang dinyatakan.
5. Pisahkan evaluasi permukaan teramati dari seluruh objek.

Threshold contoh: 1/2/5 mm hanya bila skala metrik valid. Tanpa skala metrik, gunakan persentase bounding-box diagonal ground truth.

Jika memakai scale alignment, laporkan bahwa hasil mengukur shape setelah alignment, bukan ketepatan ukuran absolut.

### 8.3 Benchmark adil

- Dataset dan resolusi sama.
- Hardware dan budget komputasi dicatat.
- Downstream mesh/texture config sama saat menguji SfM.
- Laporkan failure rate, bukan hanya run terbaik.
- Pisahkan objek tuning dari objek evaluasi akhir.
- Catat seluruh intervensi manual.

### 8.4 Task implementasi

- [ ] Extract statistik sparse model menggunakan PyCOLMAP.
- [ ] Extract statistik point cloud/mesh menggunakan Open3D.
- [ ] Simpan durasi tiap stage dan konfigurasi efektif.
- [ ] Buat render evaluasi dari viewpoint tetap.
- [ ] Buat tabel CSV per dataset dan per eksperimen.
- [ ] Implementasikan surface sampling dan GT metrics bila GT tersedia.
- [ ] Dokumentasikan gagal/berhasil serta alasan kegagalan.

**Input:** artefak rekonstruksi, logs, masks/ROI, ground truth opsional.

**Output:** `metrics.json`, CSV benchmark, render evaluasi, laporan perbandingan.

**Gate:** baseline dapat dibandingkan secara konsisten lintas objek dan konfigurasi.

---

## 9. Phase 7 — Modern Method Experiment

### 9.1 Urutan eksperimen features/matching

| ID | Features | Matching | Tujuan |
|---|---|---|---|
| E0 | SIFT | Traditional matching | Baseline |
| E1 | SIFT | LightGlue varian SIFT | Isolasi efek matcher |
| E2 | SuperPoint | Nearest-neighbor + filtering | Isolasi efek features |
| E3 | SuperPoint | LightGlue varian SuperPoint | Uji kombinasi |

**Tool:** hloc, PyTorch, LightGlue, PyCOLMAP. Verifikasi kompatibilitas versi/checkpoint dan konvensi koordinat keypoints.

### 9.2 Task implementasi

- [ ] Buat adapter export/import features dan matches.
- [ ] Tetap gunakan geometric verification dan COLMAP mapper.
- [ ] Gunakan database terpisah per eksperimen.
- [ ] Samakan image-pair list dan budget features sejauh memungkinkan.
- [ ] Bandingkan registrasi, geometri akhir, failure rate, runtime, VRAM.
- [ ] Promosikan metode baru hanya setelah keuntungan terukur pada beberapa objek.

### 9.3 Eksperimen lanjutan

- Learning-based MVS: tahan poses tetap; ganti depth estimator. Verifikasi format depth, intrinsics, fusion, dan skala.
- NeuS/Neuralangelo: track eksperimen terpisah setelah baseline stabil.
- Bandingkan mesh hasil ekstraksi, bukan novel-view rendering saja.
- Catat preprocessing, training time, VRAM, threshold mesh extraction, dan kebutuhan mask tiap metode.
- Neural reconstruction tetap membutuhkan coverage dan poses yang baik.

**Input:** frozen benchmark, baseline poses/scene sesuai eksperimen.

**Output:** ablation report dan kandidat pipeline baru.

**Gate:** peningkatan kualitas/failure rate terukur, dengan biaya komputasi yang diterima.

---

## 10. Risiko Teknis dan Failure Cases

| Failure case | Gejala | Respons awal |
|---|---|---|
| Foto terlalu sedikit/overlap buruk | Model terpecah, foto tidak terdaftar | Tambah intermediate views dan penghubung antar-ring |
| Parallax terlalu kecil | Depth tidak stabil | Perbesar perpindahan kamera |
| Objek polos | Sparse/dense minim | Mulai objek bertekstur; evaluasi batas dataset |
| Glossy/transparan | Depth salah, lubang, noise | Diffuse lighting; klasifikasikan sebagai kasus sulit |
| Blur/exposure berubah | Matches turun, texture seams | Capture ulang, stabilkan kamera dan settings |
| Lens/fokus berubah | Intrinsics tidak cocok | Lock lens/fokus; pisahkan kelompok intrinsics bila perlu |
| Background dominan | SfM berhasil tetapi objek hilang | Inspeksi ROI objek; mask/filter bertahap |
| Mask tidak konsisten | Registrasi turun, tepi hilang | Review overlay, toleransi batas mask |
| Occlusion/bagian bawah | Mesh berlubang | Tambah view yang benar-benar melihat permukaan |
| Pola berulang/simetri | Kamera salah posisi | Tambah sudut penghubung dan konteks unik |
| Objek/background bergerak | Matches inkonsisten, ghosting | Capture ulang dengan scene rigid dan statis |
| RAM/VRAM habis | Stage crash | Turunkan resolusi/jumlah source views; ukur ulang |
| Adapter salah | Kamera terbalik, texture bergeser | Uji undistortion, koordinat, intrinsics, filename mapping |
| Cleanup agresif | Handle/detail hilang | Simpan raw mesh, ukur perubahan siluet |
| Skala tidak diketahui | Ukuran model salah | Referensi panjang terukur; catat unit ekspor |
| Cache lama dipakai | Artefak antar-stage tidak selaras | Hash input/config dan invalidasi downstream |

---

## 11. Milestone Prototype → MVP

Estimasi hari kerja engineering untuk satu developer, bukan runtime mesin. Sesuaikan setelah smoke test hardware.

| Milestone | Estimasi | Deliverable | Kriteria selesai |
|---|---|---|---|
| M0 — Dataset siap | 2–3 hari | Protokol + dataset mudah | Foto tajam, overlap dan coverage memadai |
| M1 — SfM berhasil | 1–3 hari | Cameras + sparse model | Satu model dominan, objek terwakili |
| M2 — Prototype mesh | 2–4 hari | Dense cloud + mesh | Bentuk objek mudah terbaca |
| M3 — Automated alpha | 3–5 hari | CLI + textured GLB + logs | End-to-end dan resume berhasil |
| M4 — Object-focused beta | 3–5 hari | Mask/ROI + cleanup | Background berkurang, objek tetap utuh |
| M5 — MVP tervalidasi | 2–4 hari | Benchmark + panduan penggunaan | Berhasil pada kedua objek mudah dan ≥1 objek sedang |
| M6 — Riset modern | Setelah MVP | Ablation reports | Peningkatan objektif dibanding baseline |

### 11.1 Definisi MVP

```text
Folder foto RGB
→ satu command
→ sparse.ply + dense.ply + mesh.ply + textured model.glb
→ metrics + logs + diagnosis kegagalan
```

Kriteria:

- [ ] Input hanya multi-view RGB smartphone; tanpa LiDAR/depth sensor.
- [ ] Pipeline dapat dijalankan ulang dengan konfigurasi tercatat.
- [ ] Artefak geometri dan textured GLB dapat dibuka di viewer eksternal.
- [ ] Isolasi objek bekerja pada kelas objek target yang disepakati.
- [ ] Failure case terdeteksi dan dilaporkan.
- [ ] Benchmark mencakup objek mudah, sedang, dan sulit.
- [ ] Semua intervensi manual dicatat; keberhasilan manual tidak dilabeli full automation.

Target objek awal: rigid, matte, cukup bertekstur. Permukaan yang tidak pernah terlihat tidak dijanjikan terekonstruksi akurat.

---

## 12. Keputusan Sebelum Implementasi

1. PC/server: OS, CPU, RAM, GPU, VRAM?
2. Objek utama: ukuran, material, bentuk?
3. Output untuk visualisasi atau membutuhkan ukuran metrik?
4. Berapa toleransi kualitas/geometri dan waktu proses yang diterima?

Jika belum ditentukan, mulai dengan dataset objek matte bertekstur, working images 2.000–3.000 px, serta target visualisasi tanpa klaim akurasi metrik.

**Langkah pertama:** capture 72 foto satu objek matte bertekstur, lalu buktikan SfM → dense → mesh secara manual. Hasil ini menentukan konfigurasi yang layak diautomasi.

---

## 13. Referensi

- [COLMAP Tutorial](https://colmap.github.io/tutorial.html) — capture, SfM, matching, undistortion, MVS.
- [COLMAP FAQ](https://colmap.github.io/faq.html) — masks, intrinsics, CUDA, failure cases.
- [OpenMVS Usage](https://github.com/cdcseacave/openMVS/wiki/Usage) — COLMAP import, densification, meshing, refinement, texturing, export.
- [Open3D Documentation](https://www.open3d.org/docs/release/) — point-cloud/mesh processing dan distance queries.
- [hloc](https://github.com/cvg/Hierarchical-Localization) — integrasi learned features/matching dengan reconstruction.
- [LightGlue](https://github.com/cvg/LightGlue) — learned feature matching.

Dokumentasi upstream dapat mengikuti versi development. Verifikasi command, format, dan dukungan fitur terhadap release yang dipin.
