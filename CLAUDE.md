# BEKAS

App Android (React Native + Expo + TypeScript + Expo Router) yang membantu pemula mengubah botol dan wadah plastik bekas menjadi barang berguna: foto barang, mesh 3D yang bisa diputar, 3 ide, lalu panduan bergambar. Proyek hackathon, tanpa login. Kode mobile ada di apps/mobile.

## Dokumen acuan
- PRD.md: alur, scope, state, kontrak API dan JSON. Kalau ada konflik, PRD yang menang.
- DESIGN.md: tampilan, token, komponen, layar, aturan maskot.
- IMPLEMENTATION_PLAN.md: urutan pengerjaan backend dan worker.

## Aturan UI
- Setiap mengerjakan layar atau komponen, pakai skill bekas-ui-craft (.claude/skills/bekas-ui-craft): lihat design/references/, screenshot hasil via adb, cek checklist, perbaiki sebelum bilang selesai.
- Hijau dipakai hemat (DESIGN.md bagian 2b). Warna lain datang dari oranye, tile pastel, dan shape di apps/mobile/src/components/shapes.tsx.
- Semua warna, font, radius, dan spasi diambil dari src/theme/tokens.ts. Jangan hardcode warna baru.
- Pakai komponen di src/components sebelum membuat yang baru.
- Gambar hanya dari assets/ lewat src/theme/assets.ts. Ikon aksi pakai lucide-react-native strokeWidth 2.5. Tanpa emoji.
- Maskot maksimal satu per layar, pose sesuai DESIGN.md bagian 5.
- Status backend ditampilkan sebagai nama tahap (src/theme/statusCopy.ts), tidak pernah persentase palsu.
- Jangan klaim ukuran, jenis plastik pasti, atau dampak lingkungan. Hasil fixture wajib berlabel "Contoh tersimpan".

## Aturan kode
- Tanpa autentikasi. Project ID disimpan lokal, bukan bukti identitas.
- Mobile tidak pernah akses Supabase langsung; semua lewat FastAPI.
- Tidak ada secret di Expo public env.
