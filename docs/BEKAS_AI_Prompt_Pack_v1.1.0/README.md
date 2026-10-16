# BEKAS AI Prompt Pack — Curated Demo Lite

**Revisi prompt:** `bekas-curated-v1` · **Kontrak JSON:** `schema_version: "1.0"`.

Folder tetap memakai nama `BEKAS_AI_Prompt_Pack_v1.1.0` agar referensi tidak putus. Isinya telah menggantikan rancangan multi-material/geometri lama dengan versi ringan untuk prototipe.

## Pembagian tanggung jawab

- **Tim:** model GLB, render referensi, metadata objek, dan urutan tahap jika kerajinan sudah ditentukan.
- **Backend:** pemilihan objek/ide, ID langkah, pemetaan langkah ke aset, validasi, antrean, penyimpanan dan status.
- **AI:** rekomendasi ide bila diperlukan, penjelasan instruksi, daftar bahan/alat, peringatan, dan ilustrasi berdasarkan referensi.

GLB digunakan viewer. Kirim **gambar render dan metadata**, bukan GLB mentah, sebagai input visual AI. Model buatan tim berlabel **“Contoh tersimpan”**; instruksi/ilustrasi yang benar-benar dihasilkan live diberi keterangan **“Dibuat AI berdasarkan objek contoh”**.

## Dua alur penggunaan

### A. Objek utuh, ide bebas

Jika manifest memiliki `craft: null` dan `stages: []`:

1. Backend menyediakan metadata objek dan render.
2. Prompt 01 menghasilkan tiga ide dalam bentuk `IdeasResult`.
3. Pengguna memilih satu ide; backend memvalidasi kepemilikan ide.
4. Prompt 02 menghasilkan panduan 4–6 langkah dalam bentuk `GuideResult`.
5. Prompt 03 menghasilkan ilustrasi per langkah, terpisah dari teks.

Tidak ada klaim bahwa model perubahan bentuk tersedia untuk ide tersebut.

### B. Kerajinan dan model tahap sudah dibuat tim

Jika manifest memiliki `craft` dan 4–6 `stages`:

1. Backend mengambil kerajinan tersebut sebagai pilihan tetap. **Lewati generasi tiga ide bebas.**
2. Siapkan data ide dengan nama, alat, bahan tambahan, peringatan dan estimasi waktu yang sudah diperiksa.
3. Prompt 02 memperjelas tindakan tahap yang diberikan; tidak mengganti kerajinan, menambah tahap atau mengubah urutannya.
4. Backend mencocokkan `steps[].id/order` dengan manifest, lalu mengambil `model_after` dan `reference_image` dari manifest.
5. Prompt 03 memakai render tahap terkait sebagai referensi ilustrasi.

Mode B memerlukan integrasi pemilihan kerajinan pada aplikasi; kontrak field di sini kompatibel, tetapi alur tersebut **belum otomatis terpasang** pada endpoint `/guide` yang saat ini menunggu hasil ide.

## Struktur output ringan

- Ide: `schema_version`, `input_status`, `explanation`, `object_profile`, `ideas`.
- Setiap ide: `id`, `title`, `purpose`, `difficulty`, `estimated_minutes`, `extra_materials`, `tools`, `safety_notes`.
- Panduan: `schema_version`, `idea_id`, `title`, `estimated_minutes`, `materials`, `tools`, `safety_notes`, `steps`.
- Langkah: `id`, `order`, `title`, `instruction`, `expected_result`, `illustration_prompt`.

Nama field mengikuti `services/api/app/schemas/ai.py`. Tidak ada koordinat AI, graph bagian/material, `beforeStateId`, renderer CAD, atau framework inventaris baru. Daftar bahan/alat dapat langsung ditampilkan sebelum tutorial tanpa menambah respons AI terpisah.

## File

| File | Fungsi |
|---|---|
| `prompts/01_scan_ideation.md` | Tiga ide dari objek terkurasi, hanya mode A |
| `prompts/02_craft_plan.md` | Panduan ringan, mendukung mode A/B |
| `prompts/03_illustration_template.md` | Ilustrasi setelah langkah, berdasarkan render |
| `schemas/scan.schema.json` | Strict JSON Schema setara bentuk `IdeasResult` |
| `schemas/plan.schema.json` | Strict JSON Schema setara bentuk `GuideResult` |
| `examples/example_scan.json` | Contoh tiga ide |
| `examples/example_plan.json` | Contoh panduan enam langkah |
| `examples/example_context.json` | Contoh metadata dan tahap, bukan aset siap pakai |
| `examples/responses_api.py` | Contoh panggilan backend Python, bukan server baru |
| `examples/validate_examples.py` | Validasi contoh, kontrak backend dan pemetaan tahap |

## Aturan sederhana

- Bahan tambahan diperbolehkan, tetapi semuanya harus disebutkan sebelum pengguna mulai. Lem/pita/kertas termasuk bahan; gunting/penggaris termasuk alat.
- Pakai bahan tambahan dari ide terpilih dan sumber objek; jangan menambahkan dekorasi atau alat baru diam-diam. Jika konstruksi perlu diubah, perbaiki pilihan/metadata dahulu.
- Pisahkan persiapan bahan dan pemasangan ketika merupakan tindakan berbeda. Batasi desain agar cukup dijelaskan dalam 4–6 langkah; jangan memampatkan proyek rumit hanya demi jumlah langkah.
- Tidak mengarang ukuran, jenis resin, tingkat kebersihan, atau ketepatan potongan dari render. Dimensi model bukan hasil pengukuran foto pengguna.
- Diagram potong opsional disediakan tim sebagai SVG/PNG yang cocok dengan model. AI tidak menghasilkan koordinat atau file model.
- Prompt dan Strict JSON menjaga format; peninjauan tim tetap diperlukan untuk kesesuaian instruksi dan ilustrasi.

## Verifikasi lokal

Gunakan environment backend yang sudah terpasang; `jsonschema` diperlukan hanya untuk pemeriksaan schema pada contoh:

```powershell
python -m pip install -e "services/api[dev]" jsonschema
python docs/BEKAS_AI_Prompt_Pack_v1.1.0/examples/validate_examples.py
```

Contoh panggilan API memakai `AsyncOpenAI.responses.parse`, timeout terbatas, dan `max_retries=0`; caller/antrean menentukan retry. Kunci API hanya di backend. Tidak perlu backend Node, AJV atau perubahan frontend untuk membaca field respons ini.

**Status integrasi:** paket ini adalah referensi prompt dan contoh, belum mengganti modul runtime `services/api/app/prompts/`. Pemasangan aset terkurasi dan consumer OpenAI masih pekerjaan berikutnya. Contoh JSON bukan bukti panggilan OpenAI live.
