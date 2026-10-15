# BEKAS Mobile

Android-first React Native app built with Expo, TypeScript, and Expo Router. Tampilan mengikuti [DESIGN.md](../../DESIGN.md); alur dan kontrak mengikuti [PRD.md](../../PRD.md).

## Commands

```powershell
npm install
npm start          # tekan a untuk Android, w untuk browser
npm run typecheck
npm run check      # cek pemetaan respons backend (src/lib/wire.check.ts)
```

## Env

Salin `.env.example` ke `.env`.

| Variabel | Isi |
|---|---|
| `EXPO_PUBLIC_USE_FIXTURES` | `true` = mode contoh tanpa backend; semua data berlabel "Contoh tersimpan" |
| `EXPO_PUBLIC_API_BASE_URL` | Alamat FastAPI. Untuk HP fisik pakai IP LAN komputer, bukan `localhost` |
| `EXPO_PUBLIC_MODEL_VIEWER_SCRIPT_URL` | Opsional. Salinan `model-viewer` yang di-host backend; kosong = CDN versi terkunci |

Jangan pernah menaruh credential server di `EXPO_PUBLIC_*`.

## Layar

| Route | Isi |
|---|---|
| `/` | Beranda: foto/galeri, lanjutkan proyek, kartu dompet, leaderboard, bank sampah |
| `/preview` | Pratinjau foto dan upload |
| `/project/[id]` | Model 3D, profil barang, 3 ide |
| `/project/[id]/idea/[ideaId]` | Detail ide, buat panduan |
| `/project/[id]/guide` | Panduan, centang langkah, verifikasi foto sesudah untuk poin |
| `/wallet` | Dompet Poin: saldo, target, tukar hadiah, riwayat |
| `/leaderboard` | Leaderboard RW dan tantangan bulanan |
| `/rw` | Pilih RW |
| `/bank-sampah` | Bank sampah mitra |
| `/dev/components` | Hanya dev: katalog komponen dan pemicu setiap skenario state |

## Struktur

- `src/theme`: token warna/font/radius, aset, teks status. Jangan hardcode warna.
- `src/components`: komponen design system.
- `src/lib/api.ts`: proyek (upload signed URL, polling, retry) + simulasi fixture per skenario.
- `src/lib/rewards.ts`: peserta anonim, verifikasi, dompet, hadiah, leaderboard, bank sampah.
- `src/lib/wire.ts`: adaptor respons FastAPI ke bentuk yang dipakai layar.

Tanpa login: project ID dan ID peserta acak disimpan lokal di AsyncStorage; keduanya bukan bukti identitas.
