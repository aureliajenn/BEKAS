# BEKAS

BEKAS membantu pemula mengubah botol dan wadah plastik bekas menjadi barang berguna melalui foto, pratinjau 3D, ide kerajinan, dan panduan bergambar.

Dokumen acuan: [PRD](PRD.md) dan [rencana implementasi](IMPLEMENTATION_PLAN.md).

## Struktur

```text
apps/mobile/          Android app: Expo, React Native, TypeScript, Expo Router
services/api/         FastAPI API dan runner backend
database/migrations/  Schema Postgres tanpa tabel autentikasi pengguna
fixtures/             Data contoh berlabel, bukan hasil foto baru
docs/                 Kontrak API dan panduan operasional
```

## Mulai mobile

Memerlukan Node.js dan npm. Dependensi Expo disesuaikan dengan SDK project dan dicatat di `apps/mobile/package-lock.json`.

```powershell
cd apps/mobile
npm install
npm start
```

Tekan `a` untuk Android emulator, atau pindai QR lewat Expo Go. Untuk HP fisik yang mengakses API lokal, isi `EXPO_PUBLIC_API_BASE_URL` di `apps/mobile/.env` dengan alamat IP LAN komputer—bukan `localhost`.

## Mulai API

Memerlukan Python 3.12 atau 3.13.

```powershell
cd services/api
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Health check: `http://127.0.0.1:8000/health`.

```powershell
python -m pytest
```

Salin `services/api/.env.example` ke `.env` sebelum menghubungkan provider. Jangan commit nilai secret. API mencakup health check, proyek/upload, antrean persisten, dan consumer mesh hosted SF3D. Integrasi consumer teks/ilustrasi masih perlu diselesaikan.

## Arsitektur MVP

- Mobile memanggil FastAPI; mobile tidak mengakses tabel Supabase langsung.
- FastAPI memakai Postgres untuk proyek dan antrean persisten, serta bucket Supabase Storage private `bekas-assets` untuk aset.
- Tidak ada login atau autentikasi pengguna pada MVP.
- Backend memanggil API Space resmi `stabilityai/stable-fast-3d`, menyimpan GLB di Storage, dan menerbitkan signed URL lewat endpoint proyek. Tidak perlu worker GPU terpisah atau CUDA.
- Endpoint proyek/upload, polling status, guide, dan retry tetap kompatibel dengan frontend.
- Source runner teks tersedia tetapi integrasinya belum lengkap; job ide/panduan/ilustrasi tetap queued sampai consumer selesai diintegrasikan.

Lihat [setup API dan hosted SF3D](services/api/README.md), [rencana migrasi](docs/SF3D_MIGRATION_PLAN.md), dan [handoff](docs/AGENT_HANDOFF.md). Tidak ada `WORKER_TOKEN`; `HF_TOKEN` opsional disimpan di backend. Terapkan migration 0001–0003 sebelum menjalankan consumer mesh. Gunakan satu proses Uvicorn.
