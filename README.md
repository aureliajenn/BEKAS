# BEKAS

BEKAS membantu pemula mengubah botol dan wadah plastik bekas menjadi barang berguna melalui foto, pratinjau 3D, ide kerajinan, dan panduan bergambar.

Dokumen acuan: [PRD](PRD.md) dan [rencana implementasi](IMPLEMENTATION_PLAN.md).

## Struktur

```text
apps/mobile/          Android app: Expo, React Native, TypeScript, Expo Router
services/api/         FastAPI API dan runner backend
database/migrations/  Schema Postgres tanpa tabel autentikasi pengguna
gpu/                  Worker Vast.ai, adapter SF3D/TripoSR, notebook eksperimen
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

Salin `services/api/.env.example` ke `.env` sebelum menghubungkan provider. Jangan commit nilai secret. Fondasi API mencakup health check, siklus proyek/upload, antrean job, dan endpoint worker GPU. Runner AI untuk ide, panduan, dan ilustrasi masih perlu dibuat.

## Arsitektur MVP

- Mobile memanggil FastAPI; mobile tidak mengakses tabel Supabase langsung.
- FastAPI memakai Postgres untuk proyek dan antrean persisten, serta bucket Supabase Storage private `bekas-assets` untuk aset.
- Tidak ada login atau autentikasi pengguna pada MVP.
- Per PRD, GPU memakai worker Python otomatis pada instance Vast.ai. Worker pull job melalui API dan transfer aset melalui signed URL Storage; tidak ada port inference publik.
- Endpoint proyek mengelola upload, antrean mesh/ide, polling status, guide, dan retry. Worker GPU menangani job mesh.
- Runner AI CPU untuk ide, panduan, dan ilustrasi belum dibuat; job tersebut tetap queued sampai consumer diimplementasikan.

Lihat [setup Vast.ai worker](gpu/worker/README.md) untuk image, dependency model, secrets, run command, dan lifecycle instance. Akun penyedia, Supabase, dan instance GPU masih perlu dikonfigurasi dan diuji nyata.
